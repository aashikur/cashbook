"use client";

import React from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  BookOpen,
  Calendar,
  Clock,
  Edit2,
  FileText,
  Layers,
  Tag,
  TrendingDown,
  TrendingUp,
  User,
  X,
} from "lucide-react";

interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: {
    id: string;
    title: string;
    category?: string;
    totalSpent: number | string;
    logCount: number;
    isArchived: boolean;
    createdAt?: string;
    updatedAt?: string;
    createdByName?: string;
    updatedByName?: string;
  } | null;
  currency?: string;
  totalInPaisa?: number;
  totalOutPaisa?: number;
  netBalancePaisa?: number;
  onEdit?: () => void;
  canEdit?: boolean;
}

export default function BookDetailsModal({
  isOpen,
  onClose,
  expense,
  currency = "BDT",
  totalInPaisa = 0,
  totalOutPaisa = 0,
  netBalancePaisa = 0,
  onEdit,
  canEdit = true,
}: BookDetailsModalProps) {
  if (!isOpen || !expense) return null;

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
              <BookOpen size={16} />
            </div>
            <h3 className="text-sm font-bold text-txt-main">
              Book Ledger Information
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="relative w-11 h-11 rounded-full text-txt-muted hover:text-txt-main hover:bg-subtle active:scale-95 flex items-center justify-center transition-all cursor-pointer touch-manipulation before:absolute before:-inset-1 before:content-['']"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto flex flex-col gap-4">
          {/* Book Header Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/15">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">
                Current Net Balance
              </span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold text-white">
                {expense.isArchived ? "Archived" : "Active Ledger"}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight my-1">
              {netBalancePaisa < 0 ? "-" : ""}
              {formatCurrency(Math.abs(netBalancePaisa) / 100, currency)}
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/20 text-xs text-white/90 font-medium">
              <span>Income: {formatCurrency(totalInPaisa / 100, currency)}</span>
              <span className="text-white/40">|</span>
              <span>Expense: {formatCurrency(totalOutPaisa / 100, currency)}</span>
            </div>
          </div>

          {/* Book Details */}
          <div className="px-1 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-txt-secondary flex items-center gap-1.5">
                <BookOpen size={13} className="text-txt-muted" />
                <span>Book Title</span>
              </span>
              <span className="text-xs font-bold text-txt-main">
                {expense.title}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <span className="text-xs text-txt-secondary flex items-center gap-1.5">
                <Tag size={13} className="text-txt-muted" />
                <span>Category</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface border border-border-default text-txt-main">
                {expense.category || "General"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <span className="text-xs text-txt-secondary flex items-center gap-1.5">
                <Layers size={13} className="text-txt-muted" />
                <span>Total Recorded Logs</span>
              </span>
              <span className="text-xs font-bold text-txt-main">
                {expense.logCount} entries
              </span>
            </div>
          </div>

          {/* Audit Trail & Ownership Details */}
          <div className="px-1 pt-2 border-t border-border-subtle flex flex-col gap-2.5">
            <span className="text-[11px] font-bold text-txt-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-primary" />
              <span>Creation & Modification Audit</span>
            </span>

            {/* Created By */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-txt-muted flex items-center gap-1.5">
                <User size={13} />
                <span>Opened / Created By:</span>
              </span>
              <span className="font-semibold text-txt-main">
                {expense.createdByName || "Team Admin"}
              </span>
            </div>

            {/* Created At */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-txt-muted flex items-center gap-1.5">
                <Calendar size={13} />
                <span>Opened On:</span>
              </span>
              <span className="font-medium text-txt-secondary">
                {formatDateTime(expense.createdAt)}
              </span>
            </div>

            {/* Last Modified */}
            <div className="h-px bg-border-subtle my-0.5" />

            <div className="flex items-center justify-between text-xs">
              <span className="text-txt-muted">Last Activity By:</span>
              <span className="font-semibold text-txt-main">
                {expense.updatedByName || expense.createdByName || "Team Admin"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-txt-muted">Last Activity On:</span>
              <span className="font-medium text-txt-secondary">
                {formatDateTime(expense.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 p-3 px-4 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-txt-secondary hover:text-txt-main hover:bg-subtle transition-colors cursor-pointer"
          >
            Close
          </button>

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
              <span>Edit Details</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
