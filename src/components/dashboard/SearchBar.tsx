"use client";

import React from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative flex items-center w-full">
      <Search
        size={16}
        className="absolute left-3.5 text-txt-muted pointer-events-none"
      />
      <input
        type="text"
        placeholder="Search books"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[44px] bg-surface border border-border-default rounded-2xl pl-10 pr-10 py-2.5 text-sm sm:text-xs text-txt-main placeholder:text-txt-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="relative right-2 -ml-8 min-w-[36px] min-h-[36px] flex items-center justify-center text-txt-muted hover:text-txt-main rounded-xl transition-colors cursor-pointer touch-manipulation before:absolute before:-inset-1.5 before:content-['']"
          title="Clear search"
          aria-label="Clear search"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
