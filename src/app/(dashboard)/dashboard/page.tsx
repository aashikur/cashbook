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
import { BookOpen, Plus } from "lucide-react";

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
