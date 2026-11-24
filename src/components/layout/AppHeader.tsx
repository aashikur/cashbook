"use client";

import React, { useState, useEffect } from "react";
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
    async function loadOrgs() {
      try {
        const res = await fetch("/api/v1/orgs");
        if (res.status === 401) {
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
        if (!cancelled) {
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
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-subtle transition-colors cursor-pointer"
          >
            {/* User Avatar Circle */}
            <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {initials}
            </div>

            <div className="flex items-center gap-1 min-w-0">
              <span className="text-sm font-bold text-txt-main tracking-tight max-w-[140px] sm:max-w-[190px] truncate line-clamp-1 text-left">
                {displayName}
              </span>
              <ChevronDown size={14} className="text-txt-muted shrink-0" />
            </div>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 bg-surface border border-border-default rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
                Select Workspace / Account
              </div>

              <div className="flex flex-col gap-0.5 px-1.5">
                {orgs.map((org) => {
                  const isCurrent = activeOrg?.id === org.id;
                  return (
                    <div
                      key={org.id}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl transition-colors ${
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
                        className="flex-1 flex items-center justify-between min-w-0 pr-2 cursor-pointer text-left"
                      >
                        <span className="truncate">{org.name}</span>
                        <span className="text-[10px] text-txt-muted font-mono ml-2">
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
                        className="p-1 rounded-lg text-txt-muted hover:text-primary hover:bg-surface/80 transition-colors cursor-pointer"
                        title="Edit Workspace"
                      >
                        <Settings size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>

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

              {isSuperAdmin && (
                <>
                  <div className="my-1 border-t border-border-subtle" />
                  <Link
                    href="/admin"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-primary hover:bg-primary-light transition-colors cursor-pointer"
                  >
                    <ShieldCheck size={14} className="stroke-[2.5]" />
                    <span>Platform Super Admin</span>
                  </Link>
                </>
              )}

              <div className="my-1 border-t border-border-subtle" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-cash-out hover:bg-cash-out-light transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>

              {/* Developer Attribution (Read-only) */}
              <div className="pt-2 pb-0.5 px-4 text-center border-t border-border-subtle mt-1.5 bg-subtle/30 rounded-b-2xl">
                <span className="text-[10px] text-txt-muted block font-medium">
                  CashBook v1.0 • Designed & Developed by
                </span>
                <span className="text-[11px] font-semibold text-txt-main">
                  Aashikur Rahaman
                </span>
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
              className="w-8 h-8 rounded-full flex items-center justify-center text-txt-secondary hover:text-primary hover:bg-subtle transition-colors"
              title="Team Members & Invitations"
            >
              <UserPlus size={17} />
            </Link>
          )}
        </div>
      </div>

      {/* Edit / Delete Organization Modal */}
      <EditOrgModal />
    </header>
  );
}
