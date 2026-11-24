"use client";

import React from "react";
import { LocalDailyLog } from "@/lib/local-db";
import { formatCleanAmount, formatCurrency, formatDateTime } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/categories";
import {
  Calendar,
  Clock,
  Edit2,
  FileText,
  Image as ImageIcon,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  X,
} from "lucide-react";

interface LogDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: LocalDailyLog | null;
  currency?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

export default function LogDetailsModal({
  isOpen,
  onClose,
  log,
  currency = "BDT",
  onEdit,
  onDelete,
  canEdit = true,
}: LogDetailsModalProps) {
  if (!isOpen || !log) return null;

  const isIncome =
    log.type === "in" ||
    (log.type !== "out" &&
      (log.note.startsWith("[IN]") ||
        log.note.toLowerCase().includes("income") ||
        log.note.toLowerCase().includes("cash in")));

  const cleanAmount = formatCleanAmount(log.amountPaisa / 100);
  const displayNote =
    log.note.replace(/^\[IN\]\s*/, "").trim() || log.category || "Transaction";
  const CategoryIcon = getCategoryIcon(log.category);
  const hasReceipt = log.attachments && log.attachments.length > 0;
  const isEdited =
    Boolean(log.updatedBy) ||
    (log.createdAt &&
      log.updatedAt &&
      new Date(log.updatedAt).getTime() - new Date(log.createdAt).getTime() > 2000);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface border border-border-default rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-light border border-primary-border flex items-center justify-center text-primary">
              <FileText size={16} />
            </div>
            <h3 className="text-sm font-bold text-txt-main">
              Transaction Details
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-txt-muted hover:text-txt-main hover:bg-subtle transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {/* Amount Hero Card */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              isIncome
                ? "bg-cash-in-light border-cash-in-border"
                : "bg-cash-out-light border-cash-out-border"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-txt-secondary">
                {isIncome ? "Income (Cash In)" : "Expense (Cash Out)"}
              </span>
              <span
                className={`text-2xl font-black tracking-tight ${
                  isIncome ? "text-cash-in" : "text-cash-out"
                }`}
              >
                {isIncome ? `+${cleanAmount}` : `-${cleanAmount}`}{" "}
                <span className="text-sm font-semibold opacity-80">
                  {currency}
                </span>
              </span>
            </div>
            <div
              className={`p-2.5 rounded-2xl ${
                isIncome
                  ? "bg-cash-in text-white shadow-sm shadow-cash-in/30"
                  : "bg-cash-out text-white shadow-sm shadow-cash-out/30"
              }`}
            >
              {isIncome ? (
                <TrendingUp size={22} className="stroke-[2.5]" />
              ) : (
                <TrendingDown size={22} className="stroke-[2.5]" />
              )}
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-subtle/50 rounded-2xl border border-border-subtle p-3.5 flex flex-col gap-3">
            {/* Note / Memo */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">
                Note & Description
              </span>
              <p className="text-sm font-semibold text-txt-main break-words">
                {displayNote}
              </p>
            </div>

            {/* Category */}
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <span className="text-xs text-txt-secondary flex items-center gap-1.5">
                <Tag size={13} className="text-txt-muted" />
                <span>Category</span>
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border-default rounded-xl">
                <CategoryIcon size={13} className="text-primary" />
                <span className="text-xs font-semibold text-txt-main">
                  {log.category || "General"}
                </span>
              </div>
            </div>

            {/* Log Date */}
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <span className="text-xs text-txt-secondary flex items-center gap-1.5">
                <Calendar size={13} className="text-txt-muted" />
                <span>Ledger Date</span>
              </span>
              <span className="text-xs font-semibold text-txt-main">
                {log.logDate}
              </span>
            </div>
          </div>

          {/* Audit Trail Section */}
          <div className="bg-surface rounded-2xl border border-border-default p-3.5 flex flex-col gap-2.5">
            <span className="text-[11px] font-bold text-txt-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-primary" />
              <span>Audit Trail & Attribution</span>
            </span>

            {/* Created By */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-txt-muted flex items-center gap-1.5">
                <User size={13} />
                <span>Created By:</span>
              </span>
              <span className="font-semibold text-txt-main">
                {log.loggedByName || "Team Member"}
              </span>
            </div>

            {/* Created At exact timestamp */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-txt-muted">Created At:</span>
              <span className="font-medium text-txt-secondary">
                {formatDateTime(log.createdAt)}
              </span>
            </div>

            {/* Updated By (if edited) */}
            {isEdited && (
              <>
                <div className="h-px bg-border-subtle my-0.5" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                    <span>Last Edited By:</span>
                  </span>
                  <span className="font-semibold text-txt-main">
                    {log.updatedByName || log.loggedByName || "Team Member"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-txt-muted">Last Modified:</span>
                  <span className="font-medium text-txt-secondary">
                    {formatDateTime(log.updatedAt)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Receipt Attachment preview */}
          {hasReceipt && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={13} className="text-primary" />
                <span>Receipt Attachment</span>
              </span>
              <div className="relative rounded-2xl border border-border-default overflow-hidden bg-slate-950 flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={log.attachments![0].url}
                  alt="Receipt"
                  className="max-h-56 w-auto object-contain rounded-xl"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 p-3.5 px-5 bg-subtle/50 border-t border-border-subtle">
          {canEdit && onDelete && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-cash-out hover:bg-cash-out-light border border-transparent hover:border-cash-out-border transition-all cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          )}

          {canEdit && onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover active:scale-95 text-white transition-all shadow-xs cursor-pointer"
            >
              <Edit2 size={14} />
              <span>Edit Log</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
