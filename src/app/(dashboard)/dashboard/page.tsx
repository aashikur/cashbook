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
import { useAppStore } from "@/store/app-store";
import { localDb } from "@/lib/local-db";
import { performDeltaSync } from "@/lib/sync-service";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { activeOrg, setOrgSwitcherOpen, isOrgsLoading, hasHydrated } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncedOrgId, setSyncedOrgId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Live query from local Dexie IndexedDB (Reactive offline-first)
  // Omit default [] so localExpenses returns undefined while resolving async IndexedDB
  const localExpenses = useLiveQuery(
    async () => {
      if (!activeOrg) return [];
      return await localDb.expenses
        .where("orgId")
        .equals(activeOrg.id)
        .and((e) => !e.isArchived)
        .reverse()
        .sortBy("updatedAt");
    },
    [activeOrg?.id]
  );

  // 2. Fetch server updates & delta sync
  const loadData = useCallback(async () => {
    if (!activeOrg) return;
    setIsSyncing(true);
    try {
      await performDeltaSync(activeOrg.id);
    } finally {
      setSyncedOrgId(activeOrg.id);
      setIsSyncing(false);
    }
  }, [activeOrg]);

  const isWaitingForInitialSync =
    Boolean(activeOrg) &&
    localExpenses !== undefined &&
    localExpenses.length === 0 &&
    (isSyncing || syncedOrgId !== activeOrg?.id);

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
  const [sortOption, setSortOption] = useState<BookSortOption>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cashbook_book_sort") as BookSortOption;
      if (saved === "updated" || saved === "alphabetical" || saved === "created") {
        return saved;
      }
    }
    return "updated";
  });

  const handleSortChange = (option: BookSortOption) => {
    setSortOption(option);
    if (typeof window !== "undefined") {
      localStorage.setItem("cashbook_book_sort", option);
    }
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
        <main className="max-w-xl mx-auto w-full px-4 pt-4 flex flex-col gap-5 flex-1">
          {/* Executive Balance Card Skeleton */}
          <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 shadow-xl shadow-blue-500/10 bg-gradient-to-br from-blue-600/90 via-blue-500/90 to-blue-600/90 animate-pulse text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-28 bg-white/30 rounded-md" />
                <div className="h-4 w-14 bg-white/20 rounded-full" />
              </div>
              <div className="w-8 h-8 rounded-full bg-white/20" />
            </div>
            <div className="h-9 sm:h-10 w-44 bg-white/35 rounded-xl my-2" />
          </div>

          {/* Search Bar Skeleton */}
          <div className="h-11 bg-surface border border-border-default rounded-2xl flex items-center px-3.5 gap-2.5 animate-pulse shadow-2xs">
            <div className="w-4 h-4 rounded-full bg-slate-200/70 shrink-0" />
            <div className="h-3.5 w-36 bg-slate-200/70 rounded-md" />
          </div>

          {/* Section Header with View Toggle, Sort & Add */}
          <div className="flex items-center justify-between px-0.5 pt-1 gap-2 animate-pulse">
            <div className="h-6 w-28 bg-slate-200/70 rounded-lg" />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-8 w-16 bg-surface border border-border-default rounded-xl" />
              <div className="w-8 h-8 bg-surface border border-border-default rounded-xl shrink-0" />
              <div className="h-8 w-16 bg-primary/30 rounded-full" />
            </div>
          </div>

          {/* Book Cards Skeleton List */}
          <div className="flex flex-col gap-2 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-surface rounded-[12px] border border-border-subtle/40 shadow-2xs"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-primary-light/60 border border-primary-border/40 shrink-0" />
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
      {/* Top Header with User Profile / Org (Screen 1 Reference) */}
      <AppHeader />

      <main className="max-w-xl mx-auto w-full px-4 pt-4 flex flex-col gap-5 flex-1">
        {/* Workspace Total Balance Executive Card */}
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-blue-500/15 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 transition-all">
          {/* Ambient decorative blurred lighting */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute right-12 -top-8 w-24 h-24 rounded-full bg-white/10 blur-lg pointer-events-none" />

          {/* Top Row: Current Balance label + Books Count + Trending Icon */}
          <div className="flex items-center justify-between mb-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-white/80">
                Current Balance
              </span>
              {localExpenses && localExpenses.length > 0 && (
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold text-white backdrop-blur-xs">
                  {localExpenses.length} {localExpenses.length === 1 ? "book" : "books"}
                </span>
              )}
            </div>
            <div className="p-2 rounded-full bg-white/15 backdrop-blur-xs text-white">
              {totalBalancePaisa >= 0 ? (
                <TrendingUp size={20} className="stroke-[2.5]" />
              ) : (
                <TrendingDown size={20} className="stroke-[2.5]" />
              )}
            </div>
          </div>

          {/* Middle & Bottom: Big Balance Display + Bottom-Right Copy Button */}
          <div className="flex items-end justify-between mt-1 relative z-10 gap-3">
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans text-white min-w-0 truncate">
              {totalBalancePaisa < 0 ? "-" : ""}
              {formatCurrency(Math.abs(totalBalancePaisa) / 100, currency)}
            </div>

            {/* Bottom Right: Copy for Excel / Google Sheets (matches Image 1 reference) */}
            <CopyBooksButton
              expenses={sortedExpenses as ExpenseItem[]}
              logsByExpenseId={logsByExpenseId}
              sortOption={sortOption}
            />
          </div>
        </div>

        {/* Search Bar (Screen 1 Reference) */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Your Books Section with + Add New Book button */}
        <ExpenseLedgerList
          expenses={sortedExpenses as ExpenseItem[]}
          isLoading={isBooksLoading}
          sortOption={sortOption}
          onSortChange={handleSortChange}
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
