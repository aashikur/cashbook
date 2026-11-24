"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { isSuperAdminEmail } from "@/lib/admin-constants";
import { formatDate } from "@/lib/utils";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Lock,
  Mail,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt: string;
  ownedOrgsCount: number;
  ownedOrgs: Array<{
    id: string;
    name: string;
    currency: string;
    booksCount: number;
    membersCount: number;
    createdAt: string;
  }>;
  memberOrgsCount: number;
}

interface AdminOrgItem {
  id: string;
  name: string;
  currency: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  membersCount: number;
  booksCount: number;
  createdAt: string;
}

interface AdminOverviewData {
  metrics: {
    totalUsers: number;
    totalOrganizations: number;
    totalBooks: number;
    totalTransactions: number;
  };
  users: AdminUserItem[];
  organizations: AdminOrgItem[];
}

export default function AdminConsolePage() {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } = useSession();

  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "orgs">("users");

  const isSuper = session?.user?.email
    ? isSuperAdminEmail(session.user.email)
    : false;

  useEffect(() => {
    if (!isSessionLoading && !isSuper) {
      router.push("/dashboard");
    }
  }, [isSessionLoading, isSuper, router]);

  async function loadAdminData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/overview");
      if (res.status === 403 || res.status === 401) {
        setError("Unauthorized: Platform Super Admin privileges required.");
        return;
      }
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load admin telemetry");
      }
    } catch {
      setError("Network error loading platform console");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isSuper) {
      loadAdminData();
    }
  }, [isSuper]);

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="flex items-center gap-2 text-sm text-txt-secondary">
          <RefreshCw size={16} className="animate-spin text-primary" />
          <span>Verifying administrator permissions…</span>
        </div>
      </div>
    );
  }

  if (!isSuper) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-canvas text-center">
        <div className="w-12 h-12 rounded-2xl bg-cash-out-light border border-cash-out-border flex items-center justify-center text-cash-out mb-3">
          <Lock size={22} />
        </div>
        <h1 className="text-lg font-bold text-txt-main">Access Restricted</h1>
        <p className="text-xs text-txt-secondary mt-1 max-w-sm">
          Platform Super Admin privileges are restricted to authorized platform owners.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const filteredUsers = (data?.users || []).filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrgs = (data?.organizations || []).filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-canvas pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border-subtle px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1 rounded-full text-txt-secondary hover:text-txt-main hover:bg-subtle active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
                <ShieldCheck size={18} className="stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-extrabold text-txt-main tracking-tight">
                    Platform Super Admin
                  </h1>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300">
                    Console
                  </span>
                </div>
                <p className="text-[11px] text-txt-muted truncate max-w-[240px]">
                  Signed in as <span className="font-semibold text-txt-main">{session?.user?.email}</span>
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadAdminData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-subtle hover:bg-subtle/80 text-txt-secondary hover:text-txt-main transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-4 pt-5 flex flex-col gap-5 flex-1">
        {error && (
          <div className="bg-cash-out-light border border-cash-out-border text-cash-out text-xs p-3.5 rounded-2xl">
            {error}
          </div>
        )}

        {/* Pulse Telemetry Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Users */}
          <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col gap-1">
            <div className="flex items-center justify-between text-txt-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Total Users
              </span>
              <Users size={16} className="text-indigo-600" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-txt-main tracking-tight">
              {data?.metrics.totalUsers ?? "—"}
            </span>
            <span className="text-[10px] text-txt-muted">Registered Accounts</span>
          </div>

          {/* Total Workspaces */}
          <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col gap-1">
            <div className="flex items-center justify-between text-txt-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Workspaces
              </span>
              <Building2 size={16} className="text-blue-600" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-txt-main tracking-tight">
              {data?.metrics.totalOrganizations ?? "—"}
            </span>
            <span className="text-[10px] text-txt-muted">Active Organizations</span>
          </div>

          {/* Total Books */}
          <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col gap-1">
            <div className="flex items-center justify-between text-txt-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Ledger Books
              </span>
              <BookOpen size={16} className="text-emerald-600" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-txt-main tracking-tight">
              {data?.metrics.totalBooks ?? "—"}
            </span>
            <span className="text-[10px] text-txt-muted">Total Expense Ledgers</span>
          </div>

          {/* Total Transactions */}
          <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col gap-1">
            <div className="flex items-center justify-between text-txt-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Transactions
              </span>
              <Activity size={16} className="text-amber-600" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-txt-main tracking-tight">
              {data?.metrics.totalTransactions ?? "—"}
            </span>
            <span className="text-[10px] text-txt-muted">Historical Daily Logs</span>
          </div>
        </div>

        {/* Search & Tabs Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-subtle rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "users"
                  ? "bg-surface text-txt-main shadow-xs"
                  : "text-txt-muted hover:text-txt-main"
              }`}
            >
              <Users size={14} />
              <span>Users ({data?.users.length ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("orgs")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "orgs"
                  ? "bg-surface text-txt-main shadow-xs"
                  : "text-txt-muted hover:text-txt-main"
              }`}
            >
              <Building2 size={14} />
              <span>Workspaces ({data?.organizations.length ?? 0})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={14}
              className="text-txt-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="text"
              placeholder={activeTab === "users" ? "Search user or email…" : "Search workspace or owner…"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border-default rounded-xl pl-8 pr-3 py-1.5 text-xs text-txt-main placeholder:text-txt-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Users List View */}
        {activeTab === "users" && (
          <div className="flex flex-col gap-2.5">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center bg-surface border border-dashed border-border-default rounded-3xl text-xs text-txt-muted">
                No users found matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredUsers.map((u) => {
                const initials = u.name
                  ? u.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : u.email.slice(0, 2).toUpperCase();

                const isMe = u.email === session?.user?.email;

                return (
                  <div
                    key={u.id}
                    className="p-4 bg-surface border border-border-default rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border-strong transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-txt-main truncate block">
                            {u.name || "Anonymous User"}
                          </span>
                          {isMe && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
                              You (Super Admin)
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-txt-muted flex items-center gap-1 truncate mt-0.5">
                          <Mail size={12} />
                          <span>{u.email}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle">
                      {/* Workspaces Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.ownedOrgs.length > 0 ? (
                          u.ownedOrgs.map((org) => (
                            <span
                              key={org.id}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-subtle border border-border-default text-txt-secondary"
                              title={`${org.booksCount} books, ${org.membersCount} members`}
                            >
                              🏢 {org.name} ({org.booksCount} books)
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-txt-muted italic">
                            No owned workspaces
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-txt-muted flex items-center gap-1">
                        <Calendar size={11} />
                        <span>Joined {formatDate(u.createdAt).split(",")[0]}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Workspaces List View */}
        {activeTab === "orgs" && (
          <div className="flex flex-col gap-2.5">
            {filteredOrgs.length === 0 ? (
              <div className="p-8 text-center bg-surface border border-dashed border-border-default rounded-3xl text-xs text-txt-muted">
                No workspaces found matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredOrgs.map((org) => (
                <div
                  key={org.id}
                  className="p-4 bg-surface border border-border-default rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border-strong transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-bold text-txt-main truncate">
                          {org.name}
                        </h4>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-subtle border border-border-default text-txt-secondary">
                          {org.currency}
                        </span>
                      </div>
                      <span className="text-xs text-txt-muted mt-0.5 block truncate">
                        Owner: <span className="font-medium text-txt-secondary">{org.ownerName}</span> ({org.ownerEmail})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                        {org.booksCount} {org.booksCount === 1 ? "book" : "books"}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-semibold">
                        {org.membersCount} {org.membersCount === 1 ? "member" : "members"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
