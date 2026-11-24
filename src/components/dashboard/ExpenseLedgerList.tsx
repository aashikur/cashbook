"use client";

import React, { useState, useMemo } from "react";
import BookCard from "./BookCard";
import { useAppStore } from "@/store/app-store";
import { BookOpen, Check, Filter, LayoutGrid, List, Plus } from "lucide-react";

export type BookSortOption = "updated" | "alphabetical" | "created";
export type BookViewMode = "grid" | "list";

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
}

export default function ExpenseLedgerList({
  expenses,
}: ExpenseLedgerListProps) {
  const { activeOrg, setAddExpenseOpen } = useAppStore();
  const currency = activeOrg?.currency || "BDT";

  // Persist user sort preference in localStorage
  const [sortOption, setSortOption] = useState<BookSortOption>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cashbook_book_sort") as BookSortOption;
      if (saved === "updated" || saved === "alphabetical" || saved === "created") {
        return saved;
      }
    }
    return "updated";
  });

  // Persist user view mode (grid vs compact list) in localStorage
  const [viewMode, setViewMode] = useState<BookViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cashbook_book_view") as BookViewMode;
      if (saved === "grid" || saved === "list") {
        return saved;
      }
    }
    return "grid";
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  function handleSortChange(option: BookSortOption) {
    setSortOption(option);
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

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* View Mode Toggle: Grid vs Compact List */}
          <div className="flex items-center bg-surface border border-border-default rounded-xl p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleViewModeChange("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-primary text-white shadow-xs"
                  : "text-txt-muted hover:text-txt-main hover:bg-subtle"
              }`}
              title="Card view (Spacious)"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("list")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-primary text-white shadow-xs"
                  : "text-txt-muted hover:text-txt-main hover:bg-subtle"
              }`}
              title="Compact list view (High density)"
            >
              <List size={14} />
            </button>
          </div>

          {/* Filter Popover Button (Only Icon, matching reference image) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isFilterOpen || sortOption !== "updated"
                  ? "bg-primary-light text-primary border-primary-border shadow-2xs"
                  : "bg-surface text-txt-main border-border-default hover:bg-subtle shadow-2xs"
              }`}
              title="Filter & sort books"
            >
              <Filter size={15} />
            </button>

            {/* Dropdown Menu */}
            {isFilterOpen && (
              <>
                {/* Backdrop to close on tap/click outside */}
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsFilterOpen(false)}
                />

                <div className="absolute right-0 top-full mt-1.5 z-40 w-44 bg-surface border border-border-default rounded-2xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-txt-muted">
                    Sort books by
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleSortChange("updated");
                      setIsFilterOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      sortOption === "updated"
                        ? "bg-primary-light text-primary font-bold"
                        : "text-txt-main hover:bg-subtle"
                    }`}
                  >
                    <span>Updated</span>
                    {sortOption === "updated" && (
                      <Check size={14} className="stroke-[2.5]" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSortChange("alphabetical");
                      setIsFilterOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      sortOption === "alphabetical"
                        ? "bg-primary-light text-primary font-bold"
                        : "text-txt-main hover:bg-subtle"
                    }`}
                  >
                    <span>A - Z</span>
                    {sortOption === "alphabetical" && (
                      <Check size={14} className="stroke-[2.5]" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSortChange("created");
                      setIsFilterOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      sortOption === "created"
                        ? "bg-primary-light text-primary font-bold"
                        : "text-txt-main hover:bg-subtle"
                    }`}
                  >
                    <span>Created</span>
                    {sortOption === "created" && (
                      <Check size={14} className="stroke-[2.5]" />
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {activeOrg?.role === "admin" && (
            <button
              onClick={() => setAddExpenseOpen(true)}
              className="btn-pill-primary cursor-pointer active:scale-95 transition-transform flex items-center gap-1 py-1.5 px-3 shrink-0 whitespace-nowrap"
            >
              <Plus size={15} />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Book Cards / List */}
      {sortedExpenses.length === 0 ? (
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
        <div className={viewMode === "list" ? "w-full flex flex-col gap-1.5" : "w-full flex flex-col gap-2"}>
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
