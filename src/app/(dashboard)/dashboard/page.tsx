"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";
import SearchBar from "@/components/dashboard/SearchBar";
import ExpenseLedgerList, {
  BookSortOption,
  ExpenseItem,
} from "@/components/dashboard/ExpenseLedgerList";
import CopyBooksButton from "@/components/dashboard/CopyBooksButton";
import QuickAddLogModal from "@/components/dashboard/QuickAddLogModal";
import CreateExpenseModal from "@/components/dashboard/CreateExpenseModal";
import CreateOrgModal from "@/components/dashboard/CreateOrgModal";
import { useAppStore, useStoreHydrated } from "@/store/app-store";
import { localDb } from "@/lib/local-db";
import { performDeltaSync } from "@/lib/sync-service";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { activeOrg, setOrgSwitcherOpen, isOrgsLoading } = useAppStore();
  const hasHydrated = useStoreHydrated();
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncState, setSyncState] = useState<{
    orgId: string;
    status: "syncing" | "done";
    activeCount: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Live query from local Dexie IndexedDB (Reactive offline-first)
  // Omit default [] so localExpenses returns undefined while resolving async IndexedDB
  const activeOrgId = activeOrg?.id;
  const localExpenses = useLiveQuery(
    async () => {
      if (!activeOrgId) return [];
      return await localDb.expenses
        .where("orgId")
        .equals(activeOrgId)
        .and((e) => !e.isArchived)
        .reverse()
        .sortBy("updatedAt");
    },
    [activeOrgId]
  );

  // 2. Fetch server updates & delta sync (keyed by primitive activeOrgId to prevent re-runs)
  const loadData = useCallback(async () => {
    if (!activeOrgId) return;
    setSyncState({ orgId: activeOrgId, status: "syncing", activeCount: 0 });
    let activeCount = 0;
    try {
      const result = await performDeltaSync(activeOrgId);
      activeCount = result.activeExpenseCount;
    } finally {
      setSyncState({ orgId: activeOrgId, status: "done", activeCount });
    }
  }, [activeOrgId]);

  const isWaitingForInitialSync =
    Boolean(activeOrgId) &&
    localExpenses !== undefined &&
    localExpenses.length === 0 &&
    (syncState?.orgId !== activeOrgId ||
      syncState?.status === "syncing" ||
      (syncState?.activeCount ?? 0) > 0);

  const isBooksLoading = localExpenses === undefined || isWaitingForInitialSync;

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter books by search query
  const filteredExpenses = useMemo(() => {
    if (!localExpenses) return [];
    if (!searchQuery.trim()) return localExpenses;
    return localExpenses.filter((e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [localExpenses, searchQuery]);

  // Persist user sort preference in localStorage
  const [sortOption, setSortOption] = useState<BookSortOption>("updated");

  useEffect(() => {
    const saved = localStorage.getItem("cashbook_book_sort") as BookSortOption;
    if (saved === "updated" || saved === "alphabetical" || saved === "created") {
      setSortOption(saved);
    }
  }, []);

  const handleSortChange = (option: BookSortOption) => {
    setSortOption(option);
    localStorage.setItem("cashbook_book_sort", option);
  };

  // Reactive sorted expenses list based on user selection & search query
  const sortedExpenses = useMemo(() => {
    const list = [...filteredExpenses];
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
  }, [filteredExpenses, sortOption]);

  // 3. Query all workspace logs to compute total balance across all books
  const allWorkspaceLogs = useLiveQuery(
    async () => {
      if (!activeOrg) return [];
      return await localDb.dailyLogs
        .where("orgId")
        .equals(activeOrg.id)
        .toArray();
    },
    [activeOrg?.id],
    []
  );

  // Group logs by expenseId for instant per-book balance resolution
  const logsByExpenseId = useMemo(() => {
    const map = new Map<
      string,
      Array<{ type?: string; note?: string; amountPaisa: number }>
    >();
    if (!allWorkspaceLogs) return map;
    for (const log of allWorkspaceLogs) {
      let list = map.get(log.expenseId);
      if (!list) {
        list = [];
        map.set(log.expenseId, list);
      }
      list.push(log);
    }
    return map;
  }, [allWorkspaceLogs]);

  const totalBalancePaisa = useMemo(() => {
    if (allWorkspaceLogs && allWorkspaceLogs.length > 0) {
      let net = 0;
      for (const log of allWorkspaceLogs) {
        const isCashIn =
          log.type === "in" ||
          (log.type !== "out" &&
            (log.note.toLowerCase().startsWith("[in]") ||
              log.note.toLowerCase().includes("freelance") ||
              log.note.toLowerCase().includes("salary") ||
              log.note.toLowerCase().includes("income") ||
              log.note.toLowerCase().includes("cash in")));
        if (isCashIn) {
          net += log.amountPaisa;
        } else {
          net -= log.amountPaisa;
        }
      }
      return net;
    }

    if (localExpenses && localExpenses.length > 0) {
      return localExpenses.reduce((acc, exp) => {
        const spent =
          typeof exp.totalSpent === "string"
            ? parseInt(exp.totalSpent, 10) || 0
            : exp.totalSpent;
        const isIncomeFallback =
          exp.category?.toLowerCase() === "income" ||
          exp.category?.toLowerCase() === "revenue" ||
          exp.title.toLowerCase().includes("salary") ||
          exp.title.toLowerCase().includes("income");
        return acc + (isIncomeFallback ? Math.abs(spent) : -Math.abs(spent));
      }, 0);
    }

    return 0;
  }, [allWorkspaceLogs, localExpenses]);

  const currency = activeOrg?.currency || "BDT";

  // Loading skeleton during hydration or while initial organization is loading
  if (!mounted || !hasHydrated || (isOrgsLoading && !activeOrg)) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas pb-24">
        <AppHeader />
        <main className="max-w-xl mx-auto w-full px-0 sm:px-4 pt-3.5 flex flex-col gap-4 flex-1">
          {/* Compact Balance Summary Card Skeleton */}
          <div className="mx-4 sm:mx-0 bg-surface border border-border-default rounded-2xl px-4 py-3 shadow-xs flex items-center justify-between gap-3 animate-pulse">
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-28 bg-slate-200/70 rounded-md" />
              <div className="h-7 w-36 bg-slate-200/80 rounded-lg" />
            </div>
            <div className="h-8 w-20 bg-subtle border border-border-default rounded-xl shrink-0" />
          </div>

          {/* Section Header Skeleton (Your Books + Sort, Search & Add) */}
          <div className="flex items-center justify-between px-4 sm:px-0.5 pt-0.5 gap-2 animate-pulse">
            <div className="h-6 w-28 bg-slate-200/70 rounded-lg" />
            <div className="flex items-center gap-1.5">
              <div className="w-9 h-9 bg-surface border border-border-subtle rounded-full" />
              <div className="w-9 h-9 bg-surface border border-border-subtle rounded-full" />
              <div className="h-8 w-16 bg-primary/30 rounded-full" />
            </div>
          </div>

          {/* Grouped Books List Skeleton */}
          <div className="w-full bg-surface border-y sm:border border-border-default rounded-none sm:rounded-2xl divide-y divide-border-subtle shadow-none sm:shadow-xs overflow-hidden animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="w-full flex items-center justify-between px-3.5 sm:px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-primary-light/60 border border-primary-border/40 shrink-0" />
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
        </main>
        <BottomNav />
      </div>
    );
  }

  // If user has no active organization yet (after loading finishes)
  if (!activeOrg) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas">
        <AppHeader />
        <main className="max-w-xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center flex-1 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-light border border-primary-border flex items-center justify-center text-primary shadow-sm">
            <BookOpen size={26} />
          </div>
          <h2 className="text-xl font-bold text-txt-main">
            No Workspace Selected
          </h2>
          <p className="text-xs text-txt-secondary max-w-xs">
            Create your first workspace or ledger account to start tracking books.
          </p>
          <button
            onClick={() => setOrgSwitcherOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary hover:bg-primary-hover text-xs font-bold text-white shadow-md shadow-primary/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Workspace</span>
          </button>
          <CreateOrgModal />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas pb-24">
      {/* Top Header OR Focused Search Header */}
      {isSearchOpen ? (
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClose={() => {
            setSearchQuery("");
            setIsSearchOpen(false);
          }}
        />
      ) : (
        <AppHeader />
      )}

      <main className="max-w-xl mx-auto w-full px-0 sm:px-4 pt-3.5 flex flex-col gap-4 flex-1">
        {/* Compact Balance Bar (consistent with Entry Books LedgerSummaryCard) */}
        {!isSearchOpen && (
          <section
            aria-label="Workspace balance summary"
            className="mx-4 sm:mx-0 bg-surface border border-border-default rounded-2xl px-4 py-3 shadow-xs flex items-center justify-between gap-3"
          >
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-txt-secondary">
                  Current Balance
                </span>
                {localExpenses && localExpenses.length > 0 && (
                  <span className="text-[10px] font-semibold bg-primary-light text-primary border border-primary-border px-1.5 py-0.5 rounded-full">
                    {localExpenses.length}{" "}
                    {localExpenses.length === 1 ? "book" : "books"}
                  </span>
                )}
              </div>
              <div
                className={`text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums truncate mt-0.5 ${
                  totalBalancePaisa < 0
                    ? "text-cash-out"
                    : totalBalancePaisa > 0
                    ? "text-cash-in"
                    : "text-txt-main"
                }`}
              >
                {totalBalancePaisa < 0 ? "-" : ""}
                {formatCurrency(Math.abs(totalBalancePaisa) / 100, currency)}
              </div>
            </div>

            <CopyBooksButton
              expenses={sortedExpenses as ExpenseItem[]}
              logsByExpenseId={logsByExpenseId}
              sortOption={sortOption}
              variant="surface"
            />
          </section>
        )}

        {/* Your Books Grouped List */}
        <ExpenseLedgerList
          expenses={sortedExpenses as ExpenseItem[]}
          isLoading={isBooksLoading}
          sortOption={sortOption}
          onSortChange={handleSortChange}
          onOpenSearch={() => setIsSearchOpen(true)}
          hideToolbar={isSearchOpen}
          isSearchActive={Boolean(searchQuery.trim())}
          onBookUpdated={loadData}
        />
      </main>

      {/* Floating Action Modals */}
      <QuickAddLogModal onLogged={loadData} />
      <CreateExpenseModal onCreated={loadData} />
      <CreateOrgModal />

      {/* Bottom Sticky Tabs (Screen 1 Reference) */}
      <BottomNav />
    </div>
  );
}
