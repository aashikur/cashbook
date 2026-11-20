"use client";

import React from "react";
import { useAppStore } from "@/store/app-store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Receipt } from "lucide-react";

interface NetBalanceCardProps {
  totalPaisa: number;
  logCount: number;
}

export default function NetBalanceCard({
  totalPaisa,
  logCount,
}: NetBalanceCardProps) {
  const {
    activeOrg,
    selectedDate,
    setAddLogOpen,
    setAddExpenseOpen,
  } = useAppStore();

  const currency = activeOrg?.currency || "USD";
  const formattedAmount = formatCurrency(totalPaisa / 100, currency);

  return (
    <div className="bg-surface border border-border-default rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col items-center text-center">
      <span className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider mb-2">
        {selectedDate
          ? `Total Spent on ${formatDate(selectedDate)}`
          : `${new Date().getFullYear()} Total Expenditures`}
      </span>

      <div className="text-4xl sm:text-5xl font-black tracking-tight text-txt-main mb-2">
        {formattedAmount}
      </div>

      <span className="text-xs text-txt-secondary mb-6">
        {logCount} {logCount === 1 ? "transaction log" : "transaction logs"}{" "}
        recorded
      </span>

      {/* Action Buttons */}
      {activeOrg?.role === "admin" && (
        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setAddLogOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 text-xs font-bold text-white shadow-sm shadow-primary/20 transition-all cursor-pointer"
          >
            <Receipt size={16} />
            <span>RECORD LOG</span>
          </button>

          <button
            onClick={() => setAddExpenseOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-subtle hover:bg-surface border border-border-default text-xs font-semibold text-txt-secondary active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} className="text-primary" />
            <span>NEW LEDGER</span>
          </button>
        </div>
      )}
    </div>
  );
}
