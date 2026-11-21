import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories, dailyLogs } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { and, eq, ilike } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateCategorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(30).optional(),
});

type RouteProps = {
  params: Promise<{ orgId: string; categoryId: string }>;
};

// PATCH /api/v1/orgs/:orgId/categories/:categoryId
export async function PATCH(req: NextRequest, { params }: RouteProps) {
  const { orgId, categoryId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  try {
    const body = await req.json();
    const validated = updateCategorySchema.parse(body);
    const newName = validated.name.trim();

    // Check existing target category
    const targetCat = await db.query.categories.findFirst({
      where: and(eq(categories.id, categoryId), eq(categories.orgId, orgId)),
    });

    if (!targetCat) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    const oldName = targetCat.name;

    // Check name collision
    if (oldName.toLowerCase() !== newName.toLowerCase()) {
      const collision = await db.query.categories.findFirst({
        where: and(eq(categories.orgId, orgId), ilike(categories.name, newName)),
      });
      if (collision) {
        return NextResponse.json(
          { success: false, error: "Another category with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Atomic update of category and historical daily logs
    const [updated] = await db
      .update(categories)
      .set({
        name: newName,
        icon: validated.icon || targetCat.icon,
        updatedAt: new Date(),
      })
      .where(and(eq(categories.id, categoryId), eq(categories.orgId, orgId)))
      .returning();

    if (oldName !== newName) {
      await db
        .update(dailyLogs)
        .set({
          category: newName,
          updatedAt: new Date(),
        })
        .where(
          and(eq(dailyLogs.orgId, orgId), eq(dailyLogs.category, oldName))
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
      { success: false, error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/orgs/:orgId/categories/:categoryId
export async function DELETE(_req: NextRequest, { params }: RouteProps) {
  const { orgId, categoryId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  const targetCat = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.orgId, orgId)),
  });

  if (!targetCat) {
    return NextResponse.json(
      { success: false, error: "Category not found" },
      { status: 404 }
    );
  }

  const categoryName = targetCat.name;

  // 1. Reassign all historical logs with this category to 'General' to protect financial data integrity
  await db
    .update(dailyLogs)
    .set({
      category: "General",
      updatedAt: new Date(),
    })
    .where(
      and(eq(dailyLogs.orgId, orgId), eq(dailyLogs.category, categoryName))
    );

  // 2. Delete the category record
  await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.orgId, orgId)));

  return NextResponse.json({
    success: true,
    message: `Category "${categoryName}" deleted. Associated logs were safely reassigned to "General".`,
  });
}
