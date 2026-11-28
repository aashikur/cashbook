"use client";

import React, { useState, useEffect } from "react";
import { localDb } from "@/lib/local-db";
import { enqueueSyncItem } from "@/lib/sync-service";
import { useAppStore } from "@/store/app-store";
import CategoryPillSelector from "./CategoryPillSelector";
import {
  ArrowDownLeft,
  ArrowUpRight,
  X,
} from "lucide-react";

interface EditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  orgId: string;
  expenseId: string;
  log: {
    id: string;
    amountPaisa: number;
    type?: "in" | "out";
    category?: string;
    note: string;
    logDate: string;
    attachments?: Array<{ key: string; url: string; mimeType: string }>;
  } | null;
}

export default function EditLogModal({
  isOpen,
  onClose,
  onUpdated,
  orgId,
  expenseId,
  log,
}: EditLogModalProps) {
  const { activeOrg } = useAppStore();

  const [type, setType] = useState<"in" | "out">("out");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [note, setNote] = useState("");
  const [logDate, setLogDate] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Populate data when log changes
  useEffect(() => {
    if (!log) return;
    const isActuallyIn =
      log.type === "in" ||
      log.note.startsWith("[IN]") ||
      log.note.toLowerCase().includes("income") ||
      log.note.toLowerCase().includes("cash in");

    setType(isActuallyIn ? "in" : "out");
    setAmount((log.amountPaisa / 100).toFixed(2));
    setCategory(log.category || "General");
    setNote(log.note.replace(/^\[IN\]\s*/, ""));
    setLogDate(log.logDate || new Date().toISOString().slice(0, 10));
    setError("");
  }, [log]);

  // Load custom categories from Dexie
  useEffect(() => {
    if (!orgId) return;
    localDb.dailyLogs
      .where("orgId")
      .equals(orgId)
      .toArray()
      .then((logs) => {
        const unique = Array.from(
          new Set(logs.map((l) => l.category).filter(Boolean) as string[])
        );
        setCustomCategories(unique);
      })
      .catch(() => {});
  }, [orgId]);

  if (!isOpen || !log) return null;

  const currencySymbol = activeOrg?.currency === "BDT" ? "৳" : "$";
  const isIn = type === "in";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!log) return;
    if (activeOrg?.role !== "admin") {
      setError("Forbidden: Only workspace editors can modify transactions");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    setLoading(true);
    setError("");

    const newAmountPaisa = Math.round(parsedAmount * 100);
    const oldSigned =
      log.type === "in" ? log.amountPaisa : -log.amountPaisa;
    const newSigned = type === "in" ? newAmountPaisa : -newAmountPaisa;
    const deltaSigned = newSigned - oldSigned;
    const now = new Date().toISOString();

    const patchPayload = {
      type,
      category: category || "General",
      amountPaisa: newAmountPaisa,
      note: note.trim(),
      logDate,
    };

    try {
      // 1. Optimistic update local Dexie database
      await localDb.dailyLogs.update(log.id, {
        ...patchPayload,
        updatedAt: now,
      });

      // Update parent expense total if signed amount changed
      if (deltaSigned !== 0) {
        const exp = await localDb.expenses.get(expenseId);
        if (exp) {
          await localDb.expenses.update(expenseId, {
            totalSpent: exp.totalSpent + deltaSigned,
            updatedAt: now,
          });
        }
      }

      // 2. Network request with offline queue fallback
      if (navigator.onLine) {
        try {
          const res = await fetch(`/api/v1/orgs/${orgId}/logs/${log.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patchPayload),
          });

          if (!res.ok) {
            await enqueueSyncItem({
              entityType: "daily_log",
              entityId: log.id,
              operation: "UPDATE",
              orgId,
              payload: patchPayload,
            });
          }
        } catch {
          await enqueueSyncItem({
            entityType: "daily_log",
            entityId: log.id,
            operation: "UPDATE",
            orgId,
            payload: patchPayload,
          });
        }
      } else {
        await enqueueSyncItem({
          entityType: "daily_log",
          entityId: log.id,
          operation: "UPDATE",
          orgId,
          payload: patchPayload,
        });
      }

      setLoading(false);
      onClose();
      onUpdated?.();
    } catch (err) {
      console.error("Error editing log:", err);
      setError("Failed to save changes");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-surface border border-border-default w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 my-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-txt-muted hover:text-txt-secondary p-1 rounded-full transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <h3 className="text-base font-bold text-txt-main tracking-tight mb-4">
          Edit Transaction
        </h3>

        {/* Cash In vs Cash Out Selector Pills */}
        <div className="flex bg-subtle p-1 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => setType("in")}
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
            onClick={() => setType("out")}
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-subtle border border-border-default rounded-2xl px-4 pl-9 py-3 text-2xl font-extrabold text-txt-main focus:outline-none focus:bg-surface focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Category Pill Selector */}
          <CategoryPillSelector
            selectedCategory={category}
            onSelectCategory={setCategory}
            availableCustomCategories={customCategories}
            onAddCustomCategory={(newCat) => {
              setCustomCategories((prev) =>
                prev.includes(newCat) ? prev : [...prev, newCat]
              );
            }}
            orgId={orgId}
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
              className="bg-subtle border border-border-default rounded-xl px-3.5 py-2.5 text-xs text-txt-main focus:outline-none focus:bg-surface focus:border-primary transition-colors"
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

          {/* Save Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl font-bold text-xs text-white bg-primary hover:bg-primary-hover shadow-md shadow-primary/25 active:scale-95 transition-all cursor-pointer mt-2"
          >
            {loading ? "Saving Changes..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
