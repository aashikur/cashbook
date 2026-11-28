"use client";

import React, { useEffect } from "react";
import { useConfirmStore } from "@/store/confirm-store";
import { AlertTriangle, Archive, Trash2, Info, X } from "lucide-react";

export default function ConfirmDialog() {
  const { isOpen, options, handleConfirm, handleCancel } = useConfirmStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        handleCancel();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleCancel]);

  if (!isOpen) return null;

  const IconComponent =
    options.icon === "trash"
      ? Trash2
      : options.icon === "archive"
      ? Archive
      : options.icon === "info"
      ? Info
      : AlertTriangle;

  const isDanger = options.variant === "danger";
  const isWarning = options.variant === "warning";

  return (
    <div
      onClick={handleCancel}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-surface border border-border-default rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 flex flex-col gap-4"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={handleCancel}
          className="absolute right-4 top-4 w-9 h-9 rounded-full flex items-center justify-center text-txt-muted hover:text-txt-main hover:bg-subtle transition-colors cursor-pointer touch-manipulation"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isDanger
                ? "bg-cash-out-light text-cash-out border border-cash-out-border"
                : isWarning
                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                : "bg-primary-light text-primary border border-primary-border"
            }`}
          >
            <IconComponent size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-txt-main tracking-tight leading-snug">
              {options.title}
            </h3>
            <p className="text-xs text-txt-secondary mt-1 whitespace-pre-line leading-relaxed">
              {options.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          {!options.hideCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 min-h-[46px] py-2.5 rounded-xl border border-border-default font-semibold text-xs text-txt-main hover:bg-subtle active:scale-[0.98] transition-all cursor-pointer touch-manipulation"
            >
              {options.cancelText || "Cancel"}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            autoFocus
            className={`flex-1 min-h-[46px] py-2.5 rounded-xl font-bold text-xs text-white shadow-md active:scale-[0.98] transition-all cursor-pointer touch-manipulation ${
              isDanger
                ? "bg-cash-out hover:bg-rose-700 shadow-rose-500/20"
                : isWarning
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                : "bg-primary hover:bg-primary-hover shadow-primary/20"
            }`}
          >
            {options.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
