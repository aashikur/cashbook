"use client";

import React, { useState, useMemo } from "react";
import BookCard from "./BookCard";
import { useAppStore } from "@/store/app-store";
import {
  ArrowUpDown,
  BookOpen,
  Check,
  Columns2,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react";

export type BookSortOption = "updated" | "alphabetical" | "created";
export type BookViewMode = "grid" | "columns" | "list";

export interface ExpenseItem {
  id: string;
  orgId: string;
  title: string;
  category?: string;
  totalSpent: number | string;
  logCount: number;
  updatedAt: string;
  createdAt?: string;
  createdByName?: string;
  updatedByName?: string;
}

interface ExpenseLedgerListProps {
  expenses: ExpenseItem[];
  isLoading?: boolean;
  sortOption?: BookSortOption;
  onSortChange?: (option: BookSortOption) => void;
}

export default function ExpenseLedgerList({
  expenses,
  isLoading = false,
  sortOption: controlledSortOption,
  onSortChange,
}: ExpenseLedgerListProps) {
  const { activeOrg, setAddExpenseOpen } = useAppStore();
  const currency = activeOrg?.currency || "BDT";

  // Persist user sort preference in localStorage (internal fallback if uncontrolled)
  const [internalSortOption, setInternalSortOption] = useState<BookSortOption>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cashbook_book_sort") as BookSortOption;
      if (saved === "updated" || saved === "alphabetical" || saved === "created") {
        return saved;
      }
    }
    return "updated";
  });

  const sortOption = controlledSortOption ?? internalSortOption;

  // Persist user view mode (grid vs columns vs compact list) in localStorage
  const [viewMode, setViewMode] = useState<BookViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cashbook_book_view") as BookViewMode;
      if (saved === "grid" || saved === "columns" || saved === "list") {
        return saved;
      }
    }
    return "grid";
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  function handleSortChange(option: BookSortOption) {
    if (onSortChange) {
      onSortChange(option);
    } else {
      setInternalSortOption(option);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("cashbook_book_sort", option);
    }
  }

  function handleViewModeChange(mode: BookViewMode) {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("cashbook_book_view", mode);
    }
  }

  // Reactive sorted expenses list based on user selection
  const sortedExpenses = useMemo(() => {
    const list = [...expenses];
    if (sortOption === "alphabetical") {
      return list.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      );
    }
    if (sortOption === "created") {
      return list.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });
    }
    // Default: "updated" (recently active first)
    return list.sort((a, b) => {
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
  }, [expenses, sortOption]);

  return (
    <div className="flex flex-col gap-3">
      {/* Section Header with View Toggle, Sort Selector & Add Book */}
      <div className="flex items-center justify-between px-0.5 pt-1 gap-1.5 sm:gap-2">
        <h2 className="text-xl font-bold text-txt-main tracking-tight">
          Your books
        </h2>

        <div className="flex items-center gap-2">
          {/* Desktop View Mode Toggle: Grid vs Column vs Compact List (Hidden on mobile for clean 48x48 ergonomics) */}
          <div className="hidden sm:flex items-center bg-surface border border-border-default rounded-xl p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleViewModeChange("grid")}
              className={`min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-primary text-white shadow-xs"
                  : "text-txt-muted hover:text-txt-main hover:bg-subtle"
              }`}
              title="Card view (Spacious)"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("columns")}
              className={`min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                viewMode === "columns"
                  ? "bg-primary text-white shadow-xs"
                  : "text-txt-muted hover:text-txt-main hover:bg-subtle"
              }`}
              title="Column view (Multi-column on PC)"
            >
              <Columns2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("list")}
              className={`min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-primary text-white shadow-xs"
                  : "text-txt-muted hover:text-txt-main hover:bg-subtle"
              }`}
              title="Compact list view (High density)"
            >
              <List size={15} />
            </button>
          </div>

          {/* Unified Sort (Desktop & Mobile) + View Switcher (Mobile) with 48x48px Touch Target */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`relative min-w-[40px] min-h-[40px] sm:min-w-[38px] sm:min-h-[38px] rounded-xl border transition-all cursor-pointer flex items-center justify-center touch-manipulation before:absolute before:-inset-1 before:content-[''] ${
                isFilterOpen || sortOption !== "updated"
                  ? "bg-primary-light text-primary border-primary-border shadow-2xs"
                  : "bg-surface text-txt-main border-border-default hover:bg-subtle shadow-2xs"
              }`}
              title="Sort & Display Options"
              aria-label="Sort and display options"
            >
              <ArrowUpDown size={16} />
            </button>

            {/* Dropdown Menu */}
            {isFilterOpen && (
              <>
                {/* Backdrop to close on tap/click outside */}
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsFilterOpen(false)}
                />

                <div className="absolute right-0 top-full mt-2 z-40 w-52 bg-surface border border-border-default rounded-2xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-txt-muted">
                    Sort books by
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleSortChange("updated");
                      setIsFilterOpen(false);
                    }}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer touch-manipulation ${
                      sortOption === "updated"
                        ? "bg-primary-light text-primary font-bold"
                        : "text-txt-main hover:bg-subtle"
                    }`}
                  >
                    <span>Updated</span>
                    {sortOption === "updated" && (
                      <Check size={15} className="stroke-[2.5]" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSortChange("alphabetical");
                      setIsFilterOpen(false);
                    }}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer touch-manipulation ${
                      sortOption === "alphabetical"
                        ? "bg-primary-light text-primary font-bold"
                        : "text-txt-main hover:bg-subtle"
                    }`}
                  >
                    <span>A - Z</span>
                    {sortOption === "alphabetical" && (
                      <Check size={15} className="stroke-[2.5]" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSortChange("created");
                      setIsFilterOpen(false);
                    }}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer touch-manipulation ${
                      sortOption === "created"
                        ? "bg-primary-light text-primary font-bold"
                        : "text-txt-main hover:bg-subtle"
                    }`}
                  >
                    <span>Created</span>
                    {sortOption === "created" && (
                      <Check size={15} className="stroke-[2.5]" />
                    )}
                  </button>

                  {/* Mobile-Only View Layout Selector inside Dropdown */}
                  <div className="sm:hidden">
                    <div className="my-1.5 border-t border-border-subtle" />
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-txt-muted">
                      View layout
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleViewModeChange("grid");
                        setIsFilterOpen(false);
                      }}
                      className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer touch-manipulation ${
                        viewMode === "grid" || viewMode === "columns"
                          ? "bg-primary-light text-primary font-bold"
                          : "text-txt-main hover:bg-subtle"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <LayoutGrid size={14} />
                        <span>Card View</span>
                      </span>
                      {(viewMode === "grid" || viewMode === "columns") && (
                        <Check size={15} className="stroke-[2.5]" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleViewModeChange("list");
                        setIsFilterOpen(false);
                      }}
                      className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer touch-manipulation ${
                        viewMode === "list"
                          ? "bg-primary-light text-primary font-bold"
                          : "text-txt-main hover:bg-subtle"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <List size={14} />
                        <span>Compact List</span>
                      </span>
                      {viewMode === "list" && (
                        <Check size={15} className="stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {activeOrg?.role === "admin" && (
            <button
              onClick={() => setAddExpenseOpen(true)}
              className="relative btn-pill-primary min-h-[40px] sm:min-h-[38px] cursor-pointer active:scale-95 transition-transform flex items-center gap-1.5 py-2 px-3.5 shrink-0 whitespace-nowrap touch-manipulation before:absolute before:-inset-1 before:content-['']"
            >
              <Plus size={15} />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Book Cards / List */}
      {isLoading ? (
        <div
          className={
            viewMode === "columns"
              ? "w-full grid grid-cols-1 sm:grid-cols-2 gap-2 animate-pulse"
              : viewMode === "list"
              ? "w-full flex flex-col gap-1.5 animate-pulse"
              : "w-full flex flex-col gap-2 animate-pulse"
          }
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-surface rounded-[12px] border border-border-subtle/50 shadow-2xs"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-slate-200/70 shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <div
                    className="h-4 bg-slate-200/70 rounded-md"
                    style={{ width: i % 2 === 0 ? "55%" : "70%" }}
                  />
                  <div className="h-3 w-24 bg-slate-100 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                <div className="h-5 w-16 bg-slate-200/70 rounded-md" />
                <div className="flex items-center gap-1">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20" />
                  <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-surface border border-dashed border-border-default rounded-3xl text-center gap-3 my-2 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center">
            <BookOpen size={22} />
          </div>
          <div className="text-sm font-bold text-txt-main">
            No books created yet
          </div>
          <p className="text-xs text-txt-muted max-w-xs">
            Create books like &ldquo;January expenses&rdquo;, &ldquo;Groceries&rdquo;, or &ldquo;Savings&rdquo;.
          </p>
          {activeOrg?.role === "admin" && (
            <button
              onClick={() => setAddExpenseOpen(true)}
              className="mt-1 btn-pill-primary cursor-pointer"
            >
              <Plus size={15} />
              <span>Create First Book</span>
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === "columns"
              ? "w-full grid grid-cols-1 sm:grid-cols-2 gap-2"
              : viewMode === "list"
              ? "w-full flex flex-col gap-1.5"
              : "w-full flex flex-col gap-2"
          }
        >
          {sortedExpenses.map((expense) => (
            <BookCard
              key={expense.id}
              id={expense.id}
              orgId={expense.orgId}
              title={expense.title}
              category={expense.category}
              totalSpent={expense.totalSpent}
              logCount={expense.logCount}
              updatedAt={expense.updatedAt}
              createdAt={expense.createdAt}
              createdByName={expense.createdByName}
              updatedByName={expense.updatedByName}
              currency={currency}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
