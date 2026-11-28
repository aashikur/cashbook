"use client";

import React, { useState, useEffect, useCallback, useMemo, use, useRef } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import QuickAddLogModal from "@/components/dashboard/QuickAddLogModal";
import EditLogModal from "@/components/dashboard/EditLogModal";
import EditExpenseModal from "@/components/dashboard/EditExpenseModal";
import LogDetailsModal from "@/components/dashboard/LogDetailsModal";
import BookDetailsModal from "@/components/dashboard/BookDetailsModal";
import BookActionsMenu from "@/components/dashboard/BookActionsMenu";
import LedgerSummaryCard from "@/components/dashboard/LedgerSummaryCard";
import ExportStatementModal from "@/components/dashboard/ExportStatementModal";
import { useAppStore } from "@/store/app-store";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
import { confirmDialog } from "@/store/confirm-store";
import { localDb, LocalDailyLog } from "@/lib/local-db";
import { enqueueSyncItem } from "@/lib/sync-service";
import {
  formatCleanAmount,
  formatDate,
  formatTime,
  isLogCashIn,
} from "@/lib/utils";
import {
  Archive,
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Edit2,
  FileText,
  Image as ImageIcon,
  Info,
  Minus,
  MoreVertical,
  Plus,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
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
  // Return null when absent so undefined strictly represents "Dexie still loading"
  const cachedExpense = useLiveQuery(
    async () => {
      const found = await localDb.expenses.get(expenseId);
      return found ?? null;
    },
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
  const [hasFetchedServer, setHasFetchedServer] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [entryTypeFilter, setEntryTypeFilter] = useState<"all" | "in" | "out">("all");
  const [memberFilter, setMemberFilter] = useState<string>("All");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [pageSize, setPageSize] = useState<number | "All">("All");
  const [isLimitFiltered, setIsLimitFiltered] = useState<boolean>(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [isEntryTypeOpen, setIsEntryTypeOpen] = useState(false);
  const [isMemberOpen, setIsMemberOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [isBookDetailsOpen, setIsBookDetailsOpen] = useState(false);
  const [isLimitOpen, setIsLimitOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<LocalDailyLog | null>(null);
  const [viewingLog, setViewingLog] = useState<LocalDailyLog | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const datePopoverRef = useRef<HTMLDivElement>(null);
  const entryTypeRef = useRef<HTMLDivElement>(null);
  const memberRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const limitRef = useRef<HTMLDivElement>(null);
  const currency = activeOrg?.currency || "USD";

  // Effective expense and logs (Dexie has priority for 0ms, server augments)
  const expense = cachedExpense || serverExpense;
  const rawLogs = useMemo(() => cachedLogs ?? [], [cachedLogs]);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsHeaderMenuOpen(false);
      }
      if (datePopoverRef.current && !datePopoverRef.current.contains(target)) {
        setIsDatePopoverOpen(false);
      }
      if (entryTypeRef.current && !entryTypeRef.current.contains(target)) {
        setIsEntryTypeOpen(false);
      }
      if (memberRef.current && !memberRef.current.contains(target)) {
        setIsMemberOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(target)) {
        setIsCategoryOpen(false);
      }
      if (limitRef.current && !limitRef.current.contains(target)) {
        setIsLimitOpen(false);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const [expRes, logsRes] = await Promise.all([
        fetch(`/api/v1/orgs/${orgId}/expenses/${expenseId}?t=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal,
        }),
        fetch(
          `/api/v1/orgs/${orgId}/expenses/${expenseId}/logs?limit=100&t=${Date.now()}`,
          { cache: "no-store", signal: controller.signal }
        ),
      ]);

      if (expRes.status === 401) {
        window.location.href = "/sign-in";
        return;
      }

      if (expRes.ok) {
        const { data } = await expRes.json();
        setServerExpense(data);
        setIsNotFound(false);
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
      } else if (expRes.status === 404 || expRes.status === 403) {
        setIsNotFound(true);
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
    } finally {
      clearTimeout(timeoutId);
      setHasFetchedServer(true);
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

  // O(N) chronological running balance map (oldest -> newest)
  const runningBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (chronologicallySortedLogs.length === 0) return map;
    let running = 0;
    for (let i = chronologicallySortedLogs.length - 1; i >= 0; i--) {
      const log = chronologicallySortedLogs[i];
      running += isLogCashIn(log) ? log.amountPaisa || 0 : -(log.amountPaisa || 0);
      map.set(log.id, running);
    }
    return map;
  }, [chronologicallySortedLogs]);

  // Unified multi-criteria filter (date, entry type, member, category, search)
  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return chronologicallySortedLogs.filter((log) => {
      if (fromDate && log.logDate < fromDate) return false;
      if (toDate && log.logDate > toDate) return false;

      if (entryTypeFilter !== "all") {
        const isIn = isLogCashIn(log);
        if (entryTypeFilter === "in" && !isIn) return false;
        if (entryTypeFilter === "out" && isIn) return false;
      }

      if (memberFilter !== "All") {
        const memberName = log.loggedByName || "You";
        if (memberName.toLowerCase() !== memberFilter.toLowerCase()) return false;
      }

      if (selectedCategoryFilter !== "All") {
        if (
          (log.category || "General").toLowerCase() !==
          selectedCategoryFilter.toLowerCase()
        ) {
          return false;
        }
      }

      if (query) {
        const cleanNote = (log.note || "").replace(/^\[IN\]\s*/, "").toLowerCase();
        const cat = (log.category || "").toLowerCase();
        const amtStr = formatCleanAmount((log.amountPaisa || 0) / 100).toLowerCase();
        const rawAmtStr = String((log.amountPaisa || 0) / 100);
        if (
          !cleanNote.includes(query) &&
          !cat.includes(query) &&
          !amtStr.includes(query) &&
          !rawAmtStr.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    chronologicallySortedLogs,
    fromDate,
    toDate,
    entryTypeFilter,
    memberFilter,
    selectedCategoryFilter,
    searchQuery,
  ]);

  // Page Size Limit
  const paginatedLogs = useMemo(() => {
    return pageSize === "All"
      ? filteredLogs
      : filteredLogs.slice(0, Number(pageSize));
  }, [filteredLogs, pageSize]);

  // Group paginated logs by calendar date (e.g. "21 May 2025")
  const groupedLogs = useMemo(() => {
    const groups: Array<{ dateKey: string; label: string; items: LocalDailyLog[] }> = [];
    const groupMap = new Map<string, LocalDailyLog[]>();

    for (const log of paginatedLogs) {
      const key = log.logDate || "Unknown";
      let list = groupMap.get(key);
      if (!list) {
        list = [];
        groupMap.set(key, list);
        let label = key;
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
          const [y, m, d] = key.split("-").map(Number);
          label = new Date(y, m - 1, d).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        }
        groups.push({ dateKey: key, label, items: list });
      }
      list.push(log);
    }

    return groups;
  }, [paginatedLogs]);

  // Determine if active filter is applied
  const isFilterActive = Boolean(
    searchQuery.trim() ||
    fromDate ||
    toDate ||
    entryTypeFilter !== "all" ||
    memberFilter !== "All" ||
    selectedCategoryFilter !== "All" ||
    isLimitFiltered
  );

  // Top Calculation (O(N) single-pass memoized summary):
  // - If NO filter is applied: calculates the overall whole ledger (all-time)
  // - If ANY filter is applied: calculates ONLY for that filtered subset
  const logsForSummary = isFilterActive ? paginatedLogs : rawLogs;

  const { totalInPaisa, totalOutPaisa, netBalancePaisa } = useMemo(() => {
    let inPaisa = 0;
    let outPaisa = 0;
    for (const l of logsForSummary) {
      if (isLogCashIn(l)) {
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
    setSearchQuery("");
    setFromDate("");
    setToDate("");
    setEntryTypeFilter("all");
    setMemberFilter("All");
    setSelectedCategoryFilter("All");
    setPageSize("All");
    setIsLimitFiltered(false);
  }

  // Formatted date range label
  const dateRangeLabel = useMemo(() => {
    if (!fromDate && !toDate) return "Select Date";
    if (fromDate && toDate) {
      if (fromDate === toDate) return formatDate(fromDate);
      return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
    }
    if (fromDate) return `From ${formatDate(fromDate)}`;
    return `Until ${formatDate(toDate)}`;
  }, [fromDate, toDate]);

  // Extract distinct categories and members present in this ledger
  const availableCategories = useMemo(
    () =>
      Array.from(new Set(rawLogs.map((l) => l.category || "General"))).filter(
        Boolean
      ),
    [rawLogs]
  );

  const availableMembers = useMemo(
    () =>
      Array.from(
        new Set(rawLogs.map((l) => l.loggedByName || "You"))
      ).filter(Boolean),
    [rawLogs]
  );

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

  // Tri-state loading: show skeleton while Dexie & initial server fetch are resolving
  const isPageLoading = !expense && !hasFetchedServer;
  const isLogsLoading =
    cachedLogs === undefined || (rawLogs.length === 0 && !hasFetchedServer);

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas pb-28">
        <header className="sticky top-0 z-40 bg-surface border-b border-border-subtle px-4 py-3">
          <div className="max-w-xl mx-auto flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200/70" />
              <div className="h-5 w-36 bg-slate-200/70 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-200/70" />
              <div className="w-10 h-10 rounded-full bg-slate-200/70" />
            </div>
          </div>
        </header>
        <main className="max-w-xl mx-auto w-full px-4 pt-5 flex flex-col gap-5 flex-1 animate-pulse">
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 rounded-2xl bg-blue-500/20" />
            <div className="h-24 rounded-2xl bg-rose-500/20" />
          </div>
          <div className="h-16 rounded-2xl bg-surface border border-border-subtle" />
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-surface border border-border-subtle/50"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (hasFetchedServer && !expense && isNotFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-canvas text-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-primary-light border border-primary-border flex items-center justify-center text-primary shadow-sm">
          <Info size={30} />
        </div>
        <h1 className="text-xl font-bold text-txt-main tracking-tight">
          Book Not Found
        </h1>
        <p className="text-xs text-txt-secondary max-w-xs">
          This ledger book does not exist, has been deleted, or you do not have access to it.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-xs font-semibold text-white shadow-sm transition-all"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas pb-28">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border-subtle">
        <div className="max-w-xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              href="/dashboard"
              className="w-11 h-11 rounded-full flex items-center justify-center text-txt-main hover:bg-subtle active:scale-95 transition-all cursor-pointer touch-manipulation shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft size={20} />
            </Link>
            <button
              type="button"
              onClick={() =>
                canEditBook
                  ? setIsEditExpenseOpen(true)
                  : setIsBookDetailsOpen(true)
              }
              className="flex flex-col items-start text-left min-w-0 py-0.5 px-1 rounded-lg hover:bg-subtle/60 transition-colors cursor-pointer"
            >
              <h1 className="text-base font-bold text-txt-main tracking-tight truncate max-w-[180px] sm:max-w-[260px] leading-tight">
                {expense?.title || "Book Ledger"}
              </h1>
              <span className="text-[11px] text-txt-muted truncate leading-tight">
                Tap here for Book settings
              </span>
            </button>
          </div>

          <div className="flex items-center gap-0.5 relative shrink-0" ref={menuRef}>
            <Link
              href={`/orgs/${orgId}/members`}
              className="w-11 h-11 rounded-full flex items-center justify-center text-primary hover:bg-primary-light active:scale-95 transition-all cursor-pointer touch-manipulation shrink-0"
              title="Team Members"
            >
              <UserPlus size={19} />
            </Link>

            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="w-11 h-11 rounded-full flex items-center justify-center text-primary hover:bg-primary-light active:scale-95 transition-all cursor-pointer touch-manipulation shrink-0"
              title="Export PDF / CSV Statement"
              aria-label="Export PDF Statement"
            >
              <FileText size={19} />
            </button>

            {/* 3-Dot Action Menu with 48x48 Mobile Native Target */}
            <button
              type="button"
              onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
              className="w-11 h-11 rounded-full flex items-center justify-center text-primary hover:bg-primary-light active:scale-95 transition-all cursor-pointer touch-manipulation shrink-0"
              title="More Options"
              aria-label="More Options"
            >
              <MoreVertical size={20} />
            </button>

            {/* Header Dropdown Popover (Shared 48x48px Menu) */}
            <BookActionsMenu
              isOpen={isHeaderMenuOpen}
              onClose={() => setIsHeaderMenuOpen(false)}
              canEdit={canEditBook}
              onOpenInfo={() => setIsBookDetailsOpen(true)}
              onOpenEdit={() => setIsEditExpenseOpen(true)}
              positionClass="right-0 top-12"
            />
          </div>
        </div>

        {/* Reference-style Search Bar */}
        <div className="border-t border-border-subtle bg-surface">
          <div className="max-w-xl mx-auto px-4 py-2 flex items-center gap-2.5">
            <Search size={17} className="text-primary shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by remark or amount"
              className="flex-1 bg-transparent text-sm text-txt-main placeholder:text-txt-muted focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="w-7 h-7 rounded-full flex items-center justify-center text-txt-muted hover:text-txt-main hover:bg-subtle cursor-pointer"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto w-full px-0 sm:px-4 pt-3 flex flex-col gap-3.5 flex-1">
        {/* Horizontal Filter Chips Row (Reference UI Style) */}
        <div className="px-4 sm:px-0 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Filter / Reset Icon Chip */}
          <button
            type="button"
            onClick={() => {
              if (isFilterActive) handleClearAllFilters();
            }}
            className={`relative shrink-0 h-9 px-3 rounded-full border flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
              isFilterActive
                ? "bg-primary-light border-primary text-primary"
                : "bg-surface border-border-default text-primary hover:bg-subtle"
            }`}
            title={isFilterActive ? "Reset all filters" : "Filters"}
          >
            <SlidersHorizontal size={14} />
            {isFilterActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>

          {/* Select Date Chip & Popover */}
          <div className="relative shrink-0" ref={datePopoverRef}>
            <button
              type="button"
              onClick={() => {
                setIsDatePopoverOpen((prev) => !prev);
                setIsEntryTypeOpen(false);
                setIsMemberOpen(false);
                setIsCategoryOpen(false);
              }}
              className={`h-9 flex items-center gap-1.5 px-3 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                fromDate || toDate
                  ? "bg-primary-light border-primary text-primary font-semibold"
                  : "bg-surface border-border-default text-txt-main hover:bg-subtle"
              }`}
            >
              <Calendar
                size={13}
                className={fromDate || toDate ? "text-primary" : "text-txt-muted"}
              />
              <span className="truncate max-w-[120px]">{dateRangeLabel}</span>
              <ChevronDown size={13} className="text-txt-muted" />
            </button>

            {isDatePopoverOpen && (
              <div className="fixed sm:absolute left-4 sm:left-0 right-4 sm:right-auto top-36 sm:top-11 w-auto sm:w-80 bg-surface border border-border-default rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-3">
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
                      className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium bg-subtle hover:bg-subtle/80 text-txt-secondary hover:text-txt-main transition-colors text-center cursor-pointer touch-manipulation"
                    >
                      {label}
                    </button>
                  ))}
                </div>

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
                    className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer touch-manipulation"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Entry Type Chip & Popover */}
          <div className="relative shrink-0" ref={entryTypeRef}>
            <button
              type="button"
              onClick={() => {
                setIsEntryTypeOpen((prev) => !prev);
                setIsDatePopoverOpen(false);
                setIsMemberOpen(false);
                setIsCategoryOpen(false);
              }}
              className={`h-9 flex items-center gap-1.5 px-3 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                entryTypeFilter !== "all"
                  ? "bg-primary-light border-primary text-primary font-semibold"
                  : "bg-surface border-border-default text-txt-main hover:bg-subtle"
              }`}
            >
              <span>
                {entryTypeFilter === "all"
                  ? "Entry Type"
                  : entryTypeFilter === "in"
                    ? "Cash In (+)"
                    : "Cash Out (-)"}
              </span>
              <ChevronDown size={13} className="text-txt-muted" />
            </button>

            {isEntryTypeOpen && (
              <div className="fixed left-4 right-4 top-36 w-auto sm:absolute sm:left-0 sm:right-auto sm:top-11 sm:w-52 bg-surface border border-border-default rounded-3xl sm:rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                {(
                  [
                    { value: "all", label: "All Entries" },
                    { value: "in", label: "Cash In (+)" },
                    { value: "out", label: "Cash Out (-)" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setEntryTypeFilter(opt.value);
                      setIsEntryTypeOpen(false);
                    }}
                    className="w-full min-h-[48px] flex items-center justify-between px-4 py-2.5 text-sm sm:text-xs font-medium text-txt-main hover:bg-subtle cursor-pointer touch-manipulation"
                  >
                    <span>{opt.label}</span>
                    {entryTypeFilter === opt.value && (
                      <Check size={14} className="text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Member Chip & Popover */}
          <div className="relative shrink-0" ref={memberRef}>
            <button
              type="button"
              onClick={() => {
                setIsMemberOpen((prev) => !prev);
                setIsDatePopoverOpen(false);
                setIsEntryTypeOpen(false);
                setIsCategoryOpen(false);
              }}
              className={`h-9 flex items-center gap-1.5 px-3 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                memberFilter !== "All"
                  ? "bg-primary-light border-primary text-primary font-semibold"
                  : "bg-surface border-border-default text-txt-main hover:bg-subtle"
              }`}
            >
              <span className="truncate max-w-[100px]">
                {memberFilter === "All" ? "Member" : memberFilter}
              </span>
              <ChevronDown size={13} className="text-txt-muted" />
            </button>

            {isMemberOpen && (
              <div className="fixed left-4 right-4 top-36 w-auto sm:absolute sm:left-0 sm:right-auto sm:top-11 sm:w-52 bg-surface border border-border-default rounded-3xl sm:rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
                {["All", ...availableMembers].map((mem) => (
                  <button
                    key={mem}
                    type="button"
                    onClick={() => {
                      setMemberFilter(mem);
                      setIsMemberOpen(false);
                    }}
                    className="w-full min-h-[48px] flex items-center justify-between px-4 py-2.5 text-sm sm:text-xs font-medium text-txt-main hover:bg-subtle cursor-pointer touch-manipulation"
                  >
                    <span className="truncate">
                      {mem === "All" ? "All Members" : mem}
                    </span>
                    {memberFilter === mem && (
                      <Check size={14} className="text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category Chip & Popover */}
          {availableCategories.length > 0 && (
            <div className="relative shrink-0" ref={categoryRef}>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryOpen((prev) => !prev);
                  setIsDatePopoverOpen(false);
                  setIsEntryTypeOpen(false);
                  setIsMemberOpen(false);
                }}
                className={`h-9 flex items-center gap-1.5 px-3 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategoryFilter !== "All"
                    ? "bg-primary-light border-primary text-primary font-semibold"
                    : "bg-surface border-border-default text-txt-main hover:bg-subtle"
                }`}
              >
                <span className="truncate max-w-[100px]">
                  {selectedCategoryFilter === "All"
                    ? "Category"
                    : selectedCategoryFilter}
                </span>
                <ChevronDown size={13} className="text-txt-muted" />
              </button>

              {isCategoryOpen && (
                <div className="fixed left-4 right-4 top-36 w-auto sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-52 bg-surface border border-border-default rounded-3xl sm:rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
                  {["All", ...availableCategories].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryFilter(cat);
                        setIsCategoryOpen(false);
                      }}
                      className="w-full min-h-[48px] flex items-center justify-between px-4 py-2.5 text-sm sm:text-xs font-medium text-txt-main hover:bg-subtle cursor-pointer touch-manipulation"
                    >
                      <span className="truncate">
                        {cat === "All" ? "All Categories" : cat}
                      </span>
                      {selectedCategoryFilter === cat && (
                        <Check size={14} className="text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Compact Page Size Popover */}
          <div className="relative shrink-0" ref={limitRef}>
            <button
              type="button"
              onClick={() => {
                setIsLimitOpen((prev) => !prev);
                setIsDatePopoverOpen(false);
                setIsEntryTypeOpen(false);
                setIsMemberOpen(false);
                setIsCategoryOpen(false);
              }}
              className={`h-9 flex items-center gap-1.5 px-3 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                isLimitFiltered
                  ? "bg-primary-light border-primary text-primary font-semibold"
                  : "bg-surface border-border-default text-txt-main hover:bg-subtle"
              }`}
              title="Entries limit"
            >
              <span>{pageSize === "All" ? "All" : `${pageSize}`}</span>
              <ChevronDown size={13} className="text-txt-muted" />
            </button>

            {isLimitOpen && (
              <div className="fixed left-4 right-4 top-36 w-auto sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-44 bg-surface border border-border-default rounded-3xl sm:rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                {(["All", 10, 20, 50, 100] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setPageSize(val);
                      setIsLimitFiltered(val !== "All");
                      setIsLimitOpen(false);
                    }}
                    className="w-full min-h-[48px] flex items-center justify-between px-4 py-2.5 text-sm sm:text-xs font-medium text-txt-main hover:bg-subtle cursor-pointer touch-manipulation"
                  >
                    <span>{val === "All" ? "All Entries" : `Last ${val}`}</span>
                    {pageSize === val && (
                      <Check size={14} className="text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isFilterActive && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="shrink-0 h-9 flex items-center gap-1 px-3 rounded-full text-xs font-semibold bg-cash-out-light text-cash-out border border-cash-out-border hover:bg-cash-out-light/80 transition-all cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Top Banner: Reference-style Net Balance Summary Card */}
        <LedgerSummaryCard
          netBalancePaisa={netBalancePaisa}
          totalInPaisa={totalInPaisa}
          totalOutPaisa={totalOutPaisa}
          currency={currency}
          reportsHref={`/orgs/${orgId}/reports`}
          isFilterActive={isFilterActive}
          filteredCount={logsForSummary.length}
        />

        {/* Entry Count Subheader */}
        <div className="text-center text-xs font-medium text-txt-muted py-0.5">
          {isLogsLoading
            ? "Loading entries..."
            : `Showing ${paginatedLogs.length} ${
                paginatedLogs.length === 1 ? "entry" : "entries"
              }${
                filteredLogs.length > paginatedLogs.length
                  ? ` of ${filteredLogs.length}`
                  : ""
              }`}
        </div>

        {/* Date-Grouped Transaction List */}
        {isLogsLoading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-border-subtle shadow-xs"
              >
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-5 w-16 bg-slate-200/70 rounded-md" />
                  <div className="h-4 w-36 bg-slate-200/70 rounded-md" />
                  <div className="h-3 w-44 bg-slate-100 rounded-md" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="h-4 w-16 bg-slate-200/70 rounded-md" />
                  <div className="h-3 w-20 bg-slate-100 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : groupedLogs.length === 0 ? (
          <div className="mx-4 sm:mx-0 p-8 text-center bg-surface border border-dashed border-border-default rounded-2xl text-xs text-txt-muted shadow-xs">
            {rawLogs.length === 0
              ? 'No transactions yet. Tap "+ Cash In" or "- Cash Out" below.'
              : "No entries found matching your search or filters."}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedLogs.map((group) => (
              <div key={group.dateKey} className="flex flex-col gap-1.5">
                {/* Date Group Header */}
                <div className="px-4 sm:px-1 text-xs font-semibold text-txt-muted">
                  {group.label}
                </div>

                {/* Grouped Entry Rows */}
                <div className="bg-surface border-y sm:border border-border-default rounded-none sm:rounded-2xl divide-y divide-border-subtle shadow-none sm:shadow-xs overflow-hidden">
                  {group.items.map((log) => {
                    const cleanAmount = formatCleanAmount(log.amountPaisa / 100);
                    const hasReceipt =
                      log.attachments && log.attachments.length > 0;
                    const isPositive = isLogCashIn(log);
                    const rawNote = log.note.replace(/^\[IN\]\s*/, "").trim();
                    const categoryLabel = log.category || "Cash";
                    const runningPaisa = runningBalanceMap.get(log.id) ?? 0;
                    const formattedRunning = `${
                      runningPaisa < 0 ? "-" : ""
                    }${formatCleanAmount(Math.abs(runningPaisa) / 100)}`;

                    return (
                      <div
                        key={log.id}
                        onClick={() => setViewingLog(log)}
                        className="px-4 py-3.5 hover:bg-subtle/60 transition-colors cursor-pointer flex flex-col gap-1.5"
                      >
                        {/* Top Row: Category/Mode Pill + Amount & Running Balance */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-primary-light text-primary">
                              {categoryLabel}
                            </span>
                            {Boolean(log.updatedBy) && (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
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
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
                              >
                                <ImageIcon size={11} />
                                <span>Receipt</span>
                              </button>
                            )}
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            <span
                              className={`text-sm sm:text-base font-bold tabular-nums leading-tight ${
                                isPositive ? "text-cash-in" : "text-cash-out"
                              }`}
                            >
                              {cleanAmount}
                            </span>
                            <span className="text-[11px] text-txt-muted tabular-nums mt-0.5">
                              Balance: {formattedRunning}
                            </span>
                          </div>
                        </div>

                        {/* Middle Row: Remark / Note */}
                        {rawNote && (
                          <div className="text-sm font-medium text-txt-main break-words">
                            {rawNote}
                          </div>
                        )}

                        {/* Bottom Row: Entry by + Timestamp + Quick Actions */}
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <div className="flex items-center gap-1.5 text-xs flex-wrap min-w-0">
                            <span className="font-medium text-teal-700 truncate">
                              Entry by {log.loggedByName || "You"}
                            </span>
                            {log.createdAt && (
                              <span className="text-txt-muted">
                                at {formatTime(log.createdAt)}
                              </span>
                            )}
                          </div>

                          {(canEditTransaction || canDeleteTransaction) && (
                            <div className="flex items-center gap-1 shrink-0">
                              {canEditTransaction && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingLog(log);
                                  }}
                                  className="relative min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-txt-muted hover:text-primary hover:bg-primary-light active:scale-90 transition-all cursor-pointer touch-manipulation before:absolute before:-inset-2 before:content-['']"
                                  title="Edit Transaction"
                                >
                                  <Edit2 size={13} />
                                </button>
                              )}
                              {canDeleteTransaction && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLog(log.id);
                                  }}
                                  className="relative min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-txt-muted hover:text-cash-out hover:bg-cash-out-light active:scale-90 transition-all cursor-pointer touch-manipulation before:absolute before:-inset-2 before:content-['']"
                                  title="Delete Transaction"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
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

      {/* Export PDF / CSV Statement Modal */}
      <ExportStatementModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        bookTitle={expense?.title || "Book Ledger"}
        currency={currency}
        netBalancePaisa={netBalancePaisa}
        totalInPaisa={totalInPaisa}
        totalOutPaisa={totalOutPaisa}
        logs={paginatedLogs}
      />
    </div>
  );
}
