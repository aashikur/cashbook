"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { localDb } from "@/lib/local-db";
import { enqueueSyncItem } from "@/lib/sync-service";
import { compressReceiptImage } from "@/lib/image-compression";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  Trash2,
  X,
} from "lucide-react";

interface QuickAddLogModalProps {
  onLogged?: () => void;
}

export default function QuickAddLogModal({ onLogged }: QuickAddLogModalProps) {
  const {
    activeOrg,
    activeExpenseId,
    selectedDate,
    logType,
    setLogType,
    isAddLogOpen,
    setAddLogOpen,
  } = useAppStore();

  const [amount, setAmount] = useState("");
  const [expenseId, setExpenseId] = useState(activeExpenseId || "");
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

  // Sync activeExpenseId from store if changed
  useEffect(() => {
    if (activeExpenseId) setExpenseId(activeExpenseId);
  }, [activeExpenseId]);

  // Load available expenses for dropdown
  useEffect(() => {
    if (!activeOrg) return;
    async function load() {
      const local = await localDb.expenses
        .where("orgId")
        .equals(activeOrg!.id)
        .and((e) => !e.isArchived)
        .toArray();

      if (local.length > 0) {
        setAvailableExpenses(local);
        if (!expenseId && local.length > 0) setExpenseId(local[0].id);
      } else {
        try {
          const res = await fetch(`/api/v1/orgs/${activeOrg!.id}/expenses`);
          if (res.ok) {
            const { data } = await res.json();
            setAvailableExpenses(data);
            if (!expenseId && data.length > 0) setExpenseId(data[0].id);
          }
        } catch {}
      }
    }
    load();
  }, [activeOrg, expenseId]);

  if (!isAddLogOpen || !activeOrg) return null;

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
    if (!expenseId) {
      setError("Please select an expense ledger");
      return;
    }
    if (!note.trim()) {
      setError("Please enter a description/note");
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

    const payload = {
      id: logId,
      expenseId,
      amountPaisa: logType === "in" ? amountPaisa : amountPaisa,
      note: note.trim(),
      logDate,
      attachments: [],
    };

    // 1. Optimistic write to local Dexie database
    await localDb.dailyLogs.put({
      id: logId,
      orgId: activeOrg!.id,
      expenseId,
      amountPaisa: payload.amountPaisa,
      note: payload.note,
      logDate,
      fiscalYear: year,
      fiscalMonth: month,
      attachments: [],
      loggedBy: "current_user",
      createdAt: now,
      updatedAt: now,
      syncStatus: navigator.onLine && !attachedBlob ? "synced" : "pending",
      pendingBlobs,
    });

    // 2. Network synchronization
    if (navigator.onLine && !attachedBlob) {
      try {
        const res = await fetch(
          `/api/v1/orgs/${activeOrg!.id}/expenses/${expenseId}/logs`,
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
            orgId: activeOrg!.id,
            payload,
          });
        }
      } catch {
        await enqueueSyncItem({
          entityType: "daily_log",
          entityId: logId,
          operation: "CREATE",
          orgId: activeOrg!.id,
          payload,
        });
      }
    } else {
      await enqueueSyncItem({
        entityType: "daily_log",
        entityId: logId,
        operation: "CREATE",
        orgId: activeOrg!.id,
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

  const currencySymbol = activeOrg.currency === "BDT" ? "৳" : "$";
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

          {/* Book / Ledger selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary">
              Select Book
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

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary">
              Description / Detail
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Supermarket, Family dinner, Rent"
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
