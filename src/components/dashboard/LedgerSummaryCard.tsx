"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatCleanAmount, formatCurrency } from "@/lib/utils";

interface LedgerSummaryCardProps {
  netBalancePaisa: number;
  totalInPaisa: number;
  totalOutPaisa: number;
  currency: string;
  reportsHref: string;
  isFilterActive: boolean;
  filteredCount: number;
}

/**
 * Reference-style ledger summary banner displaying Net Balance,
 * Total In (+), Total Out (-), and a direct link to Reports.
 */
export default function LedgerSummaryCard({
  netBalancePaisa,
  totalInPaisa,
  totalOutPaisa,
  currency,
  reportsHref,
  isFilterActive,
  filteredCount,
}: LedgerSummaryCardProps) {
  const isNegative = netBalancePaisa < 0;
  const formattedNet = `${isNegative ? "-" : ""}${formatCurrency(
    Math.abs(netBalancePaisa) / 100,
    currency
  )}`;

  return (
    <section
      aria-label="Ledger balance summary"
      className="bg-surface border border-border-default rounded-2xl shadow-xs overflow-hidden"
    >
      {/* Top Row: Net Balance */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-txt-main">Net Balance</span>
          {isFilterActive && (
            <span className="text-[10px] font-semibold bg-primary-light text-primary border border-primary-border px-2 py-0.5 rounded-full">
              Filtered ({filteredCount})
            </span>
          )}
        </div>
        <span
          className={`text-base sm:text-lg font-extrabold tabular-nums tracking-tight ${
            isNegative ? "text-cash-out" : "text-txt-main"
          }`}
        >
          {formattedNet}
        </span>
      </div>

      {/* Middle Breakdown: Total In & Total Out */}
      <div className="border-t border-border-subtle px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-txt-main">
            Total In (+)
          </span>
          <span className="text-xs sm:text-sm font-bold text-cash-in tabular-nums">
            {formatCleanAmount(totalInPaisa / 100)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-txt-main">
            Total Out (-)
          </span>
          <span className="text-xs sm:text-sm font-bold text-cash-out tabular-nums">
            {formatCleanAmount(totalOutPaisa / 100)}
          </span>
        </div>
      </div>

      {/* Footer Action: View reports */}
      <div className="border-t border-border-subtle">
        <Link
          href={reportsHref}
          className="w-full flex items-center justify-center gap-1 py-2.5 text-xs sm:text-sm font-bold text-primary hover:bg-primary-light/50 active:scale-[0.99] transition-all"
        >
          <span>View reports</span>
          <ChevronRight size={15} className="stroke-[2.5]" />
        </Link>
      </div>
    </section>
  );
}
