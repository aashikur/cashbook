import React from "react";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";

export default function DashboardLoading() {
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
