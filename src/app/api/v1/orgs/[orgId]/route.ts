import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, dailyLogs } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { eq, and, sql, isNull } from "drizzle-orm";
import { z } from "zod";

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).optional(),
});

type RouteProps = {
  params: Promise<{ orgId: string }>;
};

// GET /api/v1/orgs/:orgId
export async function GET(_req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId);
  if (!authRes.success) return authRes.response;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (!org) {
    return NextResponse.json(
      { success: false, error: "Organization not found" },
      { status: 404 }
    );
  }

  const currentYear = new Date().getFullYear();

  // Aggregate current year total spent from active logs
  const [summary] = await db
    .select({
      totalPaisa: sql<number>`coalesce(sum(${dailyLogs.amountPaisa}), 0)::int`,
      logCount: sql<number>`count(${dailyLogs.id})::int`,
    })
    .from(dailyLogs)
    .where(
      and(
        eq(dailyLogs.orgId, orgId),
        eq(dailyLogs.fiscalYear, currentYear),
        isNull(dailyLogs.deletedAt)
      )
    );

  return NextResponse.json({
    success: true,
    data: {
      ...org,
      role: authRes.context.role,
      currentYearSummary: {
        year: currentYear,
        totalPaisa: summary?.totalPaisa ?? 0,
        logCount: summary?.logCount ?? 0,
      },
    },
  });
}

// PATCH /api/v1/orgs/:orgId (Admin only)
export async function PATCH(req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  try {
    const body = await req.json();
    const validated = updateOrgSchema.parse(body);

    const [updated] = await db
      .update(organizations)
      .set({
        ...validated,
        currency: validated.currency ? validated.currency.toUpperCase() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/orgs/:orgId (Owner only)
export async function DELETE(_req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (!org) {
    return NextResponse.json(
      { success: false, error: "Organization not found" },
      { status: 404 }
    );
  }

  if (org.ownerId !== authRes.context.userId) {
    return NextResponse.json(
      { success: false, error: "Only the organization owner can delete the organization." },
      { status: 403 }
    );
  }

  await db.delete(organizations).where(eq(organizations.id, orgId));

  return NextResponse.json({ success: true, message: "Organization deleted successfully" });
}
