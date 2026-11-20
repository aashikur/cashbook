"use client";

import React from "react";
import { useAppStore } from "@/store/app-store";
import { Calendar, X } from "lucide-react";

export default function DateFilterBar() {
  const { selectedDate, setSelectedDate, clearDateFilter } = useAppStore();

  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold text-txt-main">
          Your books
        </h3>
      </div>

      {/* Date Filter Input */}
      <div className="relative flex items-center">
        <div className="relative flex items-center">
          <Calendar
            size={14}
            className="absolute left-2.5 pointer-events-none text-txt-muted"
          />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-surface hover:bg-subtle border border-border-default rounded-xl pl-8 pr-7 py-1.5 text-xs text-txt-main font-medium shadow-xs focus:outline-none focus:border-primary transition-colors"
          />
          {selectedDate && (
            <button
              onClick={clearDateFilter}
              className="absolute right-2 text-txt-muted hover:text-txt-secondary p-0.5 rounded cursor-pointer active:scale-90 transition-all"
              title="Clear date filter"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
