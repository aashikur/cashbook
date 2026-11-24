import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orgMembers } from "@/db/schema";
import { getSessionContext } from "@/lib/auth-helpers";
import { and, eq, or } from "drizzle-orm";

type RouteProps = {
  params: Promise<{ inviteId: string }>;
};

// POST /api/v1/invitations/:inviteId/accept
// Accepts a pending workspace invitation for the current logged-in user
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
      with: {
        org: true,
      },
    });

    if (!invite || !invite.org) {
      return NextResponse.json(
        { success: false, error: "Invitation not found or already processed" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(orgMembers)
      .set({
        status: "active",
        userId: userId,
        joinedAt: new Date(),
      })
      .where(eq(orgMembers.id, inviteId))
      .returning();

    return NextResponse.json({
      success: true,
      message: `You joined ${invite.org.name} as ${invite.role === "admin" ? "Admin" : "Viewer"}`,
      data: {
        membership: updated,
        org: {
          id: invite.org.id,
          name: invite.org.name,
          currency: invite.org.currency,
          role: invite.role,
        },
      },
    });
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
