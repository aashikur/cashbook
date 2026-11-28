import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orgMembers, user } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "viewer"]).default("viewer"),
});

type RouteProps = {
  params: Promise<{ orgId: string }>;
};

// GET /api/v1/orgs/:orgId/members
export async function GET(_req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId);
  if (!authRes.success) return authRes.response;

  const members = await db.query.orgMembers.findMany({
    where: eq(orgMembers.orgId, orgId),
    orderBy: [desc(orgMembers.joinedAt)],
  });

  return NextResponse.json({ success: true, data: members });
}

// POST /api/v1/orgs/:orgId/members (Admin only)
export async function POST(req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  try {
    const body = await req.json();
    const validated = addMemberSchema.parse(body);
    const targetEmail = validated.email.toLowerCase();

    // Prevent inviting oneself
    if (targetEmail === authRes.context.userEmail.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "You cannot invite yourself" },
        { status: 400 }
      );
    }

    // Look up if user already exists
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, targetEmail),
    });

    const targetUserId = existingUser ? existingUser.id : crypto.randomUUID();
    const memberId = `${orgId}_${targetUserId}`;

    // Check if already an active member
    const existingMember = await db.query.orgMembers.findFirst({
      where: and(
        eq(orgMembers.orgId, orgId),
        eq(orgMembers.userEmail, targetEmail)
      ),
    });

    if (existingMember && existingMember.status === "active") {
      return NextResponse.json(
        { success: false, error: "This user is already an active member of this organization" },
        { status: 400 }
      );
    }

    const [member] = await db
      .insert(orgMembers)
      .values({
        id: memberId,
        orgId: orgId,
        userId: targetUserId,
        userEmail: targetEmail,
        role: validated.role,
        status: "pending", // Always set as pending so invited user receives the notification and can accept/decline
        invitedBy: authRes.context.userId,
        joinedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [orgMembers.orgId, orgMembers.userId],
        set: {
          role: validated.role,
          status: "pending",
          userEmail: targetEmail,
        },
      })
      .returning();

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error inviting member:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to invite member" },
      { status: 500 }
    );
  }
}
