"use client";

import React, { useState, useEffect, useMemo } from "react";
import BookCard, { BookCardViewMode } from "./BookCard";
import BookDetailsModal from "./BookDetailsModal";
import EditExpenseModal from "./EditExpenseModal";
import { useAppStore } from "@/store/app-store";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
import {
  ArrowUpDown,
  BookOpen,
  Check,
  Columns2,
  LayoutGrid,
  List,
  Plus,
  Search,
} from "lucide-react";

export type BookSortOption = "updated" | "alphabetical" | "created";
export type BookViewMode = BookCardViewMode;

export interface ExpenseItem {
  id: string;
  orgId: string;
  title: string;
  category?: string;
  totalSpent: number | string;
  logCount: number;
  isArchived?: boolean;
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
  onOpenSearch?: () => void;
  hideToolbar?: boolean;
  isSearchActive?: boolean;
  onBookUpdated?: () => void;
}

export default function ExpenseLedgerList({
  expenses,
  isLoading = false,
  sortOption: controlledSortOption,
  onSortChange,
  onOpenSearch,
  hideToolbar = false,
  isSearchActive = false,
  onBookUpdated,
}: ExpenseLedgerListProps) {
  const { activeOrg, setAddExpenseOpen } = useAppStore();
  const { canEditBook } = useOrgPermissions();
  const currency = activeOrg?.currency || "BDT";

  const [internalSortOption, setInternalSortOption] =
    useState<BookSortOption>("updated");
  const sortOption = controlledSortOption ?? internalSortOption;

  const [viewMode, setViewMode] = useState<BookViewMode>("grid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(
    null
  );
  const [infoTarget, setInfoTarget] = useState<{
    expense: ExpenseItem;
    totalInPaisa: number;
    totalOutPaisa: number;
    netBalancePaisa: number;
  } | null>(null);

  useEffect(() => {
    const savedSort = localStorage.getItem(
      "cashbook_book_sort"
    ) as BookSortOption;
    if (
      savedSort === "updated" ||
      savedSort === "alphabetical" ||
      savedSort === "created"
    ) {
      setInternalSortOption(savedSort);
    }
    const savedView = localStorage.getItem("cashbook_book_view") as BookViewMode;
    if (savedView === "grid" || savedView === "columns" || savedView === "list") {
      setViewMode(savedView);
    }
  }, []);

  function handleSortChange(option: BookSortOption) {
    if (onSortChange) {
      onSortChange(option);
    } else {
      setInternalSortOption(option);
    }
    localStorage.setItem("cashbook_book_sort", option);
  }

  function handleViewModeChange(mode: BookViewMode) {
    setViewMode(mode);
    localStorage.setItem("cashbook_book_view", mode);
  }

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
    return list.sort((a, b) => {
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
  }, [expenses, sortOption]);

  const listContainerClass =
    viewMode === "columns"
      ? "w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-4 sm:px-0"
      : "w-full bg-surface border-y sm:border border-border-default rounded-none sm:rounded-2xl divide-y divide-border-subtle shadow-none sm:shadow-xs";

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar Header: Your Books + Sort/View, Search Icon & Add */}
      {!hideToolbar && (
        <div className="flex items-center justify-between px-4 sm:px-0.5 pt-0.5 gap-2">
          <h2 className="text-base sm:text-lg font-bold text-txt-main tracking-tight">
            Your Books
          </h2>

          <div className="flex items-center gap-1.5">
            {/* Sort & View Menu Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className={`relative w-9 h-9 rounded-full transition-all cursor-pointer flex items-center justify-center touch-manipulation before:absolute before:-inset-1.5 before:content-[''] ${
                  isFilterOpen || sortOption !== "updated"
                    ? "bg-primary-light text-primary"
                    : "text-primary hover:bg-primary-light"
                }`}
                title="Sort & View Options"
                aria-label="Sort and view options"
              >
                <ArrowUpDown size={18} />
                {sortOption !== "updated" && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>

              {isFilterOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsFilterOpen(false)}
                  />

                  <div className="absolute right-0 top-full mt-2 z-40 w-52 bg-surface border border-border-default rounded-2xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-txt-muted">
                      Sort by
                    </div>
                    {(
                      [
                        { id: "updated", label: "Updated" },
                        { id: "alphabetical", label: "A - Z" },
                        { id: "created", label: "Created" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          handleSortChange(opt.id);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer touch-manipulation ${
                          sortOption === opt.id
                            ? "bg-primary-light text-primary font-bold"
                            : "text-txt-main hover:bg-subtle"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {sortOption === opt.id && (
                          <Check size={15} className="stroke-[2.5]" />
                        )}
                      </button>
                    ))}

                    <div className="my-1.5 border-t border-border-subtle" />

                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-txt-muted">
                      View
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleViewModeChange("grid");
                        setIsFilterOpen(false);
                      }}
                      className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer touch-manipulation ${
                        viewMode === "grid"
                          ? "bg-primary-light text-primary font-bold"
                          : "text-txt-main hover:bg-subtle"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <LayoutGrid size={14} />
                        <span>Card View</span>
                      </span>
                      {viewMode === "grid" && (
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

                    <button
                      type="button"
                      onClick={() => {
                        handleViewModeChange("columns");
                        setIsFilterOpen(false);
                      }}
                      className={`hidden sm:flex w-full min-h-[44px] items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer touch-manipulation ${
                        viewMode === "columns"
                          ? "bg-primary-light text-primary font-bold"
                          : "text-txt-main hover:bg-subtle"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Columns2 size={14} />
                        <span>2-Column Grid</span>
                      </span>
                      {viewMode === "columns" && (
                        <Check size={15} className="stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Clean Search Trigger Icon */}
            {onOpenSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                className="relative w-9 h-9 rounded-full text-primary hover:bg-primary-light active:scale-95 transition-all cursor-pointer flex items-center justify-center touch-manipulation before:absolute before:-inset-1.5 before:content-['']"
                title="Search books"
                aria-label="Search books"
              >
                <Search size={18} />
              </button>
            )}

            {/* Admin Add Book Button */}
            {activeOrg?.role === "admin" && (
              <button
                type="button"
                onClick={() => setAddExpenseOpen(true)}
                className="relative btn-pill-primary min-h-[36px] cursor-pointer active:scale-95 transition-transform flex items-center gap-1 py-1.5 px-3 text-xs shrink-0 whitespace-nowrap touch-manipulation before:absolute before:-inset-1.5 before:content-['']"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Book List Container */}
      {isLoading ? (
        <div className={`${listContainerClass} animate-pulse`}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="w-full flex items-center justify-between px-3.5 sm:px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-slate-200/70 shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <div
                    className="h-4 bg-slate-200/70 rounded-md"
                    style={{ width: i % 2 === 0 ? "55%" : "70%" }}
                  />
                  <div className="h-3 w-24 bg-slate-100 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-4 w-14 bg-slate-200/70 rounded-md" />
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15" />
                <div className="w-7 h-7 rounded-lg bg-rose-500/15" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedExpenses.length === 0 ? (
        <div className="mx-4 sm:mx-0 flex flex-col items-center justify-center p-8 bg-surface border border-dashed border-border-default rounded-2xl text-center gap-3 my-1 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center">
            {isSearchActive ? <Search size={22} /> : <BookOpen size={22} />}
          </div>
          <div className="text-sm font-bold text-txt-main">
            {isSearchActive ? "No matching books found" : "No books created yet"}
          </div>
          <p className="text-xs text-txt-muted max-w-xs">
            {isSearchActive
              ? "Try a different book name or clear the search filter."
              : 'Create books like "January expenses", "Groceries", or "Savings".'}
          </p>
          {!isSearchActive && activeOrg?.role === "admin" && (
            <button
              type="button"
              onClick={() => setAddExpenseOpen(true)}
              className="mt-1 btn-pill-primary cursor-pointer"
            >
              <Plus size={15} />
              <span>Create First Book</span>
            </button>
          )}
        </div>
      ) : (
        <div className={listContainerClass}>
          {openMenuId && (
            <div
              className="fixed inset-0 z-30"
              onClick={() => setOpenMenuId(null)}
            />
          )}
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
              isMenuOpen={openMenuId === expense.id}
              onToggleMenu={() =>
                setOpenMenuId((prev) =>
                  prev === expense.id ? null : expense.id
                )
              }
              onCloseMenu={() => setOpenMenuId(null)}
              onOpenInfo={(totals) =>
                setInfoTarget({ expense, ...totals })
              }
              onOpenEdit={() => setEditingExpense(expense)}
            />
          ))}
        </div>
      )}

      {/* Book Information Modal (from 3-dot dropdown) */}
      <BookDetailsModal
        isOpen={Boolean(infoTarget)}
        onClose={() => setInfoTarget(null)}
        expense={
          infoTarget
            ? {
                id: infoTarget.expense.id,
                title: infoTarget.expense.title,
                category: infoTarget.expense.category,
                totalSpent: infoTarget.expense.totalSpent,
                logCount: infoTarget.expense.logCount,
                isArchived: Boolean(infoTarget.expense.isArchived),
                createdAt: infoTarget.expense.createdAt,
                updatedAt: infoTarget.expense.updatedAt,
                createdByName: infoTarget.expense.createdByName,
                updatedByName: infoTarget.expense.updatedByName,
              }
            : null
        }
        currency={currency}
        totalInPaisa={infoTarget?.totalInPaisa}
        totalOutPaisa={infoTarget?.totalOutPaisa}
        netBalancePaisa={infoTarget?.netBalancePaisa}
        canEdit={canEditBook}
        onEdit={() => {
          if (infoTarget) {
            setEditingExpense(infoTarget.expense);
            setInfoTarget(null);
          }
        }}
      />

      {/* Book Settings Modal (Edit / Archive / Delete via 3-dot icon) */}
      {activeOrg && (
        <EditExpenseModal
          isOpen={Boolean(editingExpense)}
          onClose={() => setEditingExpense(null)}
          onUpdated={() => {
            onBookUpdated?.();
          }}
          orgId={activeOrg.id}
          expense={
            editingExpense
              ? {
                  id: editingExpense.id,
                  title: editingExpense.title,
                  category: editingExpense.category,
                  logCount: editingExpense.logCount,
                  isArchived: Boolean(editingExpense.isArchived),
                }
              : null
          }
        />
      )}
    </div>
  );
}
