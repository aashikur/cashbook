"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import { useAppStore } from "@/store/app-store";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  BarChart3,
  Download,
  PieChart,
} from "lucide-react";

type PageProps = {
  params: Promise<{ orgId: string }>;
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface MonthlyRow {
  fiscalYear: number;
  fiscalMonth: number;
  totalPaisa: number;
  logCount: number;
}

interface ExpenseRow {
  expenseId: string;
  expenseTitle: string;
  totalPaisa: number;
  logCount: number;
}

export default function ReportsPage({ params }: PageProps) {
  const { orgId } = use(params);
  const { activeOrg } = useAppStore();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [monthlyData, setMonthlyData] = useState<MonthlyRow[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseRow[]>([]);
  const [grandTotalPaisa, setGrandTotalPaisa] = useState(0);
  const [loading, setLoading] = useState(true);

  const currency = activeOrg?.currency || "BDT";

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/orgs/${orgId}/reports/summary?year=${selectedYear}`
      );
      if (res.ok) {
        const { data } = await res.json();
        setMonthlyData(data.monthlyBreakdown || []);
        setExpenseData(data.expenseBreakdown || []);
        setGrandTotalPaisa(data.grandTotalPaisa || 0);
      }
    } catch (err) {
      console.error("Failed to load report summary:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, selectedYear]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  function exportJSON() {
    const reportData = {
      orgName: activeOrg?.name,
      currency,
      fiscalYear: selectedYear,
      grandTotal: grandTotalPaisa / 100,
      monthlyBreakdown: monthlyData.map((m) => ({
        month: MONTH_NAMES[m.fiscalMonth - 1],
        total: m.totalPaisa / 100,
        logs: m.logCount,
      })),
      expenseBreakdown: expenseData.map((e) => ({
        category: e.expenseTitle,
        total: e.totalPaisa / 100,
        logs: e.logCount,
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cashbook_report_${selectedYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Generate 15-year historical options list
  const yearOptions = Array.from({ length: 15 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <AppHeader />

      <main className="max-w-xl mx-auto w-full px-4 py-6 flex flex-col gap-6 flex-1">
        {/* Back Link & Year Selector */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-medium text-txt-secondary hover:text-txt-main transition-colors w-fit"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-surface border border-border-default rounded-xl px-3 py-1.5 text-xs font-semibold text-txt-main shadow-xs focus:outline-none focus:border-primary cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  Fiscal Year {y}
                </option>
              ))}
            </select>

            <button
              onClick={exportJSON}
              className="p-1.5 rounded-xl border border-border-default bg-surface hover:bg-subtle text-txt-secondary hover:text-txt-main active:scale-95 shadow-xs transition-all cursor-pointer"
              title="Export Report JSON"
            >
              <Download size={15} />
            </button>
          </div>
        </div>

        {/* Grand Total Overview Card */}
        <div className="bg-surface border border-border-default rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider mb-2">
            Total {selectedYear} Expenditures
          </span>
          <div className="text-4xl sm:text-5xl font-black text-txt-main font-mono tracking-tight">
            {loading ? "..." : formatCurrency(grandTotalPaisa / 100, currency)}
          </div>
        </div>

        {/* Monthly Ledger Breakdown */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-txt-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
            <BarChart3 size={15} className="text-primary" />
            <span>Monthly Performance</span>
          </h3>

          <div className="bg-surface border border-border-default rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-xs">
            {Array.from({ length: 12 }, (_, i) => {
              const monthNum = i + 1;
              const row = monthlyData.find((m) => m.fiscalMonth === monthNum);
              const amountPaisa = row ? row.totalPaisa : 0;
              const percentage =
                grandTotalPaisa > 0 ? (amountPaisa / grandTotalPaisa) * 100 : 0;

              return (
                <div key={monthNum} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-txt-secondary">
                      {MONTH_NAMES[i]}
                    </span>
                    <span className="font-mono font-bold text-txt-main">
                      {formatCurrency(amountPaisa / 100, currency)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-subtle overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-txt-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
            <PieChart size={15} className="text-primary" />
            <span>Expenditure by Category</span>
          </h3>

          <div className="flex flex-col gap-2">
            {expenseData.length === 0 ? (
              <div className="p-8 text-center bg-surface border border-border-default rounded-2xl text-txt-muted text-xs">
                No categorical expenditures recorded for {selectedYear}
              </div>
            ) : (
              expenseData.map((item) => {
                const percentage =
                  grandTotalPaisa > 0
                    ? ((item.totalPaisa / grandTotalPaisa) * 100).toFixed(1)
                    : "0.0";

                return (
                  <div
                    key={item.expenseId}
                    className="flex items-center justify-between p-3.5 bg-surface border border-border-default rounded-xl shadow-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-xs font-semibold text-txt-main block truncate">
                        {item.expenseTitle}
                      </span>
                      <span className="text-[10px] text-txt-muted">
                        {item.logCount} {item.logCount === 1 ? "entry" : "entries"} (
                        {percentage}%)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-xs text-txt-main">
                      {formatCurrency(item.totalPaisa / 100, currency)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
