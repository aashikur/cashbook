"use client";

import React from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { formatCleanAmount, formatDate } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local-db";

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

  // Compact High-Density List View (Sleek height, exact same full width & side design)
  if (viewMode === "list") {
    return (
      <Link
        href={`/orgs/${orgId}/expenses/${id}`}
        className="w-full flex items-center justify-between py-2 px-3.5 sm:px-4 bg-surface rounded-[12px] transition-all group cursor-pointer hover:bg-subtle active:scale-[0.99] border-0 shadow-none"
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          {/* Compact Book Icon */}
          <div className="w-7 h-7 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0 border border-primary-border/70 group-hover:bg-primary-light transition-colors">
            <BookOpen size={14} />
          </div>

          {/* Compact Book Title */}
          <span className="text-xs font-semibold text-txt-main group-hover:text-primary transition-colors truncate">
            {title}
          </span>
        </div>

        {/* Compact Balance */}
        <div
          className={`font-semibold text-xs sm:text-sm text-right shrink-0 ${
            isZero
              ? "text-txt-muted"
              : isPositive
              ? "text-cash-in"
              : "text-cash-out"
          }`}
        >
          {isZero ? "0" : isPositive ? `+${cleanAmount}` : `-${cleanAmount}`}
        </div>
      </Link>
    );
  }

  // Spacious Card / Grid View (Default)
  return (
    <Link
      href={`/orgs/${orgId}/expenses/${id}`}
      className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-surface rounded-[12px] transition-all group cursor-pointer hover:bg-subtle active:scale-[0.99] border-0 shadow-none"
    >
      <div className="flex items-center gap-3.5 min-w-0 pr-2">
        {/* Blue Book Icon Box (Reference Matched) */}
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
      </div>

      {/* Amount with Color Hierarchy (+ green, - red, 0 neutral) */}
      <div
        className={`font-semibold text-sm sm:text-base text-right shrink-0 ${
          isZero
            ? "text-txt-muted"
            : isPositive
            ? "text-cash-in"
            : "text-cash-out"
        }`}
      >
        {isZero ? "0" : isPositive ? `+${cleanAmount}` : `-${cleanAmount}`}
      </div>
    </Link>
  );
}
