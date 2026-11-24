/**
 * Platform Super Admin Configuration & Client-safe Utilities
 */
export const DEFAULT_SUPER_ADMINS = ["mdaashikur@gmail.com"];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  const envList = (
    process.env.SUPER_ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS ||
    ""
  )
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const allAdmins = new Set([...DEFAULT_SUPER_ADMINS, ...envList]);
  return allAdmins.has(normalized);
}
