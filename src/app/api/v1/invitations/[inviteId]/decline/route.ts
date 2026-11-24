import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orgMembers } from "@/db/schema";
import { getSessionContext } from "@/lib/auth-helpers";
import { and, eq, or } from "drizzle-orm";

type RouteProps = {
  params: Promise<{ inviteId: string }>;
};

// POST /api/v1/invitations/:inviteId/decline
// Declines/revokes a pending workspace invitation
export async function POST(_req: NextRequest, { params }: RouteProps) {
  const { inviteId } = await params;
  const authRes = await getSessionContext();
  if (!authRes.success) return authRes.response;

  const { userId, userEmail } = authRes.context;

  try {
    const invite = await db.query.orgMembers.findFirst({
      where: and(
        eq(orgMembers.id, inviteId),
        eq(orgMembers.status, "pending"),
        or(
          eq(orgMembers.userId, userId),
          eq(orgMembers.userEmail, userEmail.toLowerCase())
        )
      ),
    });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: "Invitation not found or already processed" },
        { status: 404 }
      );
    }

    await db
      .update(orgMembers)
      .set({
        status: "revoked",
      })
      .where(eq(orgMembers.id, inviteId));

    return NextResponse.json({
      success: true,
      message: "Invitation declined",
    });
  } catch (error) {
    console.error("Failed to decline invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to decline invitation" },
      { status: 500 }
    );
  }
}
