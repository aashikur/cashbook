/**
 * Server-only Platform Super Admin Access Control Helpers
 * Docs ref: Global Platform RBAC
 */
import { NextResponse } from "next/server";
import { getSessionContext, SessionContext } from "./auth-helpers";
import { isSuperAdminEmail } from "./admin-constants";

export { isSuperAdminEmail };

/**
 * Server-side guard to enforce that current session user is a Super Admin.
 */
export async function requireSuperAdmin(): Promise<
  { success: true; context: SessionContext } | { success: false; response: NextResponse }
> {
  const authRes = await getSessionContext();
  if (!authRes.success) return authRes;

  const { userEmail } = authRes.context;

  if (!isSuperAdminEmail(userEmail)) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Forbidden: Platform Super Admin privileges required for this action.",
        },
        { status: 403 }
      ),
    };
  }

  return authRes;
}
