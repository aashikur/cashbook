"use client";

import React, { useState } from "react";
import { localDb } from "@/lib/local-db";
import { DEFAULT_CATEGORIES, getCategoryIcon } from "@/lib/categories";
import {
  Check,
  Edit2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

export interface CustomCategoryItem {
  id: string;
  name: string;
  icon?: string;
}

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  customCategories: CustomCategoryItem[];
  onCategoriesChanged?: () => void;
}

export default function ManageCategoriesModal({
  isOpen,
  onClose,
  orgId,
  customCategories,
  onCategoriesChanged,
}: ManageCategoriesModalProps) {
  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    if (
      DEFAULT_CATEGORIES.some(
        (c) => c.label.toLowerCase() === trimmed.toLowerCase()
      ) ||
      customCategories.some(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setError("Category already exists");
      return;
    }

    setLoading(true);
    setError("");
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      // 1. Optimistic Dexie write
      await localDb.categories.put({
        id: newId,
        orgId,
        name: trimmed,
        icon: "Tag",
        createdAt: now,
        updatedAt: now,
      });

      // 2. Server write
      await fetch(`/api/v1/orgs/${orgId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newId, name: trimmed }),
      });

      setNewCatName("");
      onCategoriesChanged?.();
    } catch {
      setError("Failed to create category");
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(cat: CustomCategoryItem) {
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === cat.name) {
      setEditingId(null);
      return;
    }

    setLoading(true);
    setError("");
    const now = new Date().toISOString();

    try {
      // 1. Optimistic Dexie update
      await localDb.categories.update(cat.id, {
        name: trimmed,
        updatedAt: now,
      });

      // Update existing local logs
      const matchingLogs = await localDb.dailyLogs
        .where("orgId")
        .equals(orgId)
        .and((l) => l.category === cat.name)
        .toArray();

      for (const log of matchingLogs) {
        await localDb.dailyLogs.update(log.id, {
          category: trimmed,
          updatedAt: now,
        });
      }

      // 2. Server update
      await fetch(`/api/v1/orgs/${orgId}/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      setEditingId(null);
      onCategoriesChanged?.();
    } catch {
      setError("Failed to rename category");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(cat: CustomCategoryItem) {
    if (
      !confirm(
        `Delete category "${cat.name}"?\n\nAny past transactions under this category will safely be reassigned to "General".`
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");
    const now = new Date().toISOString();

    try {
      // 1. Optimistic local update
      await localDb.categories.delete(cat.id);

      const matchingLogs = await localDb.dailyLogs
        .where("orgId")
        .equals(orgId)
        .and((l) => l.category === cat.name)
        .toArray();

      for (const log of matchingLogs) {
        await localDb.dailyLogs.update(log.id, {
          category: "General",
          updatedAt: now,
        });
      }

      // 2. Server delete
      await fetch(`/api/v1/orgs/${orgId}/categories/${cat.id}`, {
        method: "DELETE",
      });

      onCategoriesChanged?.();
    } catch {
      setError("Failed to delete category");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border-default w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150 my-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-txt-muted hover:text-txt-secondary p-1 rounded-full transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <h3 className="text-base font-bold text-txt-main tracking-tight mb-1">
          Manage Categories
        </h3>
        <p className="text-xs text-txt-secondary mb-4">
          Add custom tags or edit existing categories.
        </p>

        {error && (
          <div className="mb-3 bg-cash-out-light border border-cash-out-border text-cash-out text-xs px-3 py-2 rounded-xl">
            {error}
          </div>
        )}

        {/* Add new category form */}
        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
          <input
            type="text"
            required
            placeholder="New category name..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 bg-subtle border border-border-default rounded-xl px-3 py-2 text-xs text-txt-main placeholder:text-txt-muted focus:outline-none focus:border-primary focus:bg-surface transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 text-xs font-semibold text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add</span>
          </button>
        </form>

        {/* Category list */}
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
          {/* Default categories header */}
          <div className="text-[10px] font-bold text-txt-muted uppercase tracking-wider pt-1 pb-0.5">
            Core System Defaults (5)
          </div>
          {DEFAULT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                className="flex items-center justify-between px-3 py-2 bg-subtle/50 rounded-xl text-xs text-txt-secondary"
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} className="text-txt-muted" />
                  <span className="font-medium text-txt-main">{cat.label}</span>
                </div>
                <span className="text-[10px] text-txt-muted font-mono bg-subtle px-1.5 py-0.5 rounded">
                  Default
                </span>
              </div>
            );
          })}

          {/* Custom categories */}
          <div className="text-[10px] font-bold text-txt-muted uppercase tracking-wider pt-3 pb-0.5">
            Custom Workspace Categories ({customCategories.length})
          </div>

          {customCategories.length === 0 ? (
            <div className="text-center py-4 text-xs text-txt-muted bg-subtle/30 rounded-xl border border-dashed border-border-default">
              No custom categories yet. Type above to add one!
            </div>
          ) : (
            customCategories.map((cat) => {
              const Icon = getCategoryIcon(cat.name);
              const isEditing = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-3 py-2 bg-surface border border-border-subtle rounded-xl text-xs hover:border-border-default transition-all"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(cat);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 bg-subtle border border-primary rounded-lg px-2 py-1 text-xs text-txt-main focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRename(cat)}
                        className="p-1 rounded-md text-cash-in hover:bg-cash-in-light cursor-pointer"
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1 rounded-md text-txt-muted hover:bg-subtle cursor-pointer"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Icon size={14} className="text-primary shrink-0" />
                        <span className="font-medium text-txt-main truncate">
                          {cat.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditingName(cat.name);
                          }}
                          className="p-1.5 rounded-lg text-txt-muted hover:text-primary hover:bg-primary-light transition-colors cursor-pointer"
                          title="Rename Category"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 rounded-lg text-txt-muted hover:text-cash-out hover:bg-cash-out-light transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-2xl bg-subtle hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-txt-main transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
