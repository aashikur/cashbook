"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";
import UserProfileModal from "@/components/dashboard/UserProfileModal";
import ManageCategoriesModal, {
  CustomCategoryItem,
} from "@/components/dashboard/ManageCategoriesModal";
import { signOut, useSession } from "@/lib/auth-client";
import { isSuperAdminEmail } from "@/lib/admin-constants";
import { localDb } from "@/lib/local-db";
import { useAppStore, useStoreHydrated } from "@/store/app-store";
import { confirmDialog } from "@/store/confirm-store";
import {
  Activity,
  ArrowLeft,
  Building2,
  ChevronRight,
  Lock,
  LogOut,
  ShieldCheck,
  Tags,
  User,
  Users,
} from "lucide-react";

type PageProps = {
  params: Promise<{ orgId: string }>;
};

interface SettingsRowProps {
  icon: React.ReactNode;
  iconBgClass?: string;
  label: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  badgeText?: string;
  danger?: boolean;
}

function SettingsRow({
  icon,
  iconBgClass = "bg-primary-light text-primary",
  label,
  subtitle,
  href,
  onClick,
  disabled = false,
  badgeText,
  danger = false,
}: SettingsRowProps) {
  const rowContent = (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold truncate ${
                danger ? "text-cash-out" : "text-txt-main"
              }`}
            >
              {label}
            </span>
            {badgeText && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-subtle text-txt-muted border border-border-default shrink-0">
                <Lock size={9} />
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-txt-secondary truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {!danger && !disabled && (
        <ChevronRight size={18} className="text-txt-muted shrink-0" />
      )}
    </div>
  );

  const baseClassName = `w-full min-h-[60px] px-4 py-3 flex items-center transition-colors touch-manipulation ${
    disabled
      ? "opacity-65 cursor-not-allowed"
      : danger
        ? "hover:bg-cash-out-light/60 active:bg-cash-out-light cursor-pointer"
        : "hover:bg-subtle/70 active:bg-subtle cursor-pointer"
  }`;

  if (href && !disabled) {
    return (
      <Link href={href} className={baseClassName}>
        {rowContent}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={baseClassName}
    >
      {rowContent}
    </button>
  );
}

export default function SettingsPage({ params }: PageProps) {
  const { orgId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const hasHydrated = useStoreHydrated();
  const {
    activeOrg,
    orgs,
    setActiveOrg,
    setEditingOrg,
    setEditOrgOpen,
  } = useAppStore();

  const [orgNotFound, setOrgNotFound] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  // Sync activeOrg with route orgId on direct navigation/reload
  useEffect(() => {
    const matchedOrg = orgs.find((o) => o.id === orgId);
    if (matchedOrg) {
      if (activeOrg?.id !== orgId) {
        setActiveOrg(matchedOrg);
      }
      return;
    }

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
        .catch((err) => {
          console.error("Failed to verify workspace:", err);
        });
    }
  }, [orgId, orgs, activeOrg, setActiveOrg]);

  // Keep local custom categories cache synced for Settings view
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/orgs/${orgId}/categories`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (res) => {
        if (!cancelled && res?.data) {
          for (const item of res.data) {
            await localDb.categories.put({
              id: item.id,
              orgId,
              name: item.name,
              icon: item.icon || "Tag",
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            });
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const cachedCategories = useLiveQuery(
    () => localDb.categories.where("orgId").equals(orgId).toArray(),
    [orgId]
  );

  const customCategories: CustomCategoryItem[] = (cachedCategories || []).map(
    (c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
    })
  );

  const currentOrg =
    activeOrg?.id === orgId
      ? activeOrg
      : orgs.find((o) => o.id === orgId) || null;

  const isAdmin = hasHydrated && currentOrg?.role === "admin";
  const isSuperAdmin = session?.user?.email
    ? isSuperAdminEmail(session.user.email)
    : false;

  const userName = session?.user?.name || "Account User";
  const userEmail = session?.user?.email || "No email connected";
  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CB";

  async function handleSignOut() {
    const confirmed = await confirmDialog({
      title: "Sign Out?",
      description:
        "You will need to sign back in to access your synced cloud workspaces.",
      confirmText: "Sign Out",
      cancelText: "Stay Signed In",
      variant: "danger",
    });
    if (!confirmed) return;

    await signOut();
    router.push("/sign-in");
  }

  if (orgNotFound) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas pb-24">
        <AppHeader />
        <main className="max-w-xl mx-auto w-full px-4 py-20 flex flex-col items-center justify-center text-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-3xl bg-primary-light border border-primary-border flex items-center justify-center text-primary shadow-sm">
            <Building2 size={30} />
          </div>
          <h1 className="text-xl font-bold text-txt-main tracking-tight">
            Workspace Not Found
          </h1>
          <p className="text-xs text-txt-secondary max-w-xs">
            This workspace does not exist or you no longer have access to its
            settings.
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
        {/* Contextual Page Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="relative w-10 h-10 rounded-full bg-surface border border-border-default flex items-center justify-center text-txt-secondary hover:text-txt-main hover:bg-subtle active:scale-95 transition-all shadow-2xs shrink-0 touch-manipulation before:absolute before:-inset-1.5 before:content-['']"
              title="Back to Books"
              aria-label="Back to Books"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-txt-main tracking-tight truncate">
                Settings
              </h1>
              <p className="text-xs text-txt-secondary truncate">
                {currentOrg?.name || "Workspace"} configuration & preferences
              </p>
            </div>
          </div>
        </div>

        {/* Account Summary Banner Card (Initials Badge, No Default Images) */}
        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          className="w-full bg-surface border border-border-default rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 hover:bg-subtle/40 active:scale-[0.99] transition-all cursor-pointer touch-manipulation text-left"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white font-extrabold text-base flex items-center justify-center shadow-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-txt-main truncate">
                  {userName}
                </span>
                {currentOrg && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                      isAdmin
                        ? "bg-primary-light text-primary border-primary-border"
                        : "bg-subtle text-txt-secondary border-border-default"
                    }`}
                  >
                    {currentOrg.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-txt-secondary truncate mt-0.5">
                {userEmail}
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-txt-muted shrink-0" />
        </button>

        {/* Section 1: Workspace Configuration */}
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-txt-muted">
            Workspace
          </h2>
          <div className="bg-surface border border-border-default rounded-2xl shadow-xs overflow-hidden divide-y divide-border-subtle">
            <SettingsRow
              icon={<Building2 size={18} />}
              iconBgClass="bg-primary-light text-primary"
              label="Business Profile"
              subtitle={
                currentOrg
                  ? `${currentOrg.name} • ${currentOrg.currency}`
                  : "Name, description & currency"
              }
              badgeText={hasHydrated && !isAdmin ? "Admin" : undefined}
              disabled={hasHydrated && !isAdmin}
              onClick={() => {
                if (currentOrg) {
                  setEditingOrg(currentOrg);
                  setEditOrgOpen(true);
                }
              }}
            />

            <SettingsRow
              icon={<Tags size={18} />}
              iconBgClass="bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
              label="Categories"
              subtitle={`Default presets & ${customCategories.length} custom ${
                customCategories.length === 1 ? "category" : "categories"
              }`}
              badgeText={hasHydrated && !isAdmin ? "Admin" : undefined}
              disabled={hasHydrated && !isAdmin}
              onClick={() => setIsCategoriesOpen(true)}
            />

            <SettingsRow
              icon={<Users size={18} />}
              iconBgClass="bg-emerald-50 text-cash-in dark:bg-emerald-950/60"
              label="Team & Access Control"
              subtitle="Manage members, roles & pending invitations"
              href={`/orgs/${orgId}/members`}
            />
          </div>
        </section>

        {/* Section 2: Account */}
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-txt-muted">
            Account
          </h2>
          <div className="bg-surface border border-border-default rounded-2xl shadow-xs overflow-hidden divide-y divide-border-subtle">
            <SettingsRow
              icon={<User size={18} />}
              iconBgClass="bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
              label="Your Profile"
              subtitle="Personal details, email & workspace role"
              onClick={() => setIsProfileOpen(true)}
            />
          </div>
        </section>

        {/* Section 3: Platform System (Super Admin only) */}
        {isSuperAdmin && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-[11px] font-bold uppercase tracking-wider text-txt-muted">
              System
            </h2>
            <div className="bg-surface border border-border-default rounded-2xl shadow-xs overflow-hidden divide-y divide-border-subtle">
              <SettingsRow
                icon={<Activity size={18} />}
                iconBgClass="bg-emerald-50 text-cash-in dark:bg-emerald-950/60"
                label="System Health & Status"
                subtitle="API diagnostics & database connectivity"
                href="/health"
              />
              <SettingsRow
                icon={<ShieldCheck size={18} />}
                iconBgClass="bg-primary-light text-primary"
                label="Super Admin Console"
                subtitle="Platform-wide users & workspace telemetry"
                href="/admin"
              />
            </div>
          </section>
        )}

        {/* Section 4: Session Sign Out */}
        <section className="bg-surface border border-border-default rounded-2xl shadow-xs overflow-hidden">
          <SettingsRow
            icon={<LogOut size={18} />}
            iconBgClass="bg-cash-out-light text-cash-out"
            label="Sign Out"
            subtitle="End current session on this device"
            onClick={handleSignOut}
            danger
          />
        </section>

        {/* Footer Attribution */}
        <p className="text-center text-[11px] text-txt-muted py-2">
          CashBook v1.1 • Designed & Developed by{" "}
          <span className="font-semibold text-txt-main">Aashikur Rahaman</span>
        </p>
      </main>

      {/* Modals */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {isAdmin && (
        <ManageCategoriesModal
          isOpen={isCategoriesOpen}
          onClose={() => setIsCategoriesOpen(false)}
          orgId={orgId}
          customCategories={customCategories}
        />
      )}

      <BottomNav />
    </div>
  );
}
