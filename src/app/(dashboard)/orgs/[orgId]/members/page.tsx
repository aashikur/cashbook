"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";
import { useAppStore, useStoreHydrated } from "@/store/app-store";
import { confirmDialog, alertDialog } from "@/store/confirm-store";
import {
  ArrowLeft,
  Building2,
  Clock,
  Eye,
  Mail,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

type PageProps = {
  params: Promise<{ orgId: string }>;
};

interface MemberItem {
  id: string;
  userId: string;
  userEmail: string;
  role: "admin" | "viewer";
  status: "pending" | "active" | "revoked";
  joinedAt: string;
}

export default function MembersPage({ params }: PageProps) {
  const { orgId } = use(params);
  const { activeOrg, setActiveOrg } = useAppStore();
  const hasHydrated = useStoreHydrated();

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [orgNotFound, setOrgNotFound] = useState(false);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Ensure activeOrg matches route orgId on direct reload
  useEffect(() => {
    if (!activeOrg || activeOrg.id !== orgId) {
      fetch(`/api/v1/orgs/${orgId}`, { cache: "no-store" })
        .then((r) => {
          if (r.status === 404 || r.status === 403) {
            setOrgNotFound(true);
            return null;
          }
          return r.ok ? r.json() : null;
        })
        .then((res) => {
          if (res?.data) {
            setActiveOrg({
              id: res.data.id,
              name: res.data.name,
              currency: res.data.currency || "USD",
              role: res.data.role || "viewer",
            });
          }
        })
        .catch(console.error);
    }
  }, [orgId, activeOrg, setActiveOrg]);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/orgs/${orgId}/members`, {
        cache: "no-store",
      });
      if (res.status === 404 || res.status === 403) {
        setOrgNotFound(true);
        return;
      }
      if (res.ok) {
        const { data } = await res.json();
        setMembers(data || []);
      }
    } catch (err) {
      console.error("Failed to load members:", err);
    } finally {
      setIsInitialLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/v1/orgs/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to invite member");
        return;
      }

      setSuccess(`Invitation sent to ${email.trim()}`);
      setEmail("");
      loadMembers();
    } catch {
      setError("Network error while inviting member");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: "admin" | "viewer") {
    try {
      const res = await fetch(`/api/v1/orgs/${orgId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        loadMembers();
      } else {
        const data = await res.json().catch(() => ({}));
        await alertDialog(
          "Update Failed",
          data.error || "Failed to update member role",
          "warning"
        );
      }
    } catch {
      await alertDialog(
        "Network Error",
        "Failed to communicate with server to update member role",
        "danger"
      );
    }
  }

  async function handleRemoveMember(userId: string) {
    const confirmed = await confirmDialog({
      title: "Remove Workspace Member?",
      description:
        "Are you sure you want to remove this member? They will lose access to all organization ledgers.",
      confirmText: "Remove Member",
      cancelText: "Keep Member",
      variant: "danger",
      icon: "trash",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/v1/orgs/${orgId}/members/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadMembers();
      } else {
        const data = await res.json().catch(() => ({}));
        await alertDialog(
          "Remove Failed",
          data.error || "Failed to remove member",
          "warning"
        );
      }
    } catch {
      await alertDialog(
        "Network Error",
        "Failed to remove member from organization",
        "danger"
      );
    }
  }

  const isAdmin = hasHydrated && activeOrg?.id === orgId && activeOrg?.role === "admin";
  const showSkeleton = isInitialLoading || !hasHydrated;

  if (!showSkeleton && orgNotFound) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas pb-24">
        <AppHeader />
        <main className="max-w-xl mx-auto w-full px-4 py-20 flex flex-col items-center justify-center text-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-3xl bg-primary-light border border-primary-border flex items-center justify-center text-primary shadow-sm">
            <Building2 size={30} />
          </div>
          <h1 className="text-xl font-bold text-txt-main tracking-tight">
            Organization Not Found
          </h1>
          <p className="text-xs text-txt-secondary max-w-xs">
            This workspace does not exist or you do not have permission to manage its members.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-xs font-semibold text-white shadow-sm transition-all"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas pb-24">
      <AppHeader />

      <main className="max-w-xl mx-auto w-full px-4 pt-5 flex flex-col gap-5 flex-1">
        {/* Top Navigation & Page Title Card */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="relative w-10 h-10 rounded-full bg-surface border border-border-default flex items-center justify-center text-txt-secondary hover:text-txt-main hover:bg-subtle active:scale-95 transition-all shadow-2xs shrink-0 touch-manipulation before:absolute before:-inset-1.5 before:content-['']"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-primary-light border border-primary-border flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <Users size={21} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-txt-main tracking-tight truncate">
                Team & Access Control
              </h1>
              <p className="text-xs text-txt-secondary truncate">
                Manage Admin & Viewer roles for{" "}
                <span className="font-semibold text-txt-main">
                  {activeOrg?.name || "this workspace"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Invite Form (Admin only; never shown to Viewers or during initial load) */}
        {!showSkeleton && isAdmin && (
            <form
              onSubmit={handleInvite}
              className="bg-surface border border-border-default rounded-3xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-txt-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus size={14} className="text-primary" />
                  <span>Invite New Member</span>
                </h2>
                <span className="text-[10px] font-semibold text-primary bg-primary-light px-2 py-0.5 rounded-full border border-primary-border">
                  Admin Access
                </span>
              </div>

              {error && (
                <div className="bg-cash-out-light border border-cash-out-border text-cash-out text-xs font-medium px-3.5 py-2.5 rounded-xl">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-cash-in-light border border-cash-in-border text-cash-in text-xs font-medium px-3.5 py-2.5 rounded-xl">
                  {success}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Mail
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted pointer-events-none"
                  />
                  <input
                    type="email"
                    required
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-h-[44px] bg-subtle border border-border-default rounded-xl pl-10 pr-3.5 py-2 text-xs font-medium text-txt-main placeholder:text-txt-muted focus:outline-none focus:border-primary focus:bg-surface transition-colors"
                  />
                </div>

                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "admin" | "viewer")}
                  className="min-h-[44px] bg-subtle border border-border-default rounded-xl px-3.5 py-2 text-xs text-txt-main font-semibold focus:outline-none focus:border-primary focus:bg-surface cursor-pointer transition-colors"
                >
                  <option value="viewer">Viewer (Read Only)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>

                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 text-xs font-bold text-white transition-all shadow-sm shadow-primary/20 disabled:opacity-50 cursor-pointer touch-manipulation shrink-0"
                >
                  {submitting ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
        )}

        {/* Members List Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-txt-muted uppercase tracking-wider">
              Workspace Members
            </h2>
            {!showSkeleton && (
              <span className="text-[11px] font-semibold text-txt-secondary bg-surface border border-border-default px-2.5 py-0.5 rounded-full shadow-2xs">
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
            )}
          </div>

          {showSkeleton ? (
            <div className="flex flex-col gap-2.5 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3.5 sm:p-4 bg-surface border border-border-subtle/60 rounded-2xl shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary-light/70 border border-primary-border/40 shrink-0" />
                    <div className="flex flex-col gap-1.5 flex-1">
                      <div
                        className="h-3.5 bg-slate-200/80 rounded-md"
                        style={{ width: i % 2 === 0 ? "55%" : "68%" }}
                      />
                      <div className="h-3 w-16 bg-slate-100 rounded-md" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-8 w-20 bg-slate-200/70 rounded-xl" />
                    <div className="w-8 h-8 bg-slate-100 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 bg-surface border border-dashed border-border-default rounded-3xl text-center gap-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-primary-light border border-primary-border text-primary flex items-center justify-center">
                <Users size={22} />
              </div>
              <div className="text-sm font-bold text-txt-main">
                No members found
              </div>
              <p className="text-xs text-txt-muted max-w-xs">
                Invite team members or auditors above to collaborate on this workspace.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {members.map((member) => {
                const isMemberAdmin = member.role === "admin";
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 p-3.5 sm:p-4 bg-surface border border-border-default rounded-2xl shadow-2xs hover:border-border-strong/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary-light border border-primary-border flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {member.userEmail.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs sm:text-sm font-semibold text-txt-main truncate block">
                          {member.userEmail}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1">
                          {member.status === "active" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cash-in bg-cash-in-light px-2 py-0.5 rounded-full border border-cash-in-border">
                              <span className="w-1.5 h-1.5 rounded-full bg-cash-in" />
                              Active
                            </span>
                          ) : member.status === "pending" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock size={10} />
                              Awaiting Accept
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-txt-muted bg-subtle px-2 py-0.5 rounded-full border border-border-default">
                              {member.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin ? (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(
                              member.userId,
                              e.target.value as "admin" | "viewer"
                            )
                          }
                          aria-label={`Change role for ${member.userEmail}`}
                          className="min-h-[36px] bg-subtle border border-border-default text-[11px] font-semibold text-primary rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:border-primary focus:bg-surface transition-colors"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl border ${
                            isMemberAdmin
                              ? "text-primary bg-primary-light border-primary-border"
                              : "text-txt-secondary bg-subtle border-border-default"
                          }`}
                        >
                          {isMemberAdmin ? (
                            <ShieldCheck size={12} />
                          ) : (
                            <Eye size={12} />
                          )}
                          <span>{isMemberAdmin ? "Admin" : "Viewer"}</span>
                        </span>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.userId)}
                          className="relative min-w-[36px] min-h-[36px] rounded-xl text-txt-muted hover:text-cash-out hover:bg-cash-out-light active:scale-90 flex items-center justify-center transition-all cursor-pointer touch-manipulation before:absolute before:-inset-1.5 before:content-['']"
                          title="Remove member"
                          aria-label={`Remove ${member.userEmail}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
