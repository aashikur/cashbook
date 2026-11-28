"use client";

import React, { useEffect, useRef } from "react";
import { ArrowLeft, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onClose: () => void;
}

/**
 * Clean sticky focus-search header matching Entry Books' inline search aesthetic.
 */
export default function SearchBar({ value, onChange, onClose }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-surface border-b border-border-subtle">
      <div className="max-w-xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onClose}
          className="relative w-11 h-11 rounded-full flex items-center justify-center text-txt-main hover:bg-subtle active:scale-95 transition-all cursor-pointer touch-manipulation shrink-0"
          title="Exit search"
          aria-label="Exit search"
        >
          <ArrowLeft size={20} />
        </button>

        <input
          ref={inputRef}
          type="text"
          placeholder="Search by book name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onClose();
            }
          }}
          className="flex-1 min-w-0 min-h-[44px] bg-transparent text-sm text-txt-main placeholder:text-txt-muted focus:outline-none"
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-txt-muted hover:text-txt-main hover:bg-subtle active:scale-95 transition-all cursor-pointer touch-manipulation shrink-0 before:absolute before:-inset-1 before:content-['']"
            title="Clear search"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
