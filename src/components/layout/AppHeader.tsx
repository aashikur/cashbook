"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { signOut, useSession } from "@/lib/auth-client";
import {
  Activity,
  ChevronDown,
  LogOut,
  Plus,
  UserPlus,
  WifiOff,
} from "lucide-react";

interface OrgItem {
  id: string;
  name: string;
  currency: string;
  role: "admin" | "viewer";
}

export default function AppHeader() {
  const router = useRouter();
  const { data: session } = useSession();
  const { activeOrg, setActiveOrg, setOrgSwitcherOpen } = useAppStore();

  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    async function loadOrgs() {
      try {
        const res = await fetch("/api/v1/orgs");
        if (res.ok) {
          const { data } = await res.json();
          setOrgs(data);
          if (!activeOrg && data.length > 0) {
            setActiveOrg({
              id: data[0].id,
              name: data[0].name,
              currency: data[0].currency,
              role: data[0].role,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load organizations:", err);
      }
    }
    loadOrgs();
  }, [activeOrg, setActiveOrg]);

  async function handleLogout() {
    await signOut();
    router.push("/sign-in");
  }

  const displayName =
    session?.user?.name || activeOrg?.name || "My Account";

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full bg-surface border-b border-border-subtle px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* User Profile & Org Switcher (Screen 1 Reference) */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-subtle transition-colors cursor-pointer"
          >
            {/* User Avatar Circle */}
            <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {initials}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-txt-main tracking-tight max-w-[150px] sm:max-w-[180px] truncate">
                {displayName}
              </span>
              <ChevronDown size={14} className="text-txt-muted" />
            </div>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 bg-surface border border-border-default rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-1.5 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
                Select Workspace / Account
              </div>

              {orgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setActiveOrg(org);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left hover:bg-subtle transition-colors cursor-pointer ${
                    activeOrg?.id === org.id
                      ? "text-primary font-bold bg-primary-light"
                      : "text-txt-secondary"
                  }`}
                >
                  <span className="truncate">{org.name}</span>
                  <span className="text-[10px] text-txt-muted font-mono">
                    {org.currency}
                  </span>
                </button>
              ))}

              <div className="my-1 border-t border-border-subtle" />

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setOrgSwitcherOpen(true);
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary-light transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Create New Workspace</span>
              </button>

              <div className="my-1 border-t border-border-subtle" />

              <Link
                href="/health"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-txt-secondary hover:text-txt-main hover:bg-subtle transition-colors cursor-pointer"
              >
                <Activity size={14} className="text-cash-in" />
                <span>System Health & Status</span>
              </Link>

              <div className="my-1 border-t border-border-subtle" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-cash-out hover:bg-cash-out-light transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Action Icons (Screen 1 Reference) */}
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span
              className="flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200"
              title="Working offline"
            >
              <WifiOff size={12} />
              <span className="hidden sm:inline">Offline</span>
            </span>
          )}

          {activeOrg && (
            <Link
              href={`/orgs/${activeOrg.id}/members`}
              className="w-8 h-8 rounded-full flex items-center justify-center text-txt-secondary hover:text-primary hover:bg-subtle transition-colors"
              title="Team Members & Invitations"
            >
              <UserPlus size={17} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
