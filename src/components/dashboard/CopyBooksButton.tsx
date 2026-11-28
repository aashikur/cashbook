"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Check, ChevronDown, Copy, FileSpreadsheet } from "lucide-react";
import { ExpenseItem } from "./ExpenseLedgerList";
import { computeBookBalancePaisa, formatCleanAmount } from "@/lib/utils";

export type CopyFormat = "tsv" | "keyValue" | "csv";

interface CopyBooksButtonProps {
  expenses: ExpenseItem[];
  logsByExpenseId?: Map<
    string,
    Array<{ type?: string; note?: string; amountPaisa: number }>
  >;
  sortOption?: string;
  variant?: "surface" | "gradient";
}

export default function CopyBooksButton({
  expenses,
  logsByExpenseId,
  sortOption = "updated",
  variant = "surface",
}: CopyBooksButtonProps) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // User preferences saved in localStorage
  const [format, setFormat] = useState<CopyFormat>("tsv");
  const [stripPrefix, setStripPrefix] = useState(false);
  const [formattedNumbers, setFormattedNumbers] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedFormat = localStorage.getItem("cashbook_copy_format") as CopyFormat;
      if (savedFormat === "tsv" || savedFormat === "keyValue" || savedFormat === "csv") {
        setFormat(savedFormat);
      }
      const savedStrip = localStorage.getItem("cashbook_copy_strip_prefix");
      if (savedStrip !== null) {
        setStripPrefix(savedStrip === "true");
      }
      const savedNum = localStorage.getItem("cashbook_copy_format_numbers");
      if (savedNum !== null) {
        setFormattedNumbers(savedNum === "true");
      }
    }
  }, []);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function handleFormatChange(newFormat: CopyFormat) {
    setFormat(newFormat);
    if (typeof window !== "undefined") {
      localStorage.setItem("cashbook_copy_format", newFormat);
    }
  }

  function handleStripPrefixToggle(val: boolean) {
    setStripPrefix(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("cashbook_copy_strip_prefix", String(val));
    }
  }

  function handleFormattedNumbersToggle(val: boolean) {
    setFormattedNumbers(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("cashbook_copy_format_numbers", String(val));
    }
  }

  // Generate payload based on current expenses and settings
  const copyPayload = useMemo(() => {
    if (!expenses || expenses.length === 0) {
      return { plainText: "", htmlTable: "", rowCount: 0 };
    }

    const rows = expenses.map((exp) => {
      const logs = logsByExpenseId?.get(exp.id);
      const paisa = computeBookBalancePaisa(exp, logs);
      const amount = paisa / 100;

      let title = exp.title.trim();
      if (stripPrefix) {
        // Strip leading numbers e.g. "01 Cash" -> "Cash", "05 Rocket_Hri_Per" -> "Rocket_Hri_Per"
        const cleaned = title.replace(/^\d+[\s._-]+/, "").trim();
        if (cleaned) title = cleaned;
      }

      const sign = amount < 0 ? "-" : "";
      const absVal = Math.abs(amount);
      const valStr = formattedNumbers
        ? `${sign}${formatCleanAmount(absVal)}`
        : amount.toString();

      return { title, valStr, amount };
    });

    if (format === "keyValue") {
      const plainText = rows.map((r) => `${r.title} : ${r.valStr}`).join("\n");
      return { plainText, htmlTable: "", rowCount: rows.length };
    }

    if (format === "csv") {
      const plainText = rows
        .map((r) => `"${r.title.replace(/"/g, '""')}",${r.valStr}`)
        .join("\n");
      return { plainText, htmlTable: "", rowCount: rows.length };
    }

    // Default: TSV (Excel / Google Sheets columns)
    const plainText = rows.map((r) => `${r.title}\t${r.valStr}`).join("\n");
    const htmlTable = `<table><tbody>${rows
      .map(
        (r) =>
          `<tr><td>${r.title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td><td>${r.valStr}</td></tr>`
      )
      .join("")}</tbody></table>`;

    return { plainText, htmlTable, rowCount: rows.length };
  }, [expenses, logsByExpenseId, format, stripPrefix, formattedNumbers]);

  async function handleCopy(overrideFormat?: CopyFormat) {
    const activeFmt = overrideFormat || format;
    let textToCopy = copyPayload.plainText;
    let htmlToCopy = copyPayload.htmlTable;

    // If an override format was clicked from the menu
    if (overrideFormat && overrideFormat !== format) {
      handleFormatChange(overrideFormat);
      // Recompute for override
      const rows = expenses.map((exp) => {
        const logs = logsByExpenseId?.get(exp.id);
        const paisa = computeBookBalancePaisa(exp, logs);
        const amount = paisa / 100;
        let title = exp.title.trim();
        if (stripPrefix) {
          const cleaned = title.replace(/^\d+[\s._-]+/, "").trim();
          if (cleaned) title = cleaned;
        }
        const sign = amount < 0 ? "-" : "";
        const absVal = Math.abs(amount);
        const valStr = formattedNumbers
          ? `${sign}${formatCleanAmount(absVal)}`
          : amount.toString();
        return { title, valStr };
      });

      if (overrideFormat === "keyValue") {
        textToCopy = rows.map((r) => `${r.title} : ${r.valStr}`).join("\n");
        htmlToCopy = "";
      } else if (overrideFormat === "csv") {
        textToCopy = rows
          .map((r) => `"${r.title.replace(/"/g, '""')}",${r.valStr}`)
          .join("\n");
        htmlToCopy = "";
      } else {
        textToCopy = rows.map((r) => `${r.title}\t${r.valStr}`).join("\n");
        htmlToCopy = `<table><tbody>${rows
          .map(
            (r) =>
              `<tr><td>${r.title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td><td>${r.valStr}</td></tr>`
          )
          .join("")}</tbody></table>`;
      }
    }

    if (!textToCopy) return;

    let success = false;
    try {
      if (htmlToCopy && typeof window !== "undefined" && window.ClipboardItem && navigator.clipboard) {
        const textBlob = new Blob([textToCopy], { type: "text/plain" });
        const htmlBlob = new Blob([htmlToCopy], { type: "text/html" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": textBlob,
            "text/html": htmlBlob,
          }),
        ]);
        success = true;
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        success = true;
      }
    } catch {
      // Fallback
      try {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        success = true;
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      const fmtName =
        activeFmt === "tsv"
          ? "Excel (Columns)"
          : activeFmt === "keyValue"
          ? "Key : Value"
          : "CSV";
      setToastMessage(
        `${copyPayload.rowCount} books copied (${fmtName})`
      );
      setTimeout(() => setCopied(false), 2200);
      setTimeout(() => setToastMessage(null), 3000);
      setMenuOpen(false);
    }
  }

  if (!expenses || expenses.length === 0) {
    return null;
  }

  const isSurface = variant === "surface";

  return (
    <div className="relative inline-flex flex-col items-end z-20 shrink-0" ref={menuRef}>
      {/* Toast Feedback Notification Pill */}
      {toastMessage && (
        <div className="absolute top-full right-0 mt-2 whitespace-nowrap bg-slate-900/95 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150 pointer-events-none z-50">
          {toastMessage}
        </div>
      )}

      {/* Split Copy + Format Options Button Group */}
      <div
        className={`flex items-center rounded-xl p-0.5 transition-all ${
          isSurface
            ? "bg-subtle hover:bg-border-default/60 border border-border-default text-txt-main shadow-2xs"
            : "bg-white/15 hover:bg-white/20 border border-white/25 backdrop-blur-md shadow-sm text-white"
        }`}
      >
        <button
          type="button"
          onClick={() => handleCopy()}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg active:scale-95 transition-all cursor-pointer touch-manipulation ${
            isSurface ? "hover:bg-surface" : "hover:bg-white/10"
          }`}
          title={`Copy ${copyPayload.rowCount} books in current order`}
        >
          {copied ? (
            <>
              <Check
                size={14}
                className={`stroke-[3] animate-in zoom-in duration-150 ${
                  isSurface ? "text-cash-in" : "text-emerald-300"
                }`}
              />
              <span
                className={`font-bold ${
                  isSurface ? "text-cash-in" : "text-emerald-200"
                }`}
              >
                Copied!
              </span>
            </>
          ) : (
            <>
              <Copy size={13} className="stroke-[2.2]" />
              <span>Copy</span>
            </>
          )}
        </button>

        <div
          className={`w-[1px] h-4 ${
            isSurface ? "bg-border-default" : "bg-white/25"
          }`}
        />

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer touch-manipulation ${
            isSurface
              ? menuOpen
                ? "bg-surface text-primary"
                : "text-txt-secondary hover:bg-surface hover:text-txt-main"
              : menuOpen
              ? "bg-white/15 text-white"
              : "text-white/80 hover:bg-white/10"
          }`}
          title="Copy format options"
          aria-expanded={menuOpen}
        >
          <ChevronDown
            size={13}
            className={`transition-transform duration-150 ${
              menuOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Dropdown Options Menu */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border-default rounded-2xl shadow-2xl p-2.5 z-50 text-txt-main animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-2.5">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-txt-main">
              <FileSpreadsheet size={15} className="text-primary" />
              <span>Copy Books Data</span>
            </div>
            <span className="text-[10px] font-semibold text-txt-muted bg-subtle px-1.5 py-0.5 rounded-md">
              {copyPayload.rowCount} books
            </span>
          </div>

          {/* Current Order Notice */}
          <div className="text-[11px] text-txt-secondary leading-tight">
            Copies in current order:{" "}
            <span className="font-semibold text-txt-main capitalize">
              {sortOption}
            </span>
          </div>

          {/* Format Selection */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-txt-muted">
              Format
            </span>

            {/* TSV: Excel Columns */}
            <button
              type="button"
              onClick={() => handleCopy("tsv")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                format === "tsv"
                  ? "bg-primary-light text-primary font-semibold border border-primary-border/60"
                  : "hover:bg-subtle text-txt-main"
              }`}
            >
              <div className="flex flex-col">
                <span className="font-semibold">Excel (2 Columns)</span>
                <span className="text-[10px] text-txt-muted">
                  Pastes into Book & Balance columns
                </span>
              </div>
              {format === "tsv" && (
                <Check size={14} className="stroke-[2.5] text-primary shrink-0" />
              )}
            </button>

            {/* Key : Value */}
            <button
              type="button"
              onClick={() => handleCopy("keyValue")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                format === "keyValue"
                  ? "bg-primary-light text-primary font-semibold border border-primary-border/60"
                  : "hover:bg-subtle text-txt-main"
              }`}
            >
              <div className="flex flex-col">
                <span className="font-semibold">Key : Value</span>
                <span className="text-[10px] text-txt-muted">
                  Cash : 121075 (Text format)
                </span>
              </div>
              {format === "keyValue" && (
                <Check size={14} className="stroke-[2.5] text-primary shrink-0" />
              )}
            </button>

            {/* CSV */}
            <button
              type="button"
              onClick={() => handleCopy("csv")}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                format === "csv"
                  ? "bg-primary-light text-primary font-semibold border border-primary-border/60"
                  : "hover:bg-subtle text-txt-main"
              }`}
            >
              <div className="flex flex-col">
                <span className="font-semibold">CSV</span>
                <span className="text-[10px] text-txt-muted">
                  &quot;Cash&quot;,121075
                </span>
              </div>
              {format === "csv" && (
                <Check size={14} className="stroke-[2.5] text-primary shrink-0" />
              )}
            </button>
          </div>

          {/* Options & Toggles */}
          <div className="pt-1.5 border-t border-border-subtle/60 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-txt-muted">
              Options
            </span>

            {/* Strip numbering prefix toggle */}
            <label className="flex items-center justify-between gap-2 text-xs text-txt-main cursor-pointer select-none hover:text-txt-main">
              <span className="text-[11px]">
                Clean &apos;01 &apos; prefix (<span className="text-txt-muted font-mono">01 Cash → Cash</span>)
              </span>
              <input
                type="checkbox"
                checked={stripPrefix}
                onChange={(e) => handleStripPrefixToggle(e.target.checked)}
                className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary/20 cursor-pointer"
              />
            </label>

            {/* Formatted numbers toggle */}
            <label className="flex items-center justify-between gap-2 text-xs text-txt-main cursor-pointer select-none hover:text-txt-main">
              <span className="text-[11px]">
                With commas (<span className="text-txt-muted font-mono">121,075</span>)
              </span>
              <input
                type="checkbox"
                checked={formattedNumbers}
                onChange={(e) => handleFormattedNumbersToggle(e.target.checked)}
                className="w-4 h-4 rounded border-border-default text-primary focus:ring-primary/20 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
