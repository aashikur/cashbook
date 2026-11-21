"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Minus, Plus } from "lucide-react";
import { formatCleanAmount, formatDate } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local-db";
import { useAppStore } from "@/store/app-store";

interface BookCardProps {
  id: string;
  orgId: string;
  title: string;
  category?: string;
  totalSpent: number | string;
  logCount: number;
  updatedAt: string;
  currency: string;
  viewMode?: "grid" | "list";
}

export default function BookCard({
  id,
  orgId,
  title,
  category,
  totalSpent,
  updatedAt,
  viewMode = "grid",
}: BookCardProps) {
  // Live query transactions for this book from local Dexie database
  const bookLogs = useLiveQuery(
    async () => {
      return await localDb.dailyLogs
        .where("expenseId")
        .equals(id)
        .toArray();
    },
    [id],
    []
  );

  let netPaisa = 0;
  let hasTransactions = false;

  if (bookLogs && bookLogs.length > 0) {
    hasTransactions = true;
    for (const log of bookLogs) {
      const isCashIn =
        log.type === "in" ||
        (log.type !== "out" &&
          (log.note.toLowerCase().startsWith("[in]") ||
            log.note.toLowerCase().includes("freelance") ||
            log.note.toLowerCase().includes("salary") ||
            log.note.toLowerCase().includes("client") ||
            log.note.toLowerCase().includes("cash in") ||
            log.note.toLowerCase().includes("income") ||
            log.note.toLowerCase().includes("deposit")));

      if (isCashIn) {
        netPaisa += log.amountPaisa;
      } else {
        netPaisa -= log.amountPaisa;
      }
    }
  }

  // Fallback if no local logs yet (initial seeded mock state)
  const paisa =
    typeof totalSpent === "string"
      ? parseInt(totalSpent, 10) || 0
      : totalSpent;

  const isIncomeFallback =
    category?.toLowerCase() === "income" ||
    category?.toLowerCase() === "revenue" ||
    category?.toLowerCase() === "investment" ||
    title.toLowerCase().includes("salary") ||
    title.toLowerCase().includes("income") ||
    title.toLowerCase().includes("freelance") ||
    title.toLowerCase().includes("deposit") ||
    title.toLowerCase().includes("savings");

  // Determine final display values: positive = green (+), negative = red (-), 0 = neutral
  const displayPaisa = hasTransactions
    ? netPaisa
    : isIncomeFallback
    ? Math.abs(paisa)
    : -Math.abs(paisa);

  const isPositive = displayPaisa > 0;
  const isZero = displayPaisa === 0;

  const cleanAmount = formatCleanAmount(Math.abs(displayPaisa) / 100);

  const { setActiveExpenseId, setLogType, setAddLogOpen } = useAppStore();

  function handleQuickAction(e: React.MouseEvent, type: "in" | "out") {
    e.preventDefault();
    e.stopPropagation();
    setActiveExpenseId(id);
    setLogType(type);
    setAddLogOpen(true);
  }

  // Compact High-Density List View (Sleek height with instant (+/-) Quick Update)
  if (viewMode === "list") {
    return (
      <div className="w-full flex items-center justify-between py-2 px-3.5 sm:px-4 bg-surface rounded-[12px] transition-all group hover:bg-subtle border-0 shadow-none">
        {/* Clickable Area for Book Navigation */}
        <Link
          href={`/orgs/${orgId}/expenses/${id}`}
          className="flex items-center gap-3 min-w-0 pr-2 flex-1 cursor-pointer"
        >
          {/* Compact Book Icon */}
          <div className="w-7 h-7 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0 border border-primary-border/70 group-hover:bg-primary-light transition-colors">
            <BookOpen size={14} />
          </div>

          {/* Compact Book Title */}
          <span className="text-xs font-semibold text-txt-main group-hover:text-primary transition-colors truncate">
            {title}
          </span>
        </Link>

        {/* Right Side: Amount & Compact Quick (+/-) Update */}
        <div className="flex items-center gap-2 shrink-0 pl-1">
          <Link
            href={`/orgs/${orgId}/expenses/${id}`}
            className={`font-semibold text-xs sm:text-sm text-right cursor-pointer hover:opacity-80 transition-opacity ${
              isZero
                ? "text-txt-muted"
                : isPositive
                ? "text-cash-in"
                : "text-cash-out"
            }`}
          >
            {isZero ? "0" : isPositive ? `+${cleanAmount}` : `-${cleanAmount}`}
          </Link>

          {/* Quick (+ In / - Out) Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => handleQuickAction(e, "in")}
              title="Quick Cash In"
              className="w-6 h-6 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-90 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-all cursor-pointer"
            >
              <Plus size={12} className="stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={(e) => handleQuickAction(e, "out")}
              title="Quick Cash Out"
              className="w-6 h-6 rounded-md bg-rose-500/10 hover:bg-rose-500/20 active:scale-90 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center transition-all cursor-pointer"
            >
              <Minus size={12} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Spacious Card / Grid View with Instant (+/-) Quick Update
  return (
    <div className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-surface rounded-[12px] transition-all group hover:bg-subtle border-0 shadow-none">
      {/* Clickable Area for Book Navigation */}
      <Link
        href={`/orgs/${orgId}/expenses/${id}`}
        className="flex items-center gap-3.5 min-w-0 pr-2 flex-1 cursor-pointer"
      >
        {/* Blue Book Icon Box */}
        <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0 border border-primary-border group-hover:bg-primary-light transition-colors">
          <BookOpen size={20} />
        </div>

        {/* Title & Updated Date */}
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-txt-main group-hover:text-primary transition-colors truncate">
            {title}
          </h4>
          <p className="text-[11px] text-txt-muted mt-0.5 truncate">
            Updated on {formatDate(updatedAt).split(",")[0] || "recently"}
          </p>
        </div>
      </Link>

      {/* Right Side: Amount & Quick Update (+ In / - Out) */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 pl-1">
        <Link
          href={`/orgs/${orgId}/expenses/${id}`}
          className={`font-semibold text-sm sm:text-base text-right cursor-pointer hover:opacity-80 transition-opacity ${
            isZero
              ? "text-txt-muted"
              : isPositive
              ? "text-cash-in"
              : "text-cash-out"
          }`}
        >
          {isZero ? "0" : isPositive ? `+${cleanAmount}` : `-${cleanAmount}`}
        </Link>

        {/* Quick (+ In / - Out) Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => handleQuickAction(e, "in")}
            title="Quick Cash In"
            className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-90 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
          >
            <Plus size={14} className="stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={(e) => handleQuickAction(e, "out")}
            title="Quick Cash Out"
            className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 active:scale-90 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
          >
            <Minus size={14} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
