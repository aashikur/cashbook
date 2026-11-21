"use client";

import React, { useState, useEffect, useCallback, use, useRef } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import QuickAddLogModal from "@/components/dashboard/QuickAddLogModal";
import EditLogModal from "@/components/dashboard/EditLogModal";
import EditExpenseModal from "@/components/dashboard/EditExpenseModal";
import { useAppStore } from "@/store/app-store";
import { localDb, LocalDailyLog } from "@/lib/local-db";
import { formatCleanAmount, formatCurrency, formatDate } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/categories";
import {
  Archive,
  ArrowLeft,
  Calendar,
  Edit2,
  Filter,
  Image as ImageIcon,
  Minus,
  MoreVertical,
  Plus,
  Settings,
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
        .reverse()
        .sortBy("logDate"),
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
  const [pageSize, setPageSize] = useState<number | "All">(50);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<LocalDailyLog | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const currency = activeOrg?.currency || "USD";

  // Effective expense and logs (Dexie has priority for 0ms, server augments)
  const expense = cachedExpense || serverExpense;
  const rawLogs = cachedLogs ?? [];

  // Close header menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false);
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

  // 1. Date Range Filtered Logs (for Top Summary & Transactions)
  const dateFilteredLogs = rawLogs.filter((log) => {
    if (fromDate && log.logDate < fromDate) return false;
    if (toDate && log.logDate > toDate) return false;
    return true;
  });

  // 2. Summary reactive to Date Range
  const inLogs = dateFilteredLogs.filter((l) => {
    if (l.type) return l.type === "in";
    const lower = l.note.toLowerCase();
    return (
      lower.startsWith("[in]") ||
      lower.includes("freelance") ||
      lower.includes("salary") ||
      lower.includes("income") ||
      lower.includes("cash in")
    );
  });

  const outLogs = dateFilteredLogs.filter((l) => !inLogs.includes(l));
  const totalInPaisa = inLogs.reduce((acc, l) => acc + l.amountPaisa, 0);
  const totalOutPaisa = outLogs.reduce((acc, l) => acc + l.amountPaisa, 0);
  const netBalancePaisa = totalInPaisa - totalOutPaisa;

  // 3. Category Filter
  const categoryFilteredLogs = dateFilteredLogs.filter((log) => {
    if (selectedCategoryFilter === "All") return true;
    return (
      (log.category || "General").toLowerCase() ===
      selectedCategoryFilter.toLowerCase()
    );
  });

  // 4. Page Size Limit
  const paginatedLogs =
    pageSize === "All"
      ? categoryFilteredLogs
      : categoryFilteredLogs.slice(0, Number(pageSize));

  // Extract distinct categories present in this ledger
  const availableCategories = Array.from(
    new Set(rawLogs.map((l) => l.category || "General"))
  ).filter(Boolean);

  // Optimistic log deletion
  async function handleDeleteLog(logId: string) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

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

      await fetch(`/api/v1/orgs/${orgId}/logs/${logId}`, {
        method: "DELETE",
      });
      refreshServerData();
    } catch {
      alert("Failed to delete transaction on server");
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
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1 rounded-full text-txt-secondary hover:text-txt-main hover:bg-subtle active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-base font-bold text-txt-main tracking-tight truncate max-w-[200px]">
              {expense?.title || "Book Ledger"}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 relative" ref={menuRef}>
            <Link
              href={`/orgs/${orgId}/members`}
              className="p-1.5 rounded-full text-txt-secondary hover:bg-subtle transition-colors"
              title="Team"
            >
              <UserPlus size={18} />
            </Link>

            {/* 3-Dot Action Menu */}
            <button
              onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-full text-txt-secondary hover:bg-subtle transition-colors cursor-pointer"
              title="More Options"
            >
              <MoreVertical size={18} />
            </button>

            {/* Header Dropdown Popover */}
            {isHeaderMenuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-surface border border-border-default rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
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
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto w-full px-4 pt-4 flex flex-col gap-5 flex-1">
        {/* Top Summary Cards: Left = Summary (Net), Right = In & Out Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {/* Left Card: Summary / Net Balance */}
          <div
            className={`rounded-3xl p-4 shadow-sm flex flex-col justify-between min-h-[110px] border transition-transform active:scale-[0.98] ${
              netBalancePaisa > 0
                ? "bg-cash-in-light/60 border-cash-in-border/80"
                : netBalancePaisa < 0
                ? "bg-cash-out-light/60 border-cash-out-border/80"
                : "bg-surface border-border-default"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-txt-secondary uppercase tracking-wider">
                Summary
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  netBalancePaisa > 0
                    ? "bg-cash-in text-white shadow-xs"
                    : netBalancePaisa < 0
                    ? "bg-cash-out text-white shadow-xs"
                    : "bg-subtle text-txt-muted"
                }`}
              >
                {netBalancePaisa > 0
                  ? "Surplus"
                  : netBalancePaisa < 0
                  ? "Deficit"
                  : "Balanced"}
              </span>
            </div>

            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono my-1 ${
                netBalancePaisa > 0
                  ? "text-cash-in"
                  : netBalancePaisa < 0
                  ? "text-cash-out"
                  : "text-txt-main"
              }`}
            >
              {netBalancePaisa > 0 ? "+" : netBalancePaisa < 0 ? "-" : ""}
              {formatCurrency(Math.abs(netBalancePaisa) / 100, currency)}
            </div>

            <div className="text-[11px] font-medium text-txt-muted">
              Net Balance
            </div>
          </div>

          {/* Right Card: Total In & Total Out Breakdown */}
          <div className="bg-surface border border-border-default rounded-3xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between min-h-[110px] transition-transform active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-txt-secondary flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cash-in inline-block" />
                Total In
              </span>
              <span className="text-sm sm:text-base font-extrabold font-mono text-cash-in">
                +{formatCurrency(totalInPaisa / 100, currency)}
              </span>
            </div>

            <div className="h-px bg-border-subtle my-1" />

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-txt-secondary flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cash-out inline-block" />
                Total Out
              </span>
              <span className="text-sm sm:text-base font-extrabold font-mono text-cash-out">
                -{formatCurrency(totalOutPaisa / 100, currency)}
              </span>
            </div>
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
                <span className="text-xs text-txt-muted font-medium bg-subtle px-2 py-0.5 rounded-full">
                  {paginatedLogs.length}
                  {pageSize !== "All" &&
                  paginatedLogs.length < categoryFilteredLogs.length
                    ? ` of ${categoryFilteredLogs.length}`
                    : ""}{" "}
                  entries
                </span>
              </div>

              {/* Right Filter Controls */}
              <div className="flex items-center gap-1.5">
                {/* Clear Date Filter Button */}
                {(fromDate || toDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-semibold bg-cash-out-light text-cash-out border border-cash-out-border hover:bg-cash-out-light/80 transition-colors cursor-pointer"
                    title="Clear date range"
                  >
                    <span>Clear</span>
                    <X size={11} />
                  </button>
                )}

                {/* Date Range Inputs */}
                <div className="flex items-center gap-1 bg-surface border border-border-default rounded-xl px-2 py-1 text-xs shadow-2xs">
                  <Calendar size={12} className="text-txt-muted shrink-0" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="text-[10px] text-txt-main bg-transparent focus:outline-none cursor-pointer max-w-[78px] sm:max-w-none"
                    title="From Date"
                  />
                  <span className="text-txt-muted text-[10px]">-</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="text-[10px] text-txt-main bg-transparent focus:outline-none cursor-pointer max-w-[78px] sm:max-w-none"
                    title="To Date"
                  />
                </div>

                {/* Page Size / Entities Selector */}
                <select
                  value={pageSize}
                  onChange={(e) =>
                    setPageSize(
                      e.target.value === "All"
                        ? "All"
                        : Number(e.target.value)
                    )
                  }
                  className="bg-surface border border-border-default rounded-xl px-2 py-1 text-xs font-semibold text-txt-main focus:outline-none focus:border-primary shadow-2xs cursor-pointer"
                  title="Transactions per view"
                >
                  <option value={10}>10</option>
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
                    className="flex items-center justify-between p-3.5 bg-surface rounded-2xl transition-all hover:bg-subtle/70 border border-border-subtle/50 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {/* Category Icon Box */}
                      <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-border flex items-center justify-center shrink-0">
                        <CategoryIcon size={18} className="text-primary" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-txt-main block truncate">
                            {displayNote}
                          </span>
                          {log.category && log.category !== "General" && (
                            <span className="text-[10px] font-medium bg-subtle px-1.5 py-0.5 rounded-md text-txt-secondary truncate max-w-[80px]">
                              {log.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-txt-muted mt-0.5">
                          <span>{formatDate(log.logDate).split(",")[0]}</span>
                          {hasReceipt && (
                            <button
                              onClick={() =>
                                setActiveReceiptUrl(log.attachments![0].url)
                              }
                              className="text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer"
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

                      {/* Edit Button */}
                      <button
                        onClick={() => setEditingLog(log)}
                        className="p-1.5 rounded-lg text-txt-muted hover:text-primary hover:bg-primary-light transition-colors cursor-pointer"
                        title="Edit Transaction"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Delete Button */}
                      {activeOrg?.role === "admin" && (
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1.5 rounded-lg text-txt-muted hover:text-cash-out hover:bg-cash-out-light transition-colors cursor-pointer"
                          title="Delete Transaction"
                        >
                          <Trash2 size={13} />
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
        <div className="max-w-md mx-auto flex gap-3">
          {/* Green Cash In Button */}
          <button
            onClick={handleOpenCashIn}
            className="btn-cash-in flex-1 cursor-pointer active:scale-95 transition-transform"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Cash In</span>
          </button>

          {/* Red Cash Out Button */}
          <button
            onClick={handleOpenCashOut}
            className="btn-cash-out flex-1 cursor-pointer active:scale-95 transition-transform"
          >
            <Minus size={18} strokeWidth={2.5} />
            <span>Cash Out</span>
          </button>
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
    </div>
  );
}
