"use client";

import React, { useState, useEffect } from "react";
import { localDb } from "@/lib/local-db";
import { enqueueSyncItem } from "@/lib/sync-service";
import { X, Archive, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updated: { title: string; category?: string }) => void;
  orgId: string;
  expense: {
    id: string;
    title: string;
    category?: string;
    logCount: number;
    isArchived: boolean;
  } | null;
}

export default function EditExpenseModal({
  isOpen,
  onClose,
  onUpdated,
  orgId,
  expense,
}: EditExpenseModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (expense) {
      setTitle(expense.title);
      setCategory(expense.category || "General");
      setError("");
    }
  }, [expense]);

  if (!isOpen || !expense) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!expense) return;
    if (!title.trim()) {
      setError("Please enter a book title");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        title: title.trim(),
        category: category.trim() || "General",
      };

      // 1. Optimistic Dexie update
      await localDb.expenses.update(expense.id, {
        ...payload,
        updatedAt: new Date().toISOString(),
      });

      // 2. Server PATCH with offline queue fallback
      if (navigator.onLine) {
        try {
          const res = await fetch(`/api/v1/orgs/${orgId}/expenses/${expense.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            await enqueueSyncItem({
              entityType: "expense",
              entityId: expense.id,
              operation: "UPDATE",
              orgId,
              payload,
            });
          }
        } catch {
          await enqueueSyncItem({
            entityType: "expense",
            entityId: expense.id,
            operation: "UPDATE",
            orgId,
            payload,
          });
        }
      } else {
        await enqueueSyncItem({
          entityType: "expense",
          entityId: expense.id,
          operation: "UPDATE",
          orgId,
          payload,
        });
      }

      setLoading(false);
      onUpdated?.(payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update book");
      setLoading(false);
    }
  }

  async function handleArchiveToggle() {
    if (!expense) return;
    const newArchived = !expense.isArchived;
    const confirmMsg = newArchived
      ? "Are you sure you want to archive this book? It will be hidden from the active list."
      : "Unarchive this book and restore to active list?";
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      await localDb.expenses.update(expense.id, {
        isArchived: newArchived,
        updatedAt: new Date().toISOString(),
      });

      const res = await fetch(`/api/v1/orgs/${orgId}/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: newArchived }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to archive book");
      }

      setLoading(false);
      onClose();
      router.push("/dashboard");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to change archive status");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!expense) return;
    if (expense.logCount > 0) {
      alert(
        `Cannot delete "${expense.title}" because it contains ${expense.logCount} transactions. Archive this book instead to preserve audit records.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete "${expense.title}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await localDb.expenses.delete(expense.id);

      const res = await fetch(`/api/v1/orgs/${orgId}/expenses/${expense.id}`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete book");
      }

      setLoading(false);
      onClose();
      router.push("/dashboard");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete book");
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
          Book Settings
        </h3>

        {error && (
          <div className="mb-4 bg-cash-out-light border border-cash-out-border text-cash-out text-xs px-3 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary">
              Book / Ledger Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Daily Personal, Office Expenses"
              className="bg-subtle border border-border-default rounded-xl px-3.5 py-2.5 text-xs text-txt-main focus:outline-none focus:bg-surface focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Operations, Personal, Project"
              className="bg-subtle border border-border-default rounded-xl px-3.5 py-2.5 text-xs text-txt-main focus:outline-none focus:bg-surface focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl font-bold text-xs text-white bg-primary hover:bg-primary-hover shadow-md shadow-primary/25 active:scale-95 transition-all cursor-pointer"
            >
              {loading ? "Saving Changes..." : "Save Book Details"}
            </button>

            <button
              type="button"
              onClick={handleArchiveToggle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border-default hover:bg-subtle text-xs font-semibold text-txt-secondary hover:text-txt-main transition-colors cursor-pointer"
            >
              <Archive size={14} />
              <span>{expense.isArchived ? "Unarchive Book" : "Archive Book"}</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-cash-out hover:bg-cash-out-light border border-transparent hover:border-cash-out-border transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Delete Book</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
