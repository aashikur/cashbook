"use client";

import { useAppStore } from "@/store/app-store";

/**
 * Granular Role-Based Access Control (RBAC) Permissions Hook.
 * Enforces strict separation between Admin (Editor) and Viewer (Read-Only).
 * Docs ref: §2.2 Organization & Role-Based Access Control
 */
export function useOrgPermissions() {
  const { activeOrg } = useAppStore();
  const isAdmin = activeOrg?.role === "admin";

  return {
    role: activeOrg?.role || "viewer",
    isAdmin,
    isViewer: !isAdmin,
    canCreateBook: isAdmin,
    canEditBook: isAdmin,
    canDeleteBook: isAdmin,
    canAddTransaction: isAdmin,
    canEditTransaction: isAdmin,
    canDeleteTransaction: isAdmin,
    canManageMembers: isAdmin,
  };
}
