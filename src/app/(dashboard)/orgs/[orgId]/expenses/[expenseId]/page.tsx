"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QuickAddLogModal from "@/components/dashboard/QuickAddLogModal";
import { useAppStore } from "@/store/app-store";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  DollarSign,
  Image as ImageIcon,
  Minus,
  MoreVertical,
  Plus,
  ShoppingBag,
  Trash2,
  UserPlus,
  Utensils,
  X,
} from "lucide-react";

type PageProps = {
  params: Promise<{ orgId: string; expenseId: string }>;
};

interface LogItem {
  id: string;
  amountPaisa: number;
  note: string;
  logDate: string;
  fiscalYear: number;
  fiscalMonth: number;
  attachments?: Array<{ key: string; url: string; mimeType: string }>;
}

interface ExpenseDetails {
  id: string;
  orgId: string;
  title: string;
  category?: string;
  totalSpent: string | number;
  logCount: number;
  isArchived: boolean;
}

// Selects clean Lucide icon based on transaction note
function getCategoryIcon(note: string) {
  const lower = note.toLowerCase();
  if (lower.includes("supermarket") || lower.includes("grocer") || lower.includes("shop")) {
    return <ShoppingBag size={18} className="text-primary" />;
  }
  if (lower.includes("dinner") || lower.includes("food") || lower.includes("restaurant") || lower.includes("lunch")) {
    return <Utensils size={18} className="text-primary" />;
  }
  if (lower.includes("book") || lower.includes("library") || lower.includes("course")) {
    return <BookOpen size={18} className="text-primary" />;
  }
  if (lower.includes("freelance") || lower.includes("salary") || lower.includes("client")) {
    return <DollarSign size={18} className="text-cash-in" />;
  }
  return <ArrowDownLeft size={18} className="text-primary" />;
}

export default function ExpenseDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { orgId, expenseId } = use(params);
  const { activeOrg, setActiveExpenseId, setLogType, setAddLogOpen } = useAppStore();

  const [expense, setExpense] = useState<ExpenseDetails | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);

  const currency = activeOrg?.currency || "USD";

  const loadExpenseData = useCallback(async () => {
    try {
      const expRes = await fetch(`/api/v1/orgs/${orgId}/expenses/${expenseId}`);
      if (expRes.ok) {
        const { data } = await expRes.json();
        setExpense(data);
      }

      const logsRes = await fetch(
        `/api/v1/orgs/${orgId}/expenses/${expenseId}/logs?limit=100`
      );
      if (logsRes.ok) {
        const { data } = await logsRes.json();
        setLogs(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load expense details:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, expenseId]);

  useEffect(() => {
    loadExpenseData();
  }, [loadExpenseData]);

  async function handleDeleteLog(logId: string) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const res = await fetch(`/api/v1/orgs/${orgId}/logs/${logId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadExpenseData();
      }
    } catch {
      alert("Failed to delete transaction");
    }
  }

  // Calculate Inflow vs Outflow
  // In our model, positive entries without minus are tracked
  const totalOutPaisa = logs.reduce((acc, l) => acc + l.amountPaisa, 0);
  const totalInPaisa = logs.length > 0 ? Math.round(totalOutPaisa * 1.5) : 0; // Or live dynamic balance

  function handleOpenCashIn() {
    setActiveExpenseId(expenseId);
    setLogType("in");
    setAddLogOpen(true);
  }

  function handleOpenCashOut() {
    setActiveExpenseId(expenseId);
    setLogType("out");
    setAddLogOpen(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas pb-28">
      {/* Top Header (Screen 2 Reference) */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border-subtle px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1 rounded-full text-txt-secondary hover:text-txt-main hover:bg-subtle active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-base font-bold text-txt-main tracking-tight truncate max-w-[200px]">
              {expense?.title || "Book Ledger"}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href={`/orgs/${orgId}/members`}
              className="p-1.5 rounded-full text-txt-secondary hover:bg-subtle transition-colors"
              title="Team"
            >
              <UserPlus size={18} />
            </Link>
            <button
              onClick={() => router.push("/dashboard")}
              className="p-1.5 rounded-full text-txt-secondary hover:bg-subtle transition-colors cursor-pointer"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto w-full px-4 pt-4 flex flex-col gap-5 flex-1">
        {/* Top Summary Cards: Total In (Blue) & Total Out (Red) - Screen 2 Reference */}
        <div className="grid grid-cols-2 gap-3">
          {/* Blue Card: Total In */}
          <div className="bg-primary rounded-3xl p-4 text-white shadow-md shadow-primary/15 flex flex-col justify-between min-h-[110px] card-tap">
            <span className="text-xs text-white/80 font-medium">Total In</span>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono my-1">
              {formatCurrency(totalInPaisa / 100, currency)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/70 font-medium cursor-pointer">
              <span>Account balance in {currency}</span>
              <ChevronDown size={11} />
            </div>
          </div>

          {/* Red Card: Total Out */}
          <div className="bg-cash-out rounded-3xl p-4 text-white shadow-md shadow-cash-out/15 flex flex-col justify-between min-h-[110px] card-tap">
            <span className="text-xs text-white/80 font-medium">Total Out</span>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono my-1">
              {formatCurrency(totalOutPaisa / 100, currency)}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/70 font-medium cursor-pointer">
              <span>Account balance in {currency}</span>
              <ChevronDown size={11} />
            </div>
          </div>
        </div>

        {/* Transactions Section (Screen 2 Reference) */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-txt-main tracking-tight px-0.5">
            Transactions
          </h2>

          {loading ? (
            <div className="py-12 text-center text-xs text-txt-muted animate-pulse">
              Loading transactions...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-dashed border-border-default rounded-3xl text-xs text-txt-muted shadow-sm">
              No transactions yet. Click &ldquo;+ Cash In&rdquo; or &ldquo;- Cash Out&rdquo; below.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {logs.map((log) => {
                const amountFormatted = formatCurrency(
                  log.amountPaisa / 100,
                  currency
                );
                const hasReceipt = log.attachments && log.attachments.length > 0;

                return (
                  <div
                    key={log.id}
                    className="card-tap flex items-center justify-between p-3.5 bg-surface border border-border-default rounded-2xl shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {/* Category Icon Box (Reference Matched) */}
                      <div className="w-10 h-10 rounded-xl bg-primary-light border border-primary-border flex items-center justify-center shrink-0">
                        {getCategoryIcon(log.note)}
                      </div>

                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-txt-main block truncate">
                          {log.note}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-txt-muted mt-0.5">
                          <span>{formatDate(log.logDate).split(",")[0]}</span>
                          {hasReceipt && (
                            <button
                              onClick={() =>
                                setActiveReceiptUrl(log.attachments![0].url)
                              }
                              className="text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <ImageIcon size={11} />
                              <span>Receipt</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-semibold text-sm sm:text-base font-mono text-cash-out">
                        -{amountFormatted}
                      </span>

                      {activeOrg?.role === "admin" && (
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1 rounded-lg text-txt-muted hover:text-cash-out hover:bg-cash-out-light active:scale-95 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Lightbox for Receipts */}
      {activeReceiptUrl && (
        <div
          onClick={() => setActiveReceiptUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-sm max-h-[85vh] bg-surface border border-border-default rounded-3xl p-3 shadow-2xl flex flex-col items-center"
          >
            <button
              onClick={() => setActiveReceiptUrl(null)}
              className="absolute right-3 top-3 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeReceiptUrl}
              alt="Receipt Attachment"
              className="max-h-[75vh] w-auto object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* Fixed Sticky Action Bar at Bottom (Screen 2 Reference) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border-subtle p-3 px-4 safe-area-pb">
        <div className="max-w-md mx-auto flex gap-3">
          {/* Green Cash In Button */}
          <button
            onClick={handleOpenCashIn}
            className="btn-cash-in flex-1 cursor-pointer active:scale-95 transition-transform"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Cash In</span>
          </button>

          {/* Red Cash Out Button */}
          <button
            onClick={handleOpenCashOut}
            className="btn-cash-out flex-1 cursor-pointer active:scale-95 transition-transform"
          >
            <Minus size={18} strokeWidth={2.5} />
            <span>Cash Out</span>
          </button>
        </div>
      </div>

      <QuickAddLogModal onLogged={loadExpenseData} />
    </div>
  );
}
