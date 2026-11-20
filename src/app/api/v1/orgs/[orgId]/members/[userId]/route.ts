import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orgMembers, organizations } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const updateMemberSchema = z.object({
  role: z.enum(["admin", "viewer"]).optional(),
  status: z.enum(["pending", "active", "revoked"]).optional(),
});

type RouteProps = {
  params: Promise<{ orgId: string; userId: string }>;
};

// PATCH /api/v1/orgs/:orgId/members/:userId (Admin only)
export async function PATCH(req: NextRequest, { params }: RouteProps) {
  const { orgId, userId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  // Protect org owner role from being downgraded
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (org && org.ownerId === userId) {
    return NextResponse.json(
      { success: false, error: "Cannot modify permissions of organization owner." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validated = updateMemberSchema.parse(body);

    const [updated] = await db
      .update(orgMembers)
      .set(validated)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update member" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/orgs/:orgId/members/:userId (Admin only)
export async function DELETE(_req: NextRequest, { params }: RouteProps) {
  const { orgId, userId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (org && org.ownerId === userId) {
    return NextResponse.json(
      { success: false, error: "Cannot remove organization owner." },
      { status: 400 }
    );
  }

  await db
    .delete(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));

  return NextResponse.json({ success: true, message: "Member removed successfully" });
}
