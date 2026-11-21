import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { and, eq, ilike } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(50),
  icon: z.string().max(30).optional().default("Tag"),
});

type RouteProps = {
  params: Promise<{ orgId: string }>;
};

// GET /api/v1/orgs/:orgId/categories
export async function GET(_req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId);
  if (!authRes.success) return authRes.response;

  const items = await db.query.categories.findMany({
    where: eq(categories.orgId, orgId),
    orderBy: (c, { asc }) => [asc(c.name)],
  });

  return NextResponse.json({ success: true, data: items });
}

// POST /api/v1/orgs/:orgId/categories
export async function POST(req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId);
  if (!authRes.success) return authRes.response;

  try {
    const body = await req.json();
    const validated = createCategorySchema.parse(body);

    const trimmedName = validated.name.trim();

    // Check duplicate
    const existing = await db.query.categories.findFirst({
      where: and(
        eq(categories.orgId, orgId),
        ilike(categories.name, trimmedName)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(categories)
      .values({
        id: validated.id || crypto.randomUUID(),
        orgId,
        name: trimmedName,
        icon: validated.icon || "Tag",
      })
      .returning();

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create category" },
      { status: 500 }
    );
  }
}
