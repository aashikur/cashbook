import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orgMembers, user } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { eq, desc } from "drizzle-orm";
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

    // Look up if user already exists
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, validated.email.toLowerCase()),
    });

    const targetUserId = existingUser ? existingUser.id : crypto.randomUUID();
    const memberId = `${orgId}_${targetUserId}`;

    const [member] = await db
      .insert(orgMembers)
      .values({
        id: memberId,
        orgId: orgId,
        userId: targetUserId,
        userEmail: validated.email.toLowerCase(),
        role: validated.role,
        status: existingUser ? "active" : "pending",
        invitedBy: authRes.context.userId,
        joinedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [orgMembers.orgId, orgMembers.userId],
        set: {
          role: validated.role,
          status: existingUser ? "active" : "pending",
        },
      })
      .returning();

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (err: unknown) {
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
