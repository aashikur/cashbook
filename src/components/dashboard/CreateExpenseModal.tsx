"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { localDb } from "@/lib/local-db";
import { enqueueSyncItem } from "@/lib/sync-service";
import { BookOpen, X } from "lucide-react";

interface CreateExpenseModalProps {
  onCreated?: () => void;
}

export default function CreateExpenseModal({ onCreated }: CreateExpenseModalProps) {
  const { activeOrg, isAddExpenseOpen, setAddExpenseOpen } = useAppStore();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isAddExpenseOpen || !activeOrg) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !activeOrg) return;

    setLoading(true);
    setError("");

    const expenseId = crypto.randomUUID();
    const now = new Date().toISOString();

    const payload = {
      id: expenseId,
      title: title.trim(),
      category: category.trim() || undefined,
    };

    // 1. Optimistically write to local Dexie database for instant UI response
    await localDb.expenses.put({
      id: expenseId,
      orgId: activeOrg.id,
      title: payload.title,
      category: payload.category,
      totalSpent: 0,
      logCount: 0,
      isArchived: false,
      createdBy: "current_user",
      createdAt: now,
      updatedAt: now,
      syncStatus: navigator.onLine ? "synced" : "pending",
    });

    // 2. If online, sync to server; if offline, enqueue in syncQueue
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/v1/orgs/${activeOrg.id}/expenses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": expenseId,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          await enqueueSyncItem({
            entityType: "expense",
            entityId: expenseId,
            operation: "CREATE",
            orgId: activeOrg.id,
            payload,
          });
        }
      } catch {
        await enqueueSyncItem({
          entityType: "expense",
          entityId: expenseId,
          operation: "CREATE",
          orgId: activeOrg.id,
          payload,
        });
      }
    } else {
      await enqueueSyncItem({
        entityType: "expense",
        entityId: expenseId,
        operation: "CREATE",
        orgId: activeOrg.id,
        payload,
      });
    }

    setLoading(false);
    setAddExpenseOpen(false);
    setTitle("");
    setCategory("");
    onCreated?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border-default w-full max-w-md rounded-2xl p-6 shadow-xl relative animate-in zoom-in-95 duration-150">
        <button
          onClick={() => setAddExpenseOpen(false)}
          className="absolute right-4 top-4 text-txt-muted hover:text-txt-secondary p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-border flex items-center justify-center text-primary">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-txt-main">
              Add New Book
            </h2>
            <p className="text-xs text-txt-secondary">
              Create a ledger book (e.g. January expenses, Groceries, Rent)
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-cash-out-light border border-cash-out-border text-cash-out text-xs px-3 py-2 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-txt-secondary">
              Book Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. January expenses, Freelance, Savings"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-subtle border border-border-default rounded-xl px-3.5 py-2.5 text-xs text-txt-main placeholder:text-txt-muted focus:outline-none focus:border-primary focus:bg-surface transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-txt-secondary">
              Category (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Personal, Business, Household"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-subtle border border-border-default rounded-xl px-3.5 py-2.5 text-xs text-txt-main placeholder:text-txt-muted focus:outline-none focus:border-primary focus:bg-surface transition-colors"
            />
          </div>

          <div className="flex gap-2.5 mt-2">
            <button
              type="button"
              onClick={() => setAddExpenseOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-border-default text-xs font-semibold text-txt-secondary hover:bg-subtle active:scale-95 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 text-xs font-semibold text-white shadow-sm shadow-primary/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Creating..." : "Save Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
