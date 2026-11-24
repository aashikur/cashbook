import { NextResponse } from "next/server";
import { db } from "@/db";
import { orgMembers } from "@/db/schema";
import { getSessionContext } from "@/lib/auth-helpers";
import { and, eq, or, desc } from "drizzle-orm";

// GET /api/v1/invitations
// Returns all pending workspace invitations for the current logged-in user
export async function GET() {
  const authRes = await getSessionContext();
  if (!authRes.success) return authRes.response;

  const { userId, userEmail } = authRes.context;

  try {
    const pendingInvites = await db.query.orgMembers.findMany({
      where: and(
        eq(orgMembers.status, "pending"),
        or(
          eq(orgMembers.userId, userId),
          eq(orgMembers.userEmail, userEmail.toLowerCase())
        )
      ),
      with: {
        org: true,
        inviter: true,
      },
      orderBy: [desc(orgMembers.joinedAt)],
    });

    const formatted = pendingInvites
      .filter((inv) => inv.org !== null)
      .map((inv) => ({
        id: inv.id,
        orgId: inv.orgId,
        orgName: inv.org.name,
        orgCurrency: inv.org.currency,
        role: inv.role,
        invitedBy: inv.invitedBy,
        inviterName: inv.inviter?.name || inv.inviter?.email || "An administrator",
        inviterEmail: inv.inviter?.email || "",
        createdAt: inv.joinedAt,
      }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Failed to fetch pending invitations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
