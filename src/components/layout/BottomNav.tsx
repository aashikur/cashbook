"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { BookOpen, CreditCard, Settings } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const { activeOrg } = useAppStore();

  const isBooksActive =
    pathname === "/dashboard" ||
    (pathname.startsWith("/orgs") &&
      !pathname.includes("/reports") &&
      !pathname.includes("/settings") &&
      !pathname.includes("/members") &&
      !pathname.includes("/expenses"));
  const isReportsActive = pathname.includes("/reports");
  const isSettingsActive =
    pathname.includes("/settings") || pathname.includes("/members");

  // On deep expense drill-down, BottomNav is replaced by the sticky Cash In / Cash Out action bar
  if (pathname.includes("/expenses/")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border-subtle py-2 px-6 safe-area-pb">
      <div className="max-w-xl mx-auto flex items-center justify-around">
        {/* Tab 1: Books */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
            isBooksActive
              ? "text-primary"
              : "text-txt-muted hover:text-txt-secondary"
          }`}
        >
          <BookOpen size={20} strokeWidth={isBooksActive ? 2.5 : 2} />
          <span>Books</span>
        </Link>

        {/* Tab 2: Transactions / Reports */}
        <Link
          href={activeOrg ? `/orgs/${activeOrg.id}/reports` : "/dashboard"}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
            isReportsActive
              ? "text-primary"
              : "text-txt-muted hover:text-txt-secondary"
          }`}
        >
          <CreditCard size={20} strokeWidth={isReportsActive ? 2.5 : 2} />
          <span>Transactions</span>
        </Link>

        {/* Tab 3: Settings Hub */}
        <Link
          href={activeOrg ? `/orgs/${activeOrg.id}/settings` : "/dashboard"}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
            isSettingsActive
              ? "text-primary"
              : "text-txt-muted hover:text-txt-secondary"
          }`}
        >
          <Settings size={20} strokeWidth={isSettingsActive ? 2.5 : 2} />
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  );
}
