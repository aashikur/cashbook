"use client";

import React, { useState } from "react";
import { DEFAULT_CATEGORIES, getCategoryIcon } from "@/lib/categories";
import ManageCategoriesModal, { CustomCategoryItem } from "./ManageCategoriesModal";
import { Plus, Check, X, SlidersHorizontal } from "lucide-react";

interface CategoryPillSelectorProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  availableCustomCategories?: Array<CustomCategoryItem | string>;
  onAddCustomCategory?: (category: string) => void;
  orgId?: string;
  onCategoriesChanged?: () => void;
}

export default function CategoryPillSelector({
  selectedCategory,
  onSelectCategory,
  availableCustomCategories = [],
  onAddCustomCategory,
  orgId,
  onCategoriesChanged,
}: CategoryPillSelectorProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // Normalize custom categories to standard CustomCategoryItem structure
  const normalizedCustomCats: CustomCategoryItem[] = availableCustomCategories
    .map((item) => {
      if (typeof item === "string") {
        return { id: item, name: item };
      }
      return item;
    })
    .filter(
      (c) =>
        c.name.trim() &&
        !DEFAULT_CATEGORIES.some(
          (def) => def.id.toLowerCase() === c.name.toLowerCase()
        )
    );

  function handleCreateNew(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    onSelectCategory(trimmed);
    onAddCustomCategory?.(trimmed);
    setNewCatName("");
    setIsAddingNew(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary">
          Category
        </label>
        {orgId && (
          <button
            type="button"
            onClick={() => setIsManageModalOpen(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
          >
            <SlidersHorizontal size={11} />
            <span>Manage</span>
          </button>
        )}
      </div>

      {/* Pill selection row */}
      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 py-0.5">
        {DEFAULT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected =
            selectedCategory.toLowerCase() === cat.id.toLowerCase();
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? "bg-primary text-white shadow-sm shadow-primary/20 scale-[1.02]"
                  : "bg-subtle text-txt-secondary hover:text-txt-main hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={13} className="shrink-0" />
              <span>{cat.label}</span>
            </button>
          );
        })}

        {/* Custom categories */}
        {normalizedCustomCats.map((cat) => {
          const Icon = getCategoryIcon(cat.name);
          const isSelected =
            selectedCategory.toLowerCase() === cat.name.toLowerCase();
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? "bg-primary text-white shadow-sm shadow-primary/20 scale-[1.02]"
                  : "bg-subtle text-txt-secondary hover:text-txt-main hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={13} className="shrink-0" />
              <span>{cat.name}</span>
            </button>
          );
        })}

        {/* On-the-fly "+ New" creation button */}
        {!isAddingNew ? (
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-primary bg-primary-light hover:bg-primary-light/80 border border-primary-border transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>New</span>
          </button>
        ) : null}
      </div>

      {/* Inline input for creating custom category */}
      {isAddingNew && (
        <div className="flex items-center gap-1.5 mt-1 animate-in fade-in zoom-in-95 duration-150">
          <input
            type="text"
            autoFocus
            placeholder="Category name (e.g. Gym, Medicine)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateNew(e);
              if (e.key === "Escape") setIsAddingNew(false);
            }}
            className="flex-1 bg-subtle border border-border-default rounded-xl px-3 py-1.5 text-xs text-txt-main focus:outline-none focus:bg-surface focus:border-primary transition-colors"
          />
          <button
            type="button"
            onClick={handleCreateNew}
            className="p-1.5 bg-primary text-white rounded-xl hover:bg-primary-hover active:scale-95 transition-all cursor-pointer"
            title="Confirm"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAddingNew(false);
              setNewCatName("");
            }}
            className="p-1.5 bg-subtle text-txt-muted hover:text-txt-main rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Manage Categories Modal */}
      {orgId && (
        <ManageCategoriesModal
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
          orgId={orgId}
          customCategories={normalizedCustomCats}
          onCategoriesChanged={() => {
            onCategoriesChanged?.();
          }}
        />
      )}
    </div>
  );
}
