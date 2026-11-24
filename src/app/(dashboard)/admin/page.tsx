"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Lock,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "orgs">("users");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "activity" | "name">("recent");

  const isSuper = session?.user?.email
    ? isSuperAdminEmail(session.user.email)
    : false;

  useEffect(() => {
    if (!isSessionLoading && !isSuper) {
      router.push("/dashboard");
    }
  }, [isSessionLoading, isSuper, router]);

  const loadAdminData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isSuper) {
      loadAdminData();
    }
  }, [isSuper, loadAdminData]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2000);
  }, []);

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    const q = searchQuery.toLowerCase().trim();
    let list = data.users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.ownedOrgs.some((o) => o.name.toLowerCase().includes(q))
    );

    if (sortBy === "recent") {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortBy === "activity") {
      list = [...list].sort((a, b) => b.ownedOrgsCount - a.ownedOrgsCount);
    } else if (sortBy === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [data?.users, searchQuery, sortBy]);

  // Filtered & Sorted Workspaces
  const filteredOrgs = useMemo(() => {
    if (!data?.organizations) return [];
    const q = searchQuery.toLowerCase().trim();
    let list = data.organizations.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.ownerName.toLowerCase().includes(q) ||
        o.ownerEmail.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
    );

    if (sortBy === "recent") {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortBy === "activity") {
      list = [...list].sort((a, b) => b.booksCount - a.booksCount);
    } else if (sortBy === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [data?.organizations, searchQuery, sortBy]);

  // Loading state
  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-txt-secondary bg-surface border border-border-default px-4 py-2.5 rounded-2xl shadow-xs">
          <RefreshCw size={15} className="animate-spin text-primary" />
          <span>Verifying administrator permissions…</span>
        </div>
      </div>
    );
  }

  // Access denied
  if (!isSuper) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-canvas text-center">
        <div className="w-14 h-14 rounded-3xl bg-cash-out-light border border-cash-out-border flex items-center justify-center text-cash-out mb-3 shadow-xs">
          <Lock size={24} />
        </div>
        <h1 className="text-base font-bold text-txt-main">Access Restricted</h1>
        <p className="text-xs text-txt-secondary mt-1 max-w-sm">
          Platform Super Admin privileges are restricted to authorized platform owners.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs active:scale-95 transition-all"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border-default px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Navigation and Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl bg-subtle hover:bg-slate-200 text-txt-secondary hover:text-txt-main active:scale-95 transition-all cursor-pointer border border-border-subtle shrink-0"
              title="Return to Dashboard"
            >
              <ArrowLeft size={16} />
            </Link>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary-light border border-primary-border text-primary flex items-center justify-center shadow-2xs shrink-0">
                <ShieldCheck size={19} className="stroke-[2.2]" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-extrabold text-txt-main tracking-tight truncate">
                    Platform Super Admin
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary-light text-primary border border-primary-border shrink-0">
                    Console
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-txt-muted truncate">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Cluster</span>
                  </span>
                  <span>•</span>
                  <span className="truncate">
                    Operator: <strong className="font-semibold text-txt-main">{session?.user?.email}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadAdminData(true)}
              disabled={loading || refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface border border-border-default text-txt-secondary hover:text-txt-main hover:border-border-strong active:scale-95 shadow-2xs transition-all cursor-pointer"
              title="Reload platform metrics"
            >
              <RefreshCw size={13} className={loading || refreshing ? "animate-spin text-primary" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-subtle hover:bg-slate-200 text-txt-secondary hover:text-txt-main border border-border-default transition-all"
            >
              <span>Dashboard</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full px-4 pt-5 flex flex-col gap-5 flex-1">
        {/* Error Alert */}
        {error && (
          <div className="bg-cash-out-light border border-cash-out-border text-cash-out text-xs p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
            <span className="font-medium">{error}</span>
            <button
              type="button"
              onClick={() => loadAdminData()}
              className="px-2.5 py-1 rounded-lg bg-white border border-cash-out-border text-[11px] font-bold hover:bg-cash-out-light"
            >
              Retry
            </button>
          </div>
        )}

        {/* Pulse Telemetry Stat Cards */}
        {loading && !data ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col gap-2 animate-pulse"
              >
                <div className="h-4 w-20 bg-subtle rounded-md" />
                <div className="h-8 w-16 bg-subtle rounded-lg my-1" />
                <div className="h-3 w-28 bg-subtle rounded-md" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Users */}
            <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col justify-between hover:border-border-strong hover:shadow-sm transition-all group">
              <div className="flex items-center justify-between text-txt-muted">
                <span className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary">
                  Total Users
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users size={14} />
                </div>
              </div>
              <div className="mt-2.5 mb-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-txt-main tracking-tight">
                  {data?.metrics.totalUsers ?? 0}
                </span>
              </div>
              <span className="text-[10px] text-txt-muted flex items-center gap-1 font-medium">
                Registered Accounts
              </span>
            </div>

            {/* Total Workspaces */}
            <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col justify-between hover:border-border-strong hover:shadow-sm transition-all group">
              <div className="flex items-center justify-between text-txt-muted">
                <span className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary">
                  Workspaces
                </span>
                <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Building2 size={14} />
                </div>
              </div>
              <div className="mt-2.5 mb-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-txt-main tracking-tight">
                  {data?.metrics.totalOrganizations ?? 0}
                </span>
              </div>
              <span className="text-[10px] text-txt-muted flex items-center gap-1 font-medium">
                Active Organizations
              </span>
            </div>

            {/* Total Books */}
            <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col justify-between hover:border-border-strong hover:shadow-sm transition-all group">
              <div className="flex items-center justify-between text-txt-muted">
                <span className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary">
                  Ledger Books
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen size={14} />
                </div>
              </div>
              <div className="mt-2.5 mb-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-txt-main tracking-tight">
                  {data?.metrics.totalBooks ?? 0}
                </span>
              </div>
              <span className="text-[10px] text-txt-muted flex items-center gap-1 font-medium">
                Expense Ledgers
              </span>
            </div>

            {/* Total Transactions */}
            <div className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col justify-between hover:border-border-strong hover:shadow-sm transition-all group">
              <div className="flex items-center justify-between text-txt-muted">
                <span className="text-[11px] font-bold uppercase tracking-wider text-txt-secondary">
                  Transactions
                </span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Activity size={14} />
                </div>
              </div>
              <div className="mt-2.5 mb-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-txt-main tracking-tight">
                  {data?.metrics.totalTransactions ?? 0}
                </span>
              </div>
              <span className="text-[10px] text-txt-muted flex items-center gap-1 font-medium">
                Historical Daily Logs
              </span>
            </div>
          </div>
        )}

        {/* Search, Filter & Tabs Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Tab Switcher */}
          <div className="flex items-center p-1 bg-subtle border border-border-default rounded-2xl w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "users"
                  ? "bg-surface text-txt-main shadow-xs border border-border-subtle"
                  : "text-txt-muted hover:text-txt-main border border-transparent"
              }`}
            >
              <Users size={14} />
              <span>Users</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                  activeTab === "users"
                    ? "bg-primary-light text-primary"
                    : "bg-surface/80 text-txt-muted"
                }`}
              >
                {data?.users.length ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("orgs")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "orgs"
                  ? "bg-surface text-txt-main shadow-xs border border-border-subtle"
                  : "text-txt-muted hover:text-txt-main border border-transparent"
              }`}
            >
              <Building2 size={14} />
              <span>Workspaces</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                  activeTab === "orgs"
                    ? "bg-primary-light text-primary"
                    : "bg-surface/80 text-txt-muted"
                }`}
              >
                {data?.organizations.length ?? 0}
              </span>
            </button>
          </div>

          {/* Search Box & Sort Controls */}
          <div className="flex items-center gap-2 flex-1 sm:max-w-md">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="text-txt-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                type="text"
                placeholder={
                  activeTab === "users"
                    ? "Search name, email, workspace…"
                    : "Search workspace or owner…"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border-default rounded-xl pl-8.5 pr-8 py-2 text-xs text-txt-main placeholder:text-txt-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-main p-0.5 rounded-md transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "recent" | "activity" | "name")}
              className="bg-surface border border-border-default rounded-xl px-2.5 py-2 text-xs font-semibold text-txt-secondary hover:text-txt-main focus:outline-none focus:border-primary shadow-2xs transition-all cursor-pointer"
            >
              <option value="recent">Newest</option>
              <option value="activity">Most Active</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Directory Results Header */}
        <div className="flex items-center justify-between text-xs text-txt-muted px-1">
          <span>
            Showing{" "}
            <strong className="font-bold text-txt-main">
              {activeTab === "users" ? filteredUsers.length : filteredOrgs.length}
            </strong>{" "}
            {activeTab === "users"
              ? filteredUsers.length === 1
                ? "user"
                : "users"
              : filteredOrgs.length === 1
              ? "workspace"
              : "workspaces"}
            {searchQuery && ` matching "${searchQuery}"`}
          </span>

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-primary hover:underline font-semibold text-[11px]"
            >
              Reset filter
            </button>
          )}
        </div>

        {/* Users List View */}
        {activeTab === "users" && (
          <div className="flex flex-col gap-2.5">
            {filteredUsers.length === 0 ? (
              <div className="py-12 px-4 text-center bg-surface border border-dashed border-border-default rounded-3xl text-txt-muted flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-subtle flex items-center justify-center text-txt-muted">
                  <Users size={18} />
                </div>
                <span className="text-xs font-semibold text-txt-main">No users found</span>
                <span className="text-[11px] text-txt-muted max-w-xs">
                  {searchQuery
                    ? `No registered account matched "${searchQuery}". Try a different keyword.`
                    : "No user telemetry recorded yet."}
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-95 transition-all"
                  >
                    Clear Search
                  </button>
                )}
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
                const isSuperUser = isSuperAdminEmail(u.email);

                return (
                  <div
                    key={u.id}
                    className="p-4 bg-surface border border-border-default rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border-strong hover:shadow-xs transition-all"
                  >
                    {/* Left: Avatar & Identity */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-primary-light border border-primary-border text-primary font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-txt-main truncate block">
                            {u.name || "Anonymous User"}
                          </span>

                          {isMe ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
                              You (Owner)
                            </span>
                          ) : isSuperUser ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-light border border-primary-border text-primary shrink-0">
                              Super Admin
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-txt-secondary flex items-center gap-1 truncate">
                            <Mail size={12} className="text-txt-muted shrink-0" />
                            <span className="truncate">{u.email}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => copyToClipboard(u.email, `email-${u.id}`)}
                            className="text-txt-muted hover:text-primary transition-colors cursor-pointer p-0.5"
                            title="Copy email address"
                          >
                            {copiedId === `email-${u.id}` ? (
                              <Check size={11} className="text-emerald-600" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Workspaces Owned & Meta */}
                    <div className="flex flex-col sm:items-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle">
                      {/* Workspaces Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.ownedOrgs.length > 0 ? (
                          u.ownedOrgs.map((org) => (
                            <span
                              key={org.id}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-subtle border border-border-default text-txt-secondary flex items-center gap-1"
                              title={`${org.booksCount} books, ${org.membersCount} members`}
                            >
                              <Building2 size={11} className="text-txt-muted" />
                              <span>{org.name}</span>
                              <span className="text-txt-muted font-normal">
                                ({org.booksCount} {org.booksCount === 1 ? "book" : "books"})
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-txt-muted italic">
                            No owned workspaces
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-txt-muted">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          <span>Joined {formatDate(u.createdAt).split(",")[0]}</span>
                        </span>

                        <span>•</span>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(u.id, `id-${u.id}`)}
                          className="hover:text-txt-main font-mono text-[9px] flex items-center gap-1 cursor-pointer"
                          title="Copy User ID"
                        >
                          <span>{copiedId === `id-${u.id}` ? "Copied ID" : `ID: ${u.id.slice(0, 8)}…`}</span>
                          <Copy size={10} />
                        </button>
                      </div>
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
              <div className="py-12 px-4 text-center bg-surface border border-dashed border-border-default rounded-3xl text-txt-muted flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-subtle flex items-center justify-center text-txt-muted">
                  <Building2 size={18} />
                </div>
                <span className="text-xs font-semibold text-txt-main">No workspaces found</span>
                <span className="text-[11px] text-txt-muted max-w-xs">
                  {searchQuery
                    ? `No organization matched "${searchQuery}". Try a different search term.`
                    : "No organizations have been created yet."}
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-95 transition-all"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              filteredOrgs.map((org) => (
                <div
                  key={org.id}
                  className="p-4 bg-surface border border-border-default rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border-strong hover:shadow-xs transition-all"
                >
                  {/* Left: Organization Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      <Building2 size={18} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-txt-main truncate">
                          {org.name}
                        </h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-subtle border border-border-default text-txt-secondary">
                          {org.currency}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-txt-muted mt-0.5 truncate">
                        <span>Owner:</span>
                        <span className="font-semibold text-txt-secondary truncate">
                          {org.ownerName || "Unnamed"}
                        </span>
                        <span className="truncate">({org.ownerEmail})</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle">
                    {/* Metrics Badges */}
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                        <BookOpen size={11} className="text-emerald-600" />
                        <span>
                          {org.booksCount} {org.booksCount === 1 ? "book" : "books"}
                        </span>
                      </span>

                      <span className="px-2.5 py-1 rounded-xl bg-primary-light border border-primary-border text-primary text-[11px] font-bold flex items-center gap-1">
                        <Users size={11} />
                        <span>
                          {org.membersCount} {org.membersCount === 1 ? "member" : "members"}
                        </span>
                      </span>
                    </div>

                    {/* Quick Copy Org ID */}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(org.id, `org-${org.id}`)}
                      className="px-2 py-1 rounded-lg bg-subtle hover:bg-slate-200 text-txt-muted hover:text-txt-main text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer border border-border-subtle"
                      title="Copy Organization ID"
                    >
                      <Copy size={10} />
                      <span>{copiedId === `org-${org.id}` ? "Copied" : "ID"}</span>
                    </button>
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
