"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Minus, MoreVertical, Plus } from "lucide-react";
import BookActionsMenu from "./BookActionsMenu";
import {
  computeBookBalancePaisa,
  formatCleanAmount,
  formatDate,
} from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/local-db";
import { useAppStore } from "@/store/app-store";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";

export type BookCardViewMode = "grid" | "list" | "columns";

interface BookCardProps {
  id: string;
  orgId: string;
  title: string;
  category?: string;
  totalSpent: number | string;
  logCount: number;
  updatedAt: string;
  createdAt?: string;
  createdByName?: string;
  updatedByName?: string;
  currency: string;
  viewMode?: BookCardViewMode;
  canManageBook?: boolean;
  isMenuOpen?: boolean;
  onToggleMenu?: () => void;
  onCloseMenu?: () => void;
  onOpenInfo?: (totals: {
    totalInPaisa: number;
    totalOutPaisa: number;
    netBalancePaisa: number;
  }) => void;
  onOpenEdit?: () => void;
}

const VIEW_STYLES: Record<
  BookCardViewMode,
  {
    wrapper: string;
    linkGap: string;
    iconBox: string;
    iconSize: number;
    showSubtitle: boolean;
    titleClass: string;
    amountClass: string;
    quickBtn: string;
    quickIcon: number;
  }
> = {
  grid: {
    wrapper: "px-3.5 sm:px-4 py-3 hover:bg-subtle/60",
    linkGap: "gap-3",
    iconBox: "w-9 h-9 rounded-xl",
    iconSize: 18,
    showSubtitle: true,
    titleClass: "text-sm font-semibold",
    amountClass: "text-sm font-bold tabular-nums",
    quickBtn: "min-w-[28px] min-h-[28px] rounded-lg",
    quickIcon: 13,
  },
  list: {
    wrapper: "px-3.5 py-2.5 hover:bg-subtle/60",
    linkGap: "gap-2.5",
    iconBox: "w-7 h-7 rounded-lg",
    iconSize: 14,
    showSubtitle: false,
    titleClass: "text-xs sm:text-sm font-semibold",
    amountClass: "text-xs sm:text-sm font-bold tabular-nums",
    quickBtn: "min-w-[26px] min-h-[26px] rounded-lg",
    quickIcon: 12,
  },
  columns: {
    wrapper:
      "px-3 py-2.5 bg-surface border border-border-default rounded-2xl shadow-2xs hover:bg-subtle/60",
    linkGap: "gap-2",
    iconBox: "w-7 h-7 rounded-lg",
    iconSize: 14,
    showSubtitle: false,
    titleClass: "text-xs font-semibold",
    amountClass: "text-xs font-bold tabular-nums whitespace-nowrap",
    quickBtn: "min-w-[26px] min-h-[26px] rounded-lg",
    quickIcon: 12,
  },
};

export default function BookCard({
  id,
  orgId,
  title,
  category,
  totalSpent,
  updatedAt,
  createdByName,
  viewMode = "grid",
  canManageBook,
  isMenuOpen = false,
  onToggleMenu,
  onCloseMenu,
  onOpenInfo,
  onOpenEdit,
}: BookCardProps) {
  const bookLogs = useLiveQuery(
    async () => {
      return await localDb.dailyLogs.where("expenseId").equals(id).toArray();
    },
    [id],
    []
  );

  const displayPaisa = computeBookBalancePaisa(
    { id, title, category, totalSpent },
    bookLogs
  );

  const isPositive = displayPaisa > 0;
  const isZero = displayPaisa === 0;
  const cleanAmount = formatCleanAmount(Math.abs(displayPaisa) / 100);

  const { setActiveExpenseId, setLogType, setAddLogOpen } = useAppStore();
  const { canAddTransaction, canEditBook } = useOrgPermissions();

  // Allows future per-book permission overrides while defaulting to workspace role
  const allowManageBook = canManageBook ?? canEditBook;
  const styles = VIEW_STYLES[viewMode];
  const bookHref = `/orgs/${orgId}/expenses/${id}`;

  function handleQuickAction(e: React.MouseEvent, type: "in" | "out") {
    e.preventDefault();
    e.stopPropagation();
    setActiveExpenseId(id);
    setLogType(type);
    setAddLogOpen(true);
  }

  function handleSettingsClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onToggleMenu?.();
  }

  function handleInfoClick() {
    let totalInPaisa = 0;
    let totalOutPaisa = 0;
    for (const log of bookLogs) {
      const isCashIn =
        log.type === "in" ||
        (log.type !== "out" &&
          (log.note?.toLowerCase().startsWith("[in]") ||
            log.note?.toLowerCase().includes("freelance") ||
            log.note?.toLowerCase().includes("salary") ||
            log.note?.toLowerCase().includes("income") ||
            log.note?.toLowerCase().includes("cash in")));
      if (isCashIn) totalInPaisa += log.amountPaisa;
      else totalOutPaisa += log.amountPaisa;
    }

    onOpenInfo?.({
      totalInPaisa,
      totalOutPaisa,
      netBalancePaisa: displayPaisa,
    });
  }

  return (
    <div
      className={`w-full flex items-center justify-between gap-2 transition-colors group ${styles.wrapper}`}
    >
      {/* Left: Book Icon + Title + Subtitle */}
      <Link
        href={bookHref}
        className={`flex items-center ${styles.linkGap} min-w-0 flex-1 cursor-pointer`}
      >
        <div
          className={`${styles.iconBox} bg-primary-light text-primary flex items-center justify-center shrink-0 border border-primary-border/80 transition-colors`}
        >
          <BookOpen size={styles.iconSize} />
        </div>

        <div className="min-w-0 flex-1">
          <h4
            className={`${styles.titleClass} text-txt-main group-hover:text-primary transition-colors truncate leading-snug`}
          >
            {title}
          </h4>
          {styles.showSubtitle && (
            <p className="text-[11px] text-txt-muted mt-0.5 truncate">
              {createdByName ? `By ${createdByName} • ` : ""}
              Updated {formatDate(updatedAt).split(",")[0] || "recently"}
            </p>
          )}
        </div>
      </Link>

      {/* Right: Balance + Compact Quick (+/-) + Three-Dot Book Settings */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href={bookHref}
          className={`${styles.amountClass} text-right cursor-pointer hover:opacity-80 transition-opacity pr-0.5 ${
            isZero
              ? "text-txt-muted"
              : isPositive
              ? "text-cash-in"
              : "text-cash-out"
          }`}
        >
          {isZero ? "0" : isPositive ? `+${cleanAmount}` : `-${cleanAmount}`}
        </Link>

        {canAddTransaction && (
          <div
            className="relative z-10 flex items-center gap-1 shrink-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              onClick={(e) => handleQuickAction(e, "in")}
              title="Quick Cash In"
              aria-label={`Quick cash in for ${title}`}
              className={`relative ${styles.quickBtn} bg-cash-in-light hover:bg-emerald-100 active:scale-90 text-cash-in border border-cash-in-border/80 flex items-center justify-center transition-all cursor-pointer touch-manipulation before:absolute before:-inset-2 before:content-['']`}
            >
              <Plus size={styles.quickIcon} className="stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={(e) => handleQuickAction(e, "out")}
              title="Quick Cash Out"
              aria-label={`Quick cash out for ${title}`}
              className={`relative ${styles.quickBtn} bg-cash-out-light hover:bg-rose-100 active:scale-90 text-cash-out border border-cash-out-border/80 flex items-center justify-center transition-all cursor-pointer touch-manipulation before:absolute before:-inset-2 before:content-['']`}
            >
              <Minus size={styles.quickIcon} className="stroke-[2.5]" />
            </button>
          </div>
        )}

        {onToggleMenu && (
          <div className="relative">
            <button
              type="button"
              onClick={handleSettingsClick}
              title="More Options"
              aria-label={`More options for ${title}`}
              aria-expanded={isMenuOpen}
              className="relative min-w-[28px] min-h-[28px] rounded-lg text-txt-muted hover:text-txt-main hover:bg-subtle active:scale-90 flex items-center justify-center transition-all cursor-pointer touch-manipulation before:absolute before:-inset-2 before:content-['']"
            >
              <MoreVertical size={15} />
            </button>

            <BookActionsMenu
              isOpen={isMenuOpen}
              onClose={() => onCloseMenu?.()}
              canEdit={Boolean(allowManageBook && onOpenEdit)}
              onOpenInfo={handleInfoClick}
              onOpenEdit={() => onOpenEdit?.()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
