"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check, Clock, Shield, User, X } from "lucide-react";
import { useAppStore, OrgContext } from "@/store/app-store";
import { formatDate } from "@/lib/utils";

export interface PendingInvitation {
  id: string;
  orgId: string;
  orgName: string;
  orgCurrency: string;
  role: "admin" | "viewer";
  invitedBy: string;
  inviterName: string;
  inviterEmail: string;
  createdAt: string;
}

export default function NotificationBell() {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { orgs, setOrgs, setActiveOrg, activeOrg } = useAppStore();

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/invitations");
      if (res.ok) {
        const { data } = await res.json();
        setInvitations(data || []);
      }
    } catch {
      // Background poll failure handled gracefully
    }
  }, []);

  // Poll invitations on mount and every 30 seconds
  useEffect(() => {
    fetchInvitations();
    const interval = setInterval(fetchInvitations, 30000);
    return () => clearInterval(interval);
  }, [fetchInvitations]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleAccept(invite: PendingInvitation) {
    setLoadingId(invite.id);
    try {
      const res = await fetch(`/api/v1/invitations/${invite.id}/accept`, {
        method: "POST",
      });

      if (res.ok) {
        const result = await res.json();
        // Remove from list
        setInvitations((prev) => prev.filter((i) => i.id !== invite.id));

        // Re-fetch user orgs to sync switcher
        try {
          const orgsRes = await fetch("/api/v1/orgs");
          if (orgsRes.ok) {
            const { data } = await orgsRes.json();
            setOrgs(data || []);
            // If user has no active org or wants to switch
            if (!activeOrg && data && data.length > 0) {
              setActiveOrg(data[0]);
            } else if (result.data?.org) {
              // Add to store if not present
              const newOrg: OrgContext = {
                id: result.data.org.id,
                name: result.data.org.name,
                currency: result.data.org.currency,
                role: result.data.org.role,
              };
              if (!orgs.some((o) => o.id === newOrg.id)) {
                setOrgs([...orgs, newOrg]);
              }
            }
          }
        } catch {
          // Store sync fallback
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to accept invitation");
      }
    } catch {
      alert("Network error while accepting invitation");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDecline(inviteId: string) {
    setLoadingId(inviteId);
    try {
      const res = await fetch(`/api/v1/invitations/${inviteId}/decline`, {
        method: "POST",
      });

      if (res.ok) {
        setInvitations((prev) => prev.filter((i) => i.id !== inviteId));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to decline invitation");
      }
    } catch {
      alert("Network error while declining invitation");
    } finally {
      setLoadingId(null);
    }
  }

  const unreadCount = invitations.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-8 h-8 rounded-full flex items-center justify-center text-txt-secondary hover:text-primary hover:bg-subtle transition-colors relative cursor-pointer active:scale-95"
        title="Notifications & Invitations"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-in zoom-in-75">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu: Full-width on mobile, anchored w-96 on desktop */}
      {isOpen && (
        <div className="fixed left-3 right-3 top-[64px] w-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-surface border border-border-default rounded-3xl sm:rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-txt-main tracking-tight">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-primary-light text-primary font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} pending
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-txt-muted hover:text-txt-main hover:bg-subtle transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Invitation List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border-subtle/50 px-2">
            {invitations.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-txt-muted">
                <div className="w-10 h-10 rounded-full bg-subtle flex items-center justify-center text-txt-muted">
                  <Check size={18} />
                </div>
                <p className="text-xs font-medium text-txt-main">No pending invitations</p>
                <p className="text-[11px] text-txt-muted max-w-[200px]">
                  When someone invites you to their workspace, it will appear here.
                </p>
              </div>
            ) : (
              invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 my-1 rounded-xl bg-subtle/40 hover:bg-subtle transition-colors flex flex-col gap-2.5"
                >
                  {/* Top: Org & Role */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-txt-main truncate">
                        {inv.orgName}
                      </h4>
                      <p className="text-[11px] text-txt-muted flex items-center gap-1 mt-0.5">
                        <User size={11} className="shrink-0" />
                        <span className="truncate">
                          Invited by {inv.inviterName}
                        </span>
                      </p>
                    </div>

                    {/* Role Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border ${
                        inv.role === "admin"
                          ? "bg-primary-light text-primary border-primary-border"
                          : "bg-subtle text-txt-secondary border-border-default"
                      }`}
                    >
                      {inv.role === "admin" ? "Admin (Full Access)" : "Viewer (Read Only)"}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div className="text-[10px] text-txt-muted flex items-center gap-1">
                    <Clock size={10} />
                    <span>{formatDate(inv.createdAt)}</span>
                  </div>

                  {/* Action Buttons: Accept / Decline */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={loadingId === inv.id}
                      onClick={() => handleAccept(inv)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <Check size={13} className="stroke-[2.5]" />
                      <span>{loadingId === inv.id ? "Joining..." : "Accept"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={loadingId === inv.id}
                      onClick={() => handleDecline(inv.id)}
                      className="py-1.5 px-3 rounded-xl bg-surface hover:bg-subtle active:scale-95 text-txt-secondary hover:text-cash-out border border-border-default text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
