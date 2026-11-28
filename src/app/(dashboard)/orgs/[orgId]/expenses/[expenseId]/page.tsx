"use client";

import React, { useState, useEffect, useCallback, useMemo, use, useRef } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import QuickAddLogModal from "@/components/dashboard/QuickAddLogModal";
import EditLogModal from "@/components/dashboard/EditLogModal";
import EditExpenseModal from "@/components/dashboard/EditExpenseModal";
import LogDetailsModal from "@/components/dashboard/LogDetailsModal";
import BookDetailsModal from "@/components/dashboard/BookDetailsModal";
import { useAppStore } from "@/store/app-store";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
import { confirmDialog } from "@/store/confirm-store";
import { localDb, LocalDailyLog } from "@/lib/local-db";
import { enqueueSyncItem } from "@/lib/sync-service";
import { formatCleanAmount, formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/categories";
import {
  Archive,
  ArrowLeft,
  Calendar,
  ChevronDown,
  Edit2,
  Filter,
  Image as ImageIcon,
  Info,
  Minus,
  MoreVertical,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  X,
} from "lucide-react";

type PageProps = {
  params: Promise<{ orgId: string; expenseId: string }>;
};

export default function ExpenseDetailPage({ params }: PageProps) {
  const { orgId, expenseId } = use(params);
  const {
    activeOrg,
    setActiveOrg,
    setActiveExpenseId,
    setLogType,
    setAddLogOpen,
  } = useAppStore();

  const {
    canAddTransaction,
    canEditTransaction,
    canDeleteTransaction,
    canEditBook,
  } = useOrgPermissions();

  // 1. Reactive Dexie queries (0ms Instant Load)
  const cachedExpense = useLiveQuery(
    () => localDb.expenses.get(expenseId),
    [expenseId]
  );

  const cachedLogs = useLiveQuery(
    () =>
      localDb.dailyLogs
        .where("expenseId")
        .equals(expenseId)
        .toArray(),
    [expenseId]
  );

  // Fallback states for server SWR
  const [serverExpense, setServerExpense] = useState<{
    id: string;
    orgId: string;
    title: string;
    category?: string;
    totalSpent: string | number;
    logCount: number;
    isArchived: boolean;
  } | null>(null);

  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [pageSize, setPageSize] = useState<number | "All">(10);
  const [isLimitFiltered, setIsLimitFiltered] = useState<boolean>(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [isBookDetailsOpen, setIsBookDetailsOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<LocalDailyLog | null>(null);
  const [viewingLog, setViewingLog] = useState<LocalDailyLog | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const datePopoverRef = useRef<HTMLDivElement>(null);
  const currency = activeOrg?.currency || "USD";

  // Effective expense and logs (Dexie has priority for 0ms, server augments)
  const expense = cachedExpense || serverExpense;
  const rawLogs = cachedLogs ?? [];

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
      if (datePopoverRef.current && !datePopoverRef.current.contains(event.target as Node)) {
        setIsDatePopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync activeOrg with route param if mismatched or null
  useEffect(() => {
    if (!activeOrg || activeOrg.id !== orgId) {
      fetch(`/api/v1/orgs/${orgId}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((res) => {
          if (res?.data) {
            setActiveOrg({
              id: res.data.id,
              name: res.data.name,
              currency: res.data.currency || "USD",
              role: res.data.role || "admin",
            });
          }
        })
        .catch(console.error);
    }
  }, [orgId, activeOrg, setActiveOrg]);

  // Background SWR delta fetch to ensure server parity
  const refreshServerData = useCallback(async () => {
    try {
      const [expRes, logsRes] = await Promise.all([
        fetch(`/api/v1/orgs/${orgId}/expenses/${expenseId}?t=${Date.now()}`, {
          cache: "no-store",
        }),
        fetch(
          `/api/v1/orgs/${orgId}/expenses/${expenseId}/logs?limit=100&t=${Date.now()}`,
          { cache: "no-store" }
        ),
      ]);

      if (expRes.ok) {
        const { data } = await expRes.json();
        setServerExpense(data);
        // Sync into Dexie cache
        await localDb.expenses.put({
          id: data.id,
          orgId: data.orgId,
          title: data.title,
          category: data.category || "General",
          totalSpent: Number(data.totalSpent) || 0,
          logCount: data.logCount || 0,
          isArchived: Boolean(data.isArchived),
          createdBy: data.createdBy || "user",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          syncStatus: "synced",
        });
      }

      if (logsRes.ok) {
        const { data } = await logsRes.json();
        const items = data.items || [];
        // Bulk upsert into Dexie cache
        for (const item of items) {
          await localDb.dailyLogs.put({
            id: item.id,
            orgId,
            expenseId,
            type: item.type || (item.note.startsWith("[IN]") ? "in" : "out"),
            category: item.category || "General",
            amountPaisa: item.amountPaisa,
            note: item.note,
            logDate: item.logDate,
            fiscalYear: item.fiscalYear,
            fiscalMonth: item.fiscalMonth,
            attachments: item.attachments || [],
            loggedBy: item.loggedBy || "user",
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            syncStatus: "synced",
          });
        }
      }
    } catch (err) {
      console.warn("Background SWR refresh error:", err);
    }
  }, [orgId, expenseId]);

  useEffect(() => {
    refreshServerData();
  }, [refreshServerData]);

  // Quick date presets helper for Shadcn-style picker
  function getPresetDates(preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "last30") {
    const now = new Date();
    const formatYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const todayStr = formatYmd(now);

    if (preset === "today") {
      return { from: todayStr, to: todayStr };
    }
    if (preset === "yesterday") {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const yestStr = formatYmd(yest);
      return { from: yestStr, to: yestStr };
    }
    if (preset === "thisWeek") {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return { from: formatYmd(monday), to: todayStr };
    }
    if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatYmd(firstDay), to: todayStr };
    }
    if (preset === "last30") {
      const past = new Date(now);
      past.setDate(now.getDate() - 30);
      return { from: formatYmd(past), to: todayStr };
    }
    return { from: "", to: "" };
  }

  // Deterministic multi-tier chronological sorting:
  // Primary: logDate DESC (latest calendar date first)
  // Secondary: createdAt DESC (latest entry timestamp with milliseconds first)
  // Tertiary: id DESC (deterministic tie-breaker)
  const chronologicallySortedLogs = useMemo(() => {
    if (!rawLogs || rawLogs.length === 0) return [];
    return [...rawLogs].sort((a, b) => {
      // 1. Primary: compare calendar date (YYYY-MM-DD)
      const dateComparison = (b.logDate || "").localeCompare(a.logDate || "");
      if (dateComparison !== 0) return dateComparison;

      // 2. Secondary: compare creation timestamp (ISO 8601)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const safeTimeA = Number.isNaN(timeA) ? 0 : timeA;
      const safeTimeB = Number.isNaN(timeB) ? 0 : timeB;
      if (safeTimeB !== safeTimeA) return safeTimeB - safeTimeA;

      // 3. Fallback tie-breaker
      return (b.id || "").localeCompare(a.id || "");
    });
  }, [rawLogs]);

  // 1. Date Range Filtered Logs
  const dateFilteredLogs = useMemo(() => {
    return chronologicallySortedLogs.filter((log) => {
      if (fromDate && log.logDate < fromDate) return false;
      if (toDate && log.logDate > toDate) return false;
      return true;
    });
  }, [chronologicallySortedLogs, fromDate, toDate]);

  // 2. Category Filter
  const categoryFilteredLogs = useMemo(() => {
    return dateFilteredLogs.filter((log) => {
      if (selectedCategoryFilter === "All") return true;
      return (
        (log.category || "General").toLowerCase() ===
        selectedCategoryFilter.toLowerCase()
      );
    });
  }, [dateFilteredLogs, selectedCategoryFilter]);

  // 3. Page Size Limit
  const paginatedLogs = useMemo(() => {
    return pageSize === "All"
      ? categoryFilteredLogs
      : categoryFilteredLogs.slice(0, Number(pageSize));
  }, [categoryFilteredLogs, pageSize]);

  // Determine if active filter is applied
  const isFilterActive = Boolean(
    fromDate ||
    toDate ||
    selectedCategoryFilter !== "All" ||
    isLimitFiltered
  );

  // Top Calculation (O(N) single-pass memoized summary):
  // - If NO filter is applied: calculates the overall whole ledger (all-time)
  // - If ANY filter (date range, category, or selected limit) is applied: calculates ONLY for that filtered subset
  const logsForSummary = isFilterActive ? paginatedLogs : rawLogs;

  const { totalInPaisa, totalOutPaisa, netBalancePaisa } = useMemo(() => {
    let inPaisa = 0;
    let outPaisa = 0;
    for (const l of logsForSummary) {
      let isIn = l.type === "in";
      if (!l.type) {
        const lower = (l.note || "").toLowerCase();
        isIn =
          lower.startsWith("[in]") ||
          lower.includes("freelance") ||
          lower.includes("salary") ||
          lower.includes("income") ||
          lower.includes("cash in");
      }
      if (isIn) {
        inPaisa += l.amountPaisa || 0;
      } else {
        outPaisa += l.amountPaisa || 0;
      }
    }
    return {
      totalInPaisa: inPaisa,
      totalOutPaisa: outPaisa,
      netBalancePaisa: inPaisa - outPaisa,
    };
  }, [logsForSummary]);

  // Clear all filters handler
  function handleClearAllFilters() {
    setFromDate("");
    setToDate("");
    setSelectedCategoryFilter("All");
    setPageSize(10);
    setIsLimitFiltered(false);
  }

  // Formatted date range label for Shadcn-style trigger button
  const dateRangeLabel = useMemo(() => {
    if (!fromDate && !toDate) return "Date range";
    if (fromDate && toDate) {
      if (fromDate === toDate) return formatDate(fromDate);
      return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
    }
    if (fromDate) return `From ${formatDate(fromDate)}`;
    return `Until ${formatDate(toDate)}`;
  }, [fromDate, toDate]);

  // Extract distinct categories present in this ledger
  const availableCategories = Array.from(
    new Set(rawLogs.map((l) => l.category || "General"))
  ).filter(Boolean);

  // Optimistic log deletion
  async function handleDeleteLog(logId: string) {
    if (!canDeleteTransaction) return;

    const confirmed = await confirmDialog({
      title: "Delete Transaction?",
      description: "Are you sure you want to delete this transaction? This action will adjust the book's net balance.",
      confirmText: "Delete",
      cancelText: "Keep",
      variant: "danger",
      icon: "trash",
    });
    if (!confirmed) return;

    const targetLog = rawLogs.find((l) => l.id === logId);
    try {
      await localDb.dailyLogs.delete(logId);
      if (expense && targetLog) {
        const signedAmt =
          targetLog.type === "in" ? targetLog.amountPaisa : -targetLog.amountPaisa;
        await localDb.expenses.update(expenseId, {
          totalSpent: (Number(expense.totalSpent) || 0) - signedAmt,
          logCount: Math.max(0, (expense.logCount || 1) - 1),
          updatedAt: new Date().toISOString(),
        });
      }

      if (navigator.onLine) {
        try {
          const res = await fetch(`/api/v1/orgs/${orgId}/logs/${logId}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            await enqueueSyncItem({
              entityType: "daily_log",
              entityId: logId,
              operation: "DELETE",
              orgId,
              payload: {},
            });
          }
          refreshServerData();
        } catch {
          await enqueueSyncItem({
            entityType: "daily_log",
            entityId: logId,
            operation: "DELETE",
            orgId,
            payload: {},
          });
        }
      } else {
        await enqueueSyncItem({
          entityType: "daily_log",
          entityId: logId,
          operation: "DELETE",
          orgId,
          payload: {},
        });
      }
    } catch (err) {
      console.error("Failed to delete log locally:", err);
    }
  }

  function handleOpenCashIn() {
    setActiveExpenseId(expenseId);
    setLogType("in");
    setAddLogOpen(true);
  }

  function handleOpenCashOut() {
    setActiveExpenseId(expenseId);
    setLogType("out");
    setAddLogOpen(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas pb-28">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border-subtle px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-txt-secondary hover:text-txt-main hover:bg-subtle active:scale-95 transition-all cursor-pointer touch-manipulation shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-base font-bold text-txt-main tracking-tight truncate max-w-[200px]">
              {expense?.title || "Book Ledger"}
            </h1>
          </div>

          <div className="flex items-center gap-1 relative" ref={menuRef}>
            <Link
              href={`/orgs/${orgId}/members`}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-txt-secondary hover:text-txt-main hover:bg-subtle active:scale-95 transition-all cursor-pointer touch-manipulation shrink-0"
              title="Team Members"
            >
              <UserPlus size={19} />
            </Link>

            {/* 3-Dot Action Menu with 48x48 Mobile Native Target */}
            <button
              type="button"
              onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-txt-secondary hover:text-txt-main hover:bg-subtle active:scale-95 transition-all cursor-pointer touch-manipulation shrink-0"
              title="More Options"
              aria-label="More Options"
            >
              <MoreVertical size={20} />
            </button>

            {/* Header Dropdown Popover */}
            {isHeaderMenuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-surface border border-border-default rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    setIsBookDetailsOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-txt-main hover:bg-subtle transition-colors text-left cursor-pointer"
                >
                  <Info size={15} className="text-primary" />
                  <span>Book Information</span>
                </button>
                {canEditBook && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        setIsEditExpenseOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-txt-main hover:bg-subtle transition-colors text-left cursor-pointer"
                    >
                      <Settings size={15} className="text-txt-secondary" />
                      <span>Edit Book Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        setIsEditExpenseOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-txt-main hover:bg-subtle transition-colors text-left cursor-pointer"
                    >
                      <Archive size={15} className="text-txt-secondary" />
                      <span>Archive / Delete</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto w-full px-4 pt-4 flex flex-col gap-5 flex-1">
        {/* Top Single Card (Modern Royal Blue Gradient, Matching Image 2) */}
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-blue-500/15 bg-linear-to-br from-blue-600 via-blue-500 to-blue-600 transition-all">
          {/* Decorative ambient blurred circles */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute right-12 -top-8 w-24 h-24 rounded-full bg-white/10 blur-lg pointer-events-none" />

          {/* Top Row: Current Balance label + Filter status tag + Trending Icon */}
          <div className="flex items-center justify-between mb-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-white/80">
                Current Balance
              </span>
              {isFilterActive && (
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold text-white backdrop-blur-xs">
                  Filtered ({logsForSummary.length})
                </span>
              )}
            </div>
            <div className="p-2 rounded-full bg-white/15 backdrop-blur-xs text-white">
              {netBalancePaisa >= 0 ? (
                <TrendingUp size={20} className="stroke-[2.5]" />
              ) : (
                <TrendingDown size={20} className="stroke-[2.5]" />
              )}
            </div>
          </div>

          {/* Middle: Big Balance Display */}
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans my-1 text-white relative z-10">
            {netBalancePaisa < 0 ? "-" : ""}
            {formatCurrency(Math.abs(netBalancePaisa) / 100, currency)}
          </div>

          {/* Bottom Row: Income & Expense inline breakdown */}
          <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-white/15 text-xs sm:text-sm text-white/90 font-medium relative z-10">
            <span>Income {formatCurrency(totalInPaisa / 100, currency)}</span>
            <span className="text-white/40">|</span>
            <span>Expense {formatCurrency(totalOutPaisa / 100, currency)}</span>
          </div>
        </div>

        {/* Transactions Section */}
        <div className="flex flex-col gap-3">
          {/* Header & Right Controls (Date Range & Limit Selector) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-txt-main tracking-tight">
                  Transactions
                </h2>
              </div>

              {/* Right Filter Controls */}
              <div className="flex items-center gap-1.5">
                {/* Global Clear Filters Button */}
                {isFilterActive && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-cash-out-light text-cash-out border border-cash-out-border hover:bg-cash-out-light/80 transition-all cursor-pointer shadow-2xs"
                    title="Clear all filters & restore overall whole calculation"
                  >
                    <RotateCcw size={11} />
                    <span>Clear</span>
                  </button>
                )}

                {/* Shadcn-style Single Date Range Button & Popover */}
                <div className="relative" ref={datePopoverRef}>
                  <button
                    type="button"
                    onClick={() => setIsDatePopoverOpen((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border shadow-2xs transition-all cursor-pointer ${
                      fromDate || toDate
                        ? "bg-primary-light/60 border-primary text-primary font-semibold"
                        : "bg-surface border-border-default text-txt-main hover:bg-subtle"
                    }`}
                  >
                    <Calendar
                      size={13}
                      className={fromDate || toDate ? "text-primary" : "text-txt-muted"}
                    />
                    <span className="truncate max-w-[130px] sm:max-w-none">
                      {dateRangeLabel}
                    </span>
                    <ChevronDown size={12} className="text-txt-muted" />
                  </button>

                  {/* Popover */}
                  {isDatePopoverOpen && (
                    <div className="absolute right-0 top-10 w-72 sm:w-80 bg-surface border border-border-default rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                        <span className="text-xs font-bold text-txt-main">
                          Filter by Date Range
                        </span>
                        {(fromDate || toDate) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFromDate("");
                              setToDate("");
                            }}
                            className="text-[11px] font-semibold text-cash-out hover:underline cursor-pointer"
                          >
                            Clear Date
                          </button>
                        )}
                      </div>

                      {/* Quick Presets */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: "Today", preset: "today" as const },
                          { label: "Yesterday", preset: "yesterday" as const },
                          { label: "This Week", preset: "thisWeek" as const },
                          { label: "This Month", preset: "thisMonth" as const },
                          { label: "Last 30 Days", preset: "last30" as const },
                        ].map(({ label, preset }) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              const { from, to } = getPresetDates(preset);
                              setFromDate(from);
                              setToDate(to);
                              setIsDatePopoverOpen(false);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium bg-subtle hover:bg-subtle/80 text-txt-secondary hover:text-txt-main transition-colors text-center cursor-pointer"
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Manual Inputs */}
                      <div className="flex flex-col gap-2 pt-1 border-t border-border-subtle">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[11px] font-medium text-txt-secondary w-12">
                            From:
                          </label>
                          <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="flex-1 bg-surface border border-border-default rounded-xl px-2.5 py-1 text-xs text-txt-main focus:outline-none focus:border-primary cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[11px] font-medium text-txt-secondary w-12">
                            To:
                          </label>
                          <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="flex-1 bg-surface border border-border-default rounded-xl px-2.5 py-1 text-xs text-txt-main focus:outline-none focus:border-primary cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                        <button
                          type="button"
                          onClick={() => setIsDatePopoverOpen(false)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Page Size / Entries Selector */}
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const val =
                      e.target.value === "All"
                        ? "All"
                        : Number(e.target.value);
                    setPageSize(val);
                    setIsLimitFiltered(val !== "All");
                  }}
                  className={`bg-surface border rounded-xl px-2.5 py-1.5 text-xs font-semibold shadow-2xs cursor-pointer focus:outline-none ${
                    isLimitFiltered
                      ? "border-primary text-primary"
                      : "border-border-default text-txt-main"
                  }`}
                  title="Transactions to show and calculate"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={1000}>1000</option>
                  <option value="All">All</option>
                </select>
              </div>
            </div>

            {/* Category Quick Filter Pills Bar (Clean Horizontal Scrollable, No Scrollbar) */}
            {availableCategories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("All")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategoryFilter === "All"
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface border border-border-default text-txt-secondary hover:text-txt-main"
                  }`}
                >
                  <Filter size={12} />
                  <span>All</span>
                </button>

                {availableCategories.map((cat) => {
                  const Icon = getCategoryIcon(cat);
                  const isSelected =
                    selectedCategoryFilter.toLowerCase() === cat.toLowerCase();
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-white shadow-xs"
                          : "bg-surface border border-border-default text-txt-secondary hover:text-txt-main"
                      }`}
                    >
                      <Icon size={12} />
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transaction List */}
          {paginatedLogs.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-dashed border-border-default rounded-3xl text-xs text-txt-muted shadow-sm">
              {rawLogs.length === 0
                ? "No transactions yet. Click \"+ Cash In\" or \"- Cash Out\" below."
                : `No transactions found matching the filter.`}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {paginatedLogs.map((log) => {
                const cleanAmount = formatCleanAmount(log.amountPaisa / 100);
                const hasReceipt =
                  log.attachments && log.attachments.length > 0;
                const isPositive =
                  log.type === "in" ||
                  (log.type !== "out" &&
                    (log.note.startsWith("[IN]") ||
                      log.note.toLowerCase().includes("income") ||
                      log.note.toLowerCase().includes("cash in")));

                const displayNote =
                  log.note.replace(/^\[IN\]\s*/, "").trim() ||
                  log.category ||
                  "Transaction";
                const CategoryIcon = getCategoryIcon(log.category);

                return (
                  <div
                    key={log.id}
                    onClick={() => setViewingLog(log)}
                    className="flex items-center justify-between p-3.5 bg-surface rounded-2xl transition-all hover:bg-subtle/70 border border-border-subtle/50 shadow-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {/* Category Icon Box */}
                      <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-border flex items-center justify-center shrink-0">
                        <CategoryIcon size={18} className="text-primary" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-txt-main block truncate group-hover:text-primary transition-colors">
                            {displayNote}
                          </span>
                          {log.category && log.category !== "General" && (
                            <span className="text-[10px] font-medium bg-subtle px-1.5 py-0.5 rounded-md text-txt-secondary truncate max-w-[80px]">
                              {log.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-txt-muted mt-0.5 flex-wrap">
                          <span>{formatDate(log.logDate).split(",")[0]}</span>
                          {log.createdAt && (
                            <>
                              <span>•</span>
                              <span>{formatTime(log.createdAt)}</span>
                            </>
                          )}
                          {log.loggedByName && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-txt-secondary">
                                {log.loggedByName}
                              </span>
                            </>
                          )}
                          {Boolean(log.updatedBy) && (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1 py-0.2 rounded">
                              Edited
                            </span>
                          )}
                          {hasReceipt && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveReceiptUrl(log.attachments![0].url);
                              }}
                              className="text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer ml-0.5"
                            >
                              <ImageIcon size={11} />
                              <span>Receipt</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-bold text-sm sm:text-base shrink-0 ${
                          isPositive ? "text-cash-in" : "text-cash-out"
                        }`}
                      >
                        {isPositive ? `+${cleanAmount}` : `-${cleanAmount}`}
                      </span>

                      {/* Edit Button (Admin/Editor only, 48x48 hit-box) */}
                      {canEditTransaction && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLog(log);
                          }}
                          className="relative min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-txt-muted hover:text-primary hover:bg-primary-light active:scale-90 transition-all cursor-pointer touch-manipulation before:absolute before:-inset-1.5 before:content-['']"
                          title="Edit Transaction"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}

                      {/* Delete Button (Admin/Editor only, 48x48 hit-box) */}
                      {canDeleteTransaction && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLog(log.id);
                          }}
                          className="relative min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-txt-muted hover:text-cash-out hover:bg-cash-out-light active:scale-90 transition-all cursor-pointer touch-manipulation before:absolute before:-inset-1.5 before:content-['']"
                          title="Delete Transaction"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Lightbox for Receipts */}
      {activeReceiptUrl && (
        <div
          onClick={() => setActiveReceiptUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-sm max-h-[85vh] bg-surface border border-border-default rounded-3xl p-3 shadow-2xl flex flex-col items-center"
          >
            <button
              onClick={() => setActiveReceiptUrl(null)}
              className="absolute right-3 top-3 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeReceiptUrl}
              alt="Receipt Attachment"
              className="max-h-[75vh] w-auto object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* Fixed Sticky Action Bar at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border-subtle p-3 px-4 safe-area-pb">
        <div className="max-w-xl mx-auto flex gap-3">
          {canAddTransaction ? (
            <>
              {/* Green Cash In Button (48px mobile touch height) */}
              <button
                onClick={handleOpenCashIn}
                className="btn-cash-in flex-1 min-h-[48px] py-3 text-sm font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 rounded-2xl touch-manipulation shadow-sm cursor-pointer"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>Cash In</span>
              </button>

              {/* Red Cash Out Button (48px mobile touch height) */}
              <button
                onClick={handleOpenCashOut}
                className="btn-cash-out flex-1 min-h-[48px] py-3 text-sm font-bold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 rounded-2xl touch-manipulation shadow-sm cursor-pointer"
              >
                <Minus size={18} strokeWidth={2.5} />
                <span>Cash Out</span>
              </button>
            </>
          ) : (
            <div className="w-full py-2.5 px-4 rounded-xl bg-subtle border border-border-default text-center text-xs font-medium text-txt-muted flex items-center justify-center gap-2">
              <Info size={14} className="text-primary" />
              <span>Viewing mode: You have read-only access to this book.</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Log Modal */}
      <QuickAddLogModal
        onLogged={refreshServerData}
        fixedExpenseId={expenseId}
        expenseTitle={expense?.title}
        orgId={orgId}
      />

      {/* Edit Log Modal */}
      <EditLogModal
        isOpen={Boolean(editingLog)}
        onClose={() => setEditingLog(null)}
        onUpdated={refreshServerData}
        orgId={orgId}
        expenseId={expenseId}
        log={editingLog}
      />

      {/* Edit Expense Ledger Modal */}
      <EditExpenseModal
        isOpen={isEditExpenseOpen}
        onClose={() => setIsEditExpenseOpen(false)}
        onUpdated={() => refreshServerData()}
        orgId={orgId}
        expense={
          expense
            ? {
                id: expense.id,
                title: expense.title,
                category: expense.category,
                logCount: expense.logCount,
                isArchived: expense.isArchived,
              }
            : null
        }
      />

      {/* View Transaction Details Modal */}
      <LogDetailsModal
        isOpen={Boolean(viewingLog)}
        onClose={() => setViewingLog(null)}
        log={viewingLog}
        currency={currency}
        canEdit={activeOrg?.role === "admin"}
        onEdit={() => {
          if (viewingLog) {
            setEditingLog(viewingLog);
            setViewingLog(null);
          }
        }}
        onDelete={() => {
          if (viewingLog) {
            handleDeleteLog(viewingLog.id);
            setViewingLog(null);
          }
        }}
      />

      {/* View Book Details Modal */}
      <BookDetailsModal
        isOpen={isBookDetailsOpen}
        onClose={() => setIsBookDetailsOpen(false)}
        expense={expense}
        currency={currency}
        totalInPaisa={totalInPaisa}
        totalOutPaisa={totalOutPaisa}
        netBalancePaisa={netBalancePaisa}
        canEdit={activeOrg?.role === "admin"}
        onEdit={() => {
          setIsBookDetailsOpen(false);
          setIsEditExpenseOpen(true);
        }}
      />
    </div>
  );
}
