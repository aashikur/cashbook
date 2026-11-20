"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import { useAppStore } from "@/store/app-store";
import { ArrowLeft, Mail, Shield, Trash2, UserPlus, Users } from "lucide-react";

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
  const { activeOrg } = useAppStore();

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/orgs/${orgId}/members`);
      if (res.ok) {
        const { data } = await res.json();
        setMembers(data || []);
      }
    } catch (err) {
      console.error("Failed to load members:", err);
    }
  }, [orgId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
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

      setSuccess(`Invitation sent to ${email}`);
      setEmail("");
      loadMembers();
    } catch {
      setError("Network error while inviting member");
    } finally {
      setLoading(false);
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
      }
    } catch {
      alert("Failed to update member role");
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Are you sure you want to remove this member from the organization?"))
      return;

    try {
      const res = await fetch(`/api/v1/orgs/${orgId}/members/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadMembers();
      }
    } catch {
      alert("Failed to remove member");
    }
  }

  const isAdmin = activeOrg?.role === "admin";

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <AppHeader />

      <main className="max-w-xl mx-auto w-full px-4 py-6 flex flex-col gap-6 flex-1">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs font-medium text-txt-secondary hover:text-txt-main transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-light border border-primary-border flex items-center justify-center text-primary">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-txt-main">Team & Access Control</h1>
            <p className="text-xs text-txt-secondary">
              Delegate Admin or Viewer permissions for {activeOrg?.name || "your organization"}
            </p>
          </div>
        </div>

        {/* Invite Form (Admin only) */}
        {isAdmin && (
          <form
            onSubmit={handleInvite}
            className="bg-surface border border-border-default rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-sm"
          >
            <h3 className="text-xs font-bold text-txt-secondary uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus size={14} className="text-primary" />
              <span>Invite New Member</span>
            </h3>

            {error && (
              <div className="bg-cash-out-light border border-cash-out-border text-cash-out text-xs px-3 py-2 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-cash-in-light border border-cash-in-border text-cash-in text-xs px-3 py-2 rounded-xl">
                {success}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted"
                />
                <input
                  type="email"
                  required
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-subtle border border-border-default rounded-xl pl-8 pr-3 py-2 text-xs text-txt-main placeholder:text-txt-muted focus:outline-none focus:border-primary focus:bg-surface transition-colors"
                />
              </div>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "viewer")}
                className="bg-subtle border border-border-default rounded-xl px-3 py-2 text-xs text-txt-main font-medium focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="viewer">Viewer (Read Only)</option>
                <option value="admin">Admin (Full CRUD)</option>
              </select>

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 text-xs font-semibold text-white transition-all shadow-sm shadow-primary/20 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Inviting..." : "Send Invite"}
              </button>
            </div>
          </form>
        )}

        {/* Members List */}
        <div className="flex flex-col gap-2.5">
          <h3 className="text-xs font-bold text-txt-muted uppercase tracking-wider px-1">
            Active Members ({members.length})
          </h3>

          {members.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-border-default rounded-2xl text-txt-muted text-xs">
              No members found
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3.5 bg-surface border border-border-default rounded-xl shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary-light border border-primary-border flex items-center justify-center text-xs font-bold text-primary">
                    {member.userEmail.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-txt-main truncate block">
                      {member.userEmail}
                    </span>
                    <span className="text-[10px] text-txt-muted capitalize">
                      Status: {member.status}
                    </span>
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
                      className="bg-subtle border border-border-default text-[11px] font-semibold text-primary rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:border-primary"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="text-[11px] font-semibold text-primary uppercase px-2 py-0.5 rounded-md bg-primary-light border border-primary-border">
                      {member.role}
                    </span>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="p-1 rounded-lg text-txt-muted hover:text-cash-out hover:bg-cash-out-light active:scale-90 transition-all cursor-pointer"
                      title="Remove member"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
