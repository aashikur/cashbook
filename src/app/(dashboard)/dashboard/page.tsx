"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";
import SearchBar from "@/components/dashboard/SearchBar";
import ExpenseLedgerList, {
  ExpenseItem,
} from "@/components/dashboard/ExpenseLedgerList";
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
  const { activeOrg, setOrgSwitcherOpen, isOrgsLoading } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Live query from local Dexie IndexedDB (Reactive offline-first)
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
    [activeOrg?.id],
    []
  );

  // 2. Fetch server updates & delta sync
  const loadData = useCallback(async () => {
    if (!activeOrg) return;
    performDeltaSync(activeOrg.id);
  }, [activeOrg]);

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
  if (!mounted || (isOrgsLoading && !activeOrg)) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas pb-24">
        <AppHeader />
        <main className="max-w-md mx-auto w-full px-4 pt-4 flex flex-col gap-5 flex-1">
          <div className="h-11 bg-surface border border-border-default rounded-2xl animate-pulse" />
          <div className="flex items-center justify-between mt-1">
            <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="h-20 bg-surface border border-border-default rounded-2xl animate-pulse" />
            <div className="h-20 bg-surface border border-border-default rounded-2xl animate-pulse" />
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
        <main className="max-w-md mx-auto px-4 py-20 flex flex-col items-center justify-center text-center flex-1 gap-4">
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

      <main className="max-w-md mx-auto w-full px-4 pt-4 flex flex-col gap-5 flex-1">
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

          {/* Middle: Big Balance Display */}
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans my-1 text-white relative z-10">
            {totalBalancePaisa < 0 ? "-" : ""}
            {formatCurrency(Math.abs(totalBalancePaisa) / 100, currency)}
          </div>
        </div>

        {/* Search Bar (Screen 1 Reference) */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Your Books Section with + Add New Book button */}
        <ExpenseLedgerList expenses={(filteredExpenses || []) as ExpenseItem[]} />
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
