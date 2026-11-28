import React from "react";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";

export default function DashboardLoading() {
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

        {/* Section Header Skeleton */}
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
