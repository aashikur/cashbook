"use client";

import React from "react";
import { Download, FileText, Printer, X } from "lucide-react";
import { LocalDailyLog } from "@/lib/local-db";
import { formatCleanAmount, formatCurrency, isLogCashIn } from "@/lib/utils";

interface ExportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  currency: string;
  netBalancePaisa: number;
  totalInPaisa: number;
  totalOutPaisa: number;
  logs: LocalDailyLog[];
}

/**
 * Lightweight statement export modal triggered by the header PDF button.
 * Supports client-side Print/Save-as-PDF and CSV download for filtered entries.
 */
export default function ExportStatementModal({
  isOpen,
  onClose,
  bookTitle,
  currency,
  netBalancePaisa,
  totalInPaisa,
  totalOutPaisa,
  logs,
}: ExportStatementModalProps) {
  if (!isOpen) return null;

  function handleDownloadCsv() {
    const header = ["Date", "Type", "Category", "Remark", "Amount", "Entry By"];
    const rows = logs.map((log) => {
      const isIn = isLogCashIn(log);
      const cleanNote = (log.note || "")
        .replace(/^\[IN\]\s*/, "")
        .replace(/"/g, '""');
      const amount = (log.amountPaisa / 100).toFixed(2);
      return [
        log.logDate || "",
        isIn ? "Cash In" : "Cash Out",
        `"${(log.category || "General").replace(/"/g, '""')}"`,
        `"${cleanNote}"`,
        isIn ? amount : `-${amount}`,
        `"${(log.loggedByName || "You").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${bookTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-statement.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  }

  function handlePrintPdf() {
    onClose();
    setTimeout(() => {
      window.print();
    }, 120);
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-surface border border-border-default rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-light border border-primary-border flex items-center justify-center text-primary">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-txt-main">
                Export Book Statement
              </h3>
              <p className="text-[11px] text-txt-muted">
                {bookTitle} • {logs.length}{" "}
                {logs.length === 1 ? "entry" : "entries"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-txt-muted hover:text-txt-main hover:bg-subtle cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary Preview */}
        <div className="bg-subtle/70 border border-border-subtle rounded-2xl p-3.5 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-txt-secondary font-medium">Total In (+)</span>
            <span className="font-bold text-cash-in tabular-nums">
              {formatCleanAmount(totalInPaisa / 100)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-txt-secondary font-medium">Total Out (-)</span>
            <span className="font-bold text-cash-out tabular-nums">
              {formatCleanAmount(totalOutPaisa / 100)}
            </span>
          </div>
          <div className="border-t border-border-default pt-2 flex items-center justify-between">
            <span className="font-bold text-txt-main">Net Balance</span>
            <span
              className={`font-extrabold tabular-nums ${
                netBalancePaisa < 0 ? "text-cash-out" : "text-txt-main"
              }`}
            >
              {netBalancePaisa < 0 ? "-" : ""}
              {formatCurrency(Math.abs(netBalancePaisa) / 100, currency)}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handlePrintPdf}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-xs font-bold text-white shadow-xs cursor-pointer"
          >
            <Printer size={15} />
            <span>Print / Save PDF</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-subtle border border-border-default text-xs font-bold text-txt-main cursor-pointer"
          >
            <Download size={15} className="text-primary" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}
