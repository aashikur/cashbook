"use client";

import React from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface BookCardProps {
  id: string;
  orgId: string;
  title: string;
  category?: string;
  totalSpent: number | string;
  logCount: number;
  updatedAt: string;
  currency: string;
}

export default function BookCard({
  id,
  orgId,
  title,
  totalSpent,
  updatedAt,
  currency,
}: BookCardProps) {
  const paisa =
    typeof totalSpent === "string"
      ? parseInt(totalSpent, 10) || 0
      : totalSpent;

  // Format amount cleanly without unnecessary decimals if whole
  const amountFormatted = formatCurrency(paisa / 100, currency);

  return (
    <Link
      href={`/orgs/${orgId}/expenses/${id}`}
      className="card-tap flex items-center justify-between p-4 bg-surface border border-border-default rounded-2xl transition-all shadow-sm group cursor-pointer block"
    >
      <div className="flex items-center gap-3.5 min-w-0 pr-2">
        {/* Blue Book Icon Box (Reference Matched) */}
        <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0 border border-primary-border group-hover:bg-primary-light transition-colors">
          <BookOpen size={20} />
        </div>

        {/* Title & Updated Date */}
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-txt-main group-hover:text-primary transition-colors truncate">
            {title}
          </h4>
          <p className="text-[11px] text-txt-muted mt-0.5 truncate">
            Updated on {formatDate(updatedAt).split(",")[0] || "recently"}
          </p>
        </div>
      </div>

      {/* Amount on Right */}
      <div className="font-semibold text-sm sm:text-base text-right font-mono shrink-0 text-txt-main">
        {amountFormatted}
      </div>
    </Link>
  );
}
