"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore, OrgContext } from "@/store/app-store";
import { signOut, useSession } from "@/lib/auth-client";
import EditOrgModal from "@/components/dashboard/EditOrgModal";
import NotificationBell from "@/components/layout/NotificationBell";
import { isSuperAdminEmail } from "@/lib/admin-constants";
import {
  Activity,
  ChevronDown,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  UserPlus,
  WifiOff,
} from "lucide-react";

export default function AppHeader() {
  const router = useRouter();
  const { data: session } = useSession();
  const {
    activeOrg,
    setActiveOrg,
    orgs,
    setOrgs,
    setOrgSwitcherOpen,
    setIsOrgsLoading,
    setEditOrgOpen,
    setEditingOrg,
  } = useAppStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setIsDropdownOpen(false);
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("touchstart", handleOutside);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isDropdownOpen]);

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
    let cancelled = false;
    let redirecting = false;
    async function loadOrgs() {
      try {
        const res = await fetch("/api/v1/orgs");
        if (res.status === 401) {
          redirecting = true;
          router.push("/sign-in");
          return;
        }
        if (res.ok && !cancelled) {
          const { data } = await res.json();
          setOrgs(data || []);
          if (data && data.length > 0) {
            const currentActive = useAppStore.getState().activeOrg;
            if (!currentActive || !data.some((o: OrgContext) => o.id === currentActive.id)) {
              setActiveOrg({
                id: data[0].id,
                name: data[0].name,
                currency: data[0].currency,
                role: data[0].role,
              });
            }
          } else {
            setActiveOrg(null);
          }
        }
      } catch (err) {
        console.error("Failed to load organizations:", err);
      } finally {
        if (!cancelled && !redirecting) {
          setIsOrgsLoading(false);
        }
      }
    }
    loadOrgs();
    return () => {
      cancelled = true;
    };
  }, [router, setActiveOrg, setIsOrgsLoading, setOrgs]);

  async function handleLogout() {
    await signOut();
    router.push("/sign-in");
  }

  const isSuperAdmin = session?.user?.email
    ? isSuperAdminEmail(session.user.email)
    : false;

  const displayName =
    activeOrg?.name || session?.user?.name || "My Workspace";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "CB";

  return (
    <header className="sticky top-0 z-40 w-full bg-surface border-b border-border-subtle px-4 py-3">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        {/* User Profile & Org Switcher (Screen 1 Reference) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="relative flex items-center gap-2.5 p-1 pr-2 min-h-[44px] rounded-full hover:bg-subtle transition-colors cursor-pointer touch-manipulation before:absolute before:-inset-1 before:content-['']"
            aria-expanded={isDropdownOpen}
            aria-haspopup="menu"
          >
            {/* User Avatar Circle */}
            <div className="w-9 h-9 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
              {initials}
            </div>

            <div className="flex items-center gap-1 min-w-0">
              <span className="text-sm font-bold text-txt-main tracking-tight max-w-[140px] sm:max-w-[190px] truncate line-clamp-1 text-left">
                {displayName}
              </span>
              <ChevronDown size={15} className="text-txt-muted shrink-0" />
            </div>
          </button>

          {/* Dropdown Menu: Full-width on mobile for easy thumb reach, anchored w-80 on desktop */}
          {isDropdownOpen && (
            <div
              role="menu"
              className="fixed left-3 right-3 top-[64px] w-auto sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:w-80 bg-surface border border-border-default rounded-3xl sm:rounded-2xl shadow-2xl py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-4 py-2 text-[11px] font-bold text-txt-muted uppercase tracking-wider truncate">
                Select Your Business / Workspace
              </div>

              <div className="flex flex-col gap-1 px-2 max-h-64 overflow-y-auto">
                {orgs.map((org) => {
                  const isCurrent = activeOrg?.id === org.id;
                  return (
                    <div
                      key={org.id}
                      className={`w-full flex items-center justify-between min-h-[48px] px-3 py-1.5 text-sm sm:text-xs rounded-2xl sm:rounded-xl transition-colors ${
                        isCurrent
                          ? "text-primary font-bold bg-primary-light"
                          : "text-txt-secondary hover:bg-subtle"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveOrg(org);
                          setIsDropdownOpen(false);
                        }}
                        className="flex-1 flex items-center justify-between min-h-[44px] min-w-0 pr-2 cursor-pointer text-left touch-manipulation"
                      >
                        <span className="truncate font-semibold">{org.name}</span>
                        <span className="text-[11px] text-txt-muted font-mono ml-2 shrink-0">
                          {org.currency}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingOrg(org);
                          setEditOrgOpen(true);
                          setIsDropdownOpen(false);
                        }}
                        className="relative min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-txt-muted hover:text-primary hover:bg-surface/80 active:scale-90 transition-all cursor-pointer touch-manipulation before:absolute before:-inset-1 before:content-['']"
                        title="Edit Workspace"
                        aria-label={`Edit ${org.name}`}
                      >
                        <Settings size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="my-1.5 border-t border-border-subtle" />

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  setOrgSwitcherOpen(true);
                }}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-2.5 text-sm sm:text-xs font-semibold text-primary hover:bg-primary-light active:scale-[0.99] transition-all cursor-pointer touch-manipulation"
              >
                <Plus size={16} />
                <span>Create New Workspace</span>
              </button>

              {isSuperAdmin && (
                <>
                  <div className="my-1.5 border-t border-border-subtle" />
                  <Link
                    href="/health"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full min-h-[48px] flex items-center gap-3 px-4 py-2.5 text-sm sm:text-xs font-semibold text-txt-secondary hover:text-txt-main hover:bg-subtle active:scale-[0.99] transition-all cursor-pointer touch-manipulation"
                  >
                    <Activity size={16} className="text-cash-in" />
                    <span>System Health & Status</span>
                  </Link>

                  <Link
                    href="/admin"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full min-h-[48px] flex items-center gap-3 px-4 py-2.5 text-sm sm:text-xs font-bold text-primary hover:bg-primary-light active:scale-[0.99] transition-all cursor-pointer touch-manipulation"
                  >
                    <ShieldCheck size={16} className="stroke-[2.5]" />
                    <span>Platform Super Admin</span>
                  </Link>
                </>
              )}

              <div className="my-1.5 border-t border-border-subtle" />

              <button
                type="button"
                onClick={handleLogout}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-2.5 text-sm sm:text-xs font-semibold text-cash-out hover:bg-cash-out-light active:scale-[0.99] transition-all cursor-pointer touch-manipulation"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>

              {/* Developer Attribution (Read-only) */}
              <div className="py-2.5 px-3 text-center border-t border-border-subtle mt-1.5 bg-subtle/30 rounded-b-3xl sm:rounded-b-2xl">
                <p className="text-[11px] text-txt-muted font-medium whitespace-nowrap tracking-tight">
                  CashBook v1.1 • Designed & Developed by{" "}
                  <span className="font-semibold text-txt-main">
                    Aashikur Rahaman
                  </span>
                </p>
              </div>
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

          {isSuperAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary-light hover:bg-blue-100 text-primary border border-primary-border text-[11px] font-bold transition-all shadow-2xs"
              title="Platform Super Admin Console"
            >
              <ShieldCheck size={13} className="stroke-[2.5]" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          {/* Workspace Invitations Notification Bell */}
          <NotificationBell />

          {activeOrg && (
            <Link
              href={`/orgs/${activeOrg.id}/members`}
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-txt-secondary hover:text-primary hover:bg-subtle active:scale-95 transition-all touch-manipulation before:absolute before:-inset-1 before:content-['']"
              title="Team Members & Invitations"
              aria-label="Team Members & Invitations"
            >
              <UserPlus size={18} />
            </Link>
          )}
        </div>
      </div>

      {/* Edit / Delete Organization Modal */}
      <EditOrgModal />
    </header>
  );
}
