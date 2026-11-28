"use client";

import React from "react";
import { Archive, Info, Settings } from "lucide-react";

interface BookActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  canEdit: boolean;
  onOpenInfo: () => void;
  onOpenEdit: () => void;
  positionClass?: string;
}

/**
 * Shared 3-dot Book Actions dropdown used across Dashboard BookCard and Entry Book header.
 */
export default function BookActionsMenu({
  isOpen,
  onClose,
  canEdit,
  onOpenInfo,
  onOpenEdit,
  positionClass = "right-0 top-full mt-1.5",
}: BookActionsMenuProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={`absolute ${positionClass} w-52 bg-surface border border-border-default rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100`}
    >
      <button
        type="button"
        onClick={() => {
          onClose();
          onOpenInfo();
        }}
        className="w-full min-h-[48px] flex items-center gap-3 px-4 py-2 text-xs font-semibold text-txt-main hover:bg-subtle transition-colors text-left cursor-pointer touch-manipulation"
      >
        <Info size={16} className="text-primary shrink-0" />
        <span>Book Information</span>
      </button>

      {canEdit && (
        <>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEdit();
            }}
            className="w-full min-h-[48px] flex items-center gap-3 px-4 py-2 text-xs font-semibold text-txt-main hover:bg-subtle transition-colors text-left cursor-pointer touch-manipulation"
          >
            <Settings size={16} className="text-txt-secondary shrink-0" />
            <span>Edit Book Details</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEdit();
            }}
            className="w-full min-h-[48px] flex items-center gap-3 px-4 py-2 text-xs font-semibold text-txt-main hover:bg-subtle transition-colors text-left cursor-pointer touch-manipulation"
          >
            <Archive size={16} className="text-txt-secondary shrink-0" />
            <span>Archive / Delete</span>
          </button>
        </>
      )}
    </div>
  );
}
