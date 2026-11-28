"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import { localDb } from "@/lib/local-db";
import { enqueueSyncItem } from "@/lib/sync-service";
import { compressReceiptImage } from "@/lib/image-compression";
import CategoryPillSelector from "./CategoryPillSelector";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  Trash2,
  X,
} from "lucide-react";

interface QuickAddLogModalProps {
  onLogged?: () => void;
  fixedExpenseId?: string;
  expenseTitle?: string;
  orgId?: string;
}

export default function QuickAddLogModal({
  onLogged,
  fixedExpenseId,
  orgId,
}: QuickAddLogModalProps) {
  const {
    activeOrg,
    activeExpenseId,
    selectedDate,
    logType,
    setLogType,
    isAddLogOpen,
    setAddLogOpen,
  } = useAppStore();

  const currentOrgId = orgId || activeOrg?.id;

  const [amount, setAmount] = useState("");
  const [expenseId, setExpenseId] = useState(
    fixedExpenseId || activeExpenseId || ""
  );
  const [category, setCategory] = useState("General");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [logDate, setLogDate] = useState(
    selectedDate || new Date().toISOString().slice(0, 10)
  );

  const [availableExpenses, setAvailableExpenses] = useState<
    Array<{ id: string; title: string }>
  >([]);

  // Attached receipt image preview
  const [attachedBlob, setAttachedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync activeExpenseId from store or fixedExpenseId if changed
  useEffect(() => {
    if (fixedExpenseId) {
      setExpenseId(fixedExpenseId);
    } else if (activeExpenseId) {
      setExpenseId(activeExpenseId);
    }
  }, [fixedExpenseId, activeExpenseId]);

  // Load custom categories from Dexie cache and server
  const loadCategories = useCallback(() => {
    if (!currentOrgId) return;
    localDb.categories
      .where("orgId")
      .equals(currentOrgId)
      .toArray()
      .then((cats) => {
        if (cats.length > 0) {
          setCustomCategories(cats.map((c) => c.name));
        }
        fetch(`/api/v1/orgs/${currentOrgId}/categories`)
          .then((r) => (r.ok ? r.json() : null))
          .then(async (res) => {
            if (res?.data) {
              const names = res.data.map((c: { id: string; name: string }) => c.name);
              setCustomCategories(names);
              for (const item of res.data) {
                await localDb.categories.put({
                  id: item.id,
                  orgId: currentOrgId,
                  name: item.name,
                  icon: item.icon || "Tag",
                  createdAt: item.createdAt || new Date().toISOString(),
                  updatedAt: item.updatedAt || new Date().toISOString(),
                });
              }
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, [currentOrgId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Load available expenses for dropdown
  useEffect(() => {
    if (!currentOrgId) return;
    async function load() {
      const local = await localDb.expenses
        .where("orgId")
        .equals(currentOrgId!)
        .and((e) => !e.isArchived)
        .toArray();

      if (local.length > 0) {
        setAvailableExpenses(local);
        if (!fixedExpenseId && !expenseId && local.length > 0) {
          setExpenseId(local[0].id);
        }
      } else {
        try {
          const res = await fetch(`/api/v1/orgs/${currentOrgId}/expenses`, {
            cache: "no-store",
          });
          if (res.ok) {
            const { data } = await res.json();
            setAvailableExpenses(data);
            if (!fixedExpenseId && !expenseId && data.length > 0) {
              setExpenseId(data[0].id);
            }
          }
        } catch {}
      }
    }
    load();
  }, [currentOrgId, fixedExpenseId, expenseId]);

  if (!isAddLogOpen || !currentOrgId) return null;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const { blob } = await compressReceiptImage(file);
      setAttachedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error("Compression error:", err);
      setError("Failed to compress receipt photo");
    } finally {
      setIsCompressing(false);
    }
  }

  function removeAttachment() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAttachedBlob(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    const targetExpenseId = fixedExpenseId || expenseId;
    if (!targetExpenseId) {
      setError("Please select an expense ledger");
      return;
    }
    if (!currentOrgId) {
      setError("Organization context missing");
      return;
    }
    if (activeOrg?.role !== "admin") {
      setError("Forbidden: Only workspace editors can record transactions");
      return;
    }

    setLoading(true);
    setError("");

    // Calculate signed or positive amount in paisa
    // If cash in, positive; if cash out, stored as positive ledger entry
    const amountPaisa = Math.round(parsedAmount * 100);
    const logId = crypto.randomUUID();
    const [year, month] = logDate.split("-").map(Number);
    const now = new Date().toISOString();

    const pendingBlobs = attachedBlob
      ? [
          {
            tempId: crypto.randomUUID(),
            blob: attachedBlob,
            mimeType: "image/webp",
            fileName: `receipt_${logId}.webp`,
          },
        ]
      : [];

    const attachments: Array<{
      key: string;
      url: string;
      mimeType: string;
      sizeBytes: number;
    }> = [];

    // If online and receipt photo attached, upload it directly to R2 (with server fallback)
    if (navigator.onLine && attachedBlob) {
      try {
        const presignRes = await fetch(
          `/api/v1/orgs/${currentOrgId}/uploads/presign`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: `receipt_${logId}.webp`,
              mimeType: "image/webp",
              sizeBytes: attachedBlob.size,
              fiscalYear: year,
              fiscalMonth: month,
            }),
          }
        );

        let uploaded = false;

        if (presignRes.ok) {
          const { data: presignData } = await presignRes.json();

          try {
            const r2Res = await fetch(presignData.uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": "image/webp" },
              body: attachedBlob,
            });

            if (r2Res.ok) {
              uploaded = true;
              attachments.push({
                key: presignData.key,
                url: presignData.publicUrl,
                mimeType: "image/webp",
                sizeBytes: attachedBlob.size,
              });
            }
          } catch (r2Err) {
            console.warn("Direct R2 upload fallback to server:", r2Err);
          }
        }

        if (!uploaded) {
          const formData = new FormData();
          formData.append("file", attachedBlob, `receipt_${logId}.webp`);
          formData.append("fiscalYear", String(year));
          formData.append("fiscalMonth", String(month));

          const fallbackRes = await fetch(
            `/api/v1/orgs/${currentOrgId}/uploads`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (fallbackRes.ok) {
            const { data: fallbackData } = await fallbackRes.json();
            attachments.push({
              key: fallbackData.key,
              url: fallbackData.publicUrl,
              mimeType: "image/webp",
              sizeBytes: attachedBlob.size,
            });
          }
        }
      } catch (uploadErr) {
        console.error("Failed to upload receipt image:", uploadErr);
      }
    }

    const payload = {
      id: logId,
      expenseId: targetExpenseId,
      type: logType,
      category: category || "General",
      amountPaisa,
      note: note.trim(),
      logDate,
      attachments,
    };

    // 1. Optimistic write to local Dexie database
    await localDb.dailyLogs.put({
      id: logId,
      orgId: currentOrgId,
      expenseId: targetExpenseId,
      type: logType,
      category: category || "General",
      amountPaisa: payload.amountPaisa,
      note: payload.note,
      logDate,
      fiscalYear: year,
      fiscalMonth: month,
      attachments,
      loggedBy: "current_user",
      createdAt: now,
      updatedAt: now,
      syncStatus: navigator.onLine ? "synced" : "pending",
      pendingBlobs: navigator.onLine ? [] : pendingBlobs,
    });

    try {
      const targetExp = await localDb.expenses.get(targetExpenseId);
      if (targetExp) {
        const signedDelta =
          logType === "in" ? payload.amountPaisa : -payload.amountPaisa;
        await localDb.expenses.update(targetExpenseId, {
          totalSpent: targetExp.totalSpent + signedDelta,
          logCount: targetExp.logCount + 1,
          updatedAt: now,
        });
      }
    } catch {}

    // 2. Network synchronization
    if (navigator.onLine) {
      try {
        const res = await fetch(
          `/api/v1/orgs/${currentOrgId}/expenses/${targetExpenseId}/logs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": logId,
            },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          await enqueueSyncItem({
            entityType: "daily_log",
            entityId: logId,
            operation: "CREATE",
            orgId: currentOrgId,
            payload,
          });
        }
      } catch {
        await enqueueSyncItem({
          entityType: "daily_log",
          entityId: logId,
          operation: "CREATE",
          orgId: currentOrgId,
          payload,
        });
      }
    } else {
      await enqueueSyncItem({
        entityType: "daily_log",
        entityId: logId,
        operation: "CREATE",
        orgId: currentOrgId,
        payload,
      });
    }

    setLoading(false);
    setAddLogOpen(false);
    setAmount("");
    setNote("");
    removeAttachment();
    onLogged?.();
  }

  const currencySymbol = activeOrg?.currency === "BDT" ? "৳" : "$";
  const isIn = logType === "in";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-surface border border-border-default w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 my-6">
        <button
          onClick={() => setAddLogOpen(false)}
          className="absolute right-4 top-4 text-txt-muted hover:text-txt-secondary p-1 rounded-full transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Cash In vs Cash Out Selector Pills */}
        <div className="flex bg-subtle p-1 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => setLogType("in")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isIn
                ? "bg-cash-in text-white shadow-sm"
                : "text-txt-secondary hover:text-txt-main"
            }`}
          >
            <ArrowDownLeft size={14} />
            <span>Cash In</span>
          </button>
          <button
            type="button"
            onClick={() => setLogType("out")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !isIn
                ? "bg-cash-out text-white shadow-sm"
                : "text-txt-secondary hover:text-txt-main"
            }`}
          >
            <ArrowUpRight size={14} />
            <span>Cash Out</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-cash-out-light border border-cash-out-border text-cash-out text-xs px-3 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Amount input */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary">
              Amount
            </label>
            <div className="relative">
              <span
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-2xl font-bold ${
                  isIn ? "text-cash-in" : "text-cash-out"
                }`}
              >
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-subtle border border-border-default rounded-2xl px-4 pl-9 py-3 text-3xl font-extrabold text-txt-main focus:outline-none focus:bg-surface focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Book / Ledger selector - hidden when already inside a book or if only 1 book */}
          {!fixedExpenseId && availableExpenses.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary">
                Book / Ledger
              </label>
              <select
                required
                value={expenseId}
                onChange={(e) => setExpenseId(e.target.value)}
                className="bg-subtle border border-border-default rounded-xl px-3.5 py-2.5 text-xs font-medium text-txt-main focus:outline-none focus:bg-surface focus:border-primary transition-colors cursor-pointer"
              >
                {availableExpenses.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Category Selection (Pills + On-The-Fly Custom "+ New" + Manage ✏️) */}
          <CategoryPillSelector
            selectedCategory={category}
            onSelectCategory={setCategory}
            availableCustomCategories={customCategories}
            onAddCustomCategory={(newCat) => {
              setCustomCategories((prev) =>
                prev.includes(newCat) ? prev : [...prev, newCat]
              );
            }}
            orgId={currentOrgId}
            onCategoriesChanged={loadCategories}
          />

          {/* Remarks (Optional) */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary">
              Remarks <span className="normal-case font-normal text-txt-muted">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Supermarket, Dinner (Optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-subtle border border-border-default rounded-xl px-3.5 py-2.5 text-xs text-txt-main placeholder:text-txt-muted focus:outline-none focus:bg-surface focus:border-primary transition-colors"
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary">
              Date
            </label>
            <input
              type="date"
              required
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="bg-subtle border border-border-default rounded-xl px-3.5 py-2 text-xs text-txt-main focus:outline-none focus:bg-surface focus:border-primary transition-colors cursor-pointer"
            />
          </div>

          {/* Receipt Photo Attachment */}
          <div className="flex flex-col gap-1">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-border-default bg-subtle h-24 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Receipt"
                  className="h-full object-contain"
                />
                <button
                  type="button"
                  onClick={removeAttachment}
                  className="absolute right-2 top-2 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors cursor-pointer"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border-strong hover:border-txt-muted text-xs font-semibold text-txt-secondary hover:text-txt-main bg-subtle transition-colors cursor-pointer active:scale-98"
              >
                <Camera size={15} />
                <span>{isCompressing ? "Compressing..." : "Attach Receipt Photo"}</span>
              </button>
            )}
          </div>

          {/* Submit Button (Reference Matched Green / Red) */}
          <button
            type="submit"
            disabled={loading || isCompressing}
            className={`w-full py-3.5 rounded-2xl font-bold text-xs text-white shadow-md active:scale-95 transition-all cursor-pointer mt-1 ${
              isIn
                ? "bg-cash-in hover:bg-cash-in-hover shadow-cash-in/25"
                : "bg-cash-out hover:bg-cash-out-hover shadow-cash-out/25"
            }`}
          >
            {loading
              ? "Saving..."
              : isIn
              ? "Confirm Cash In"
              : "Confirm Cash Out"}
          </button>
        </form>
      </div>
    </div>
  );
}
