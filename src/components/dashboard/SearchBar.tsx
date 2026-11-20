"use client";

import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";

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
        className="w-full bg-surface border border-border-default rounded-2xl pl-10 pr-10 py-3 text-xs text-txt-main placeholder:text-txt-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
      />
      <button
        type="button"
        className="absolute right-3 text-txt-muted hover:text-txt-secondary p-1 rounded-lg transition-colors cursor-pointer"
        title="Filter"
      >
        <SlidersHorizontal size={15} />
      </button>
    </div>
  );
}
