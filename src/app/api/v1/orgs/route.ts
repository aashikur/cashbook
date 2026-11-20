import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, orgMembers } from "@/db/schema";
import { getSessionContext } from "@/lib/auth-helpers";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createOrgSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).default("BDT"),
});

// GET /api/v1/orgs - Lists all organizations user belongs to with role
export async function GET() {
  const authRes = await getSessionContext();
  if (!authRes.success) return authRes.response;

  const { userId } = authRes.context;

  const memberships = await db.query.orgMembers.findMany({
    where: eq(orgMembers.userId, userId),
    with: {
      org: true,
    },
    orderBy: [desc(orgMembers.joinedAt)],
  });

  const orgsWithRole = memberships
    .filter((m) => m.status === "active" && m.org)
    .map((m) => ({
      ...m.org,
      role: m.role,
    }));

  return NextResponse.json({ success: true, data: orgsWithRole });
}

// POST /api/v1/orgs - Creates organization & sets creator as admin
export async function POST(request: NextRequest) {
  const authRes = await getSessionContext();
  if (!authRes.success) return authRes.response;

  const { userId, userEmail } = authRes.context;

  try {
    const body = await request.json();
    const validated = createOrgSchema.parse(body);

    const orgId = crypto.randomUUID();
    const now = new Date();

    const [newOrg] = await db
      .insert(organizations)
      .values({
        id: orgId,
        name: validated.name,
        description: validated.description,
        currency: validated.currency.toUpperCase(),
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Add creator as active Admin
    await db.insert(orgMembers).values({
      id: `${orgId}_${userId}`,
      orgId: orgId,
      userId: userId,
      userEmail: userEmail,
      role: "admin",
      status: "active",
      invitedBy: userId,
      joinedAt: now,
    });

    return NextResponse.json(
      { success: true, data: { ...newOrg, role: "admin" } },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Create org error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
