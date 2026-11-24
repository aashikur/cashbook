import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateExpenseSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  category: z.string().max(50).optional(),
  isArchived: z.boolean().optional(),
});

type RouteProps = {
  params: Promise<{ orgId: string; expenseId: string }>;
};

// GET /api/v1/orgs/:orgId/expenses/:expenseId
export async function GET(_req: NextRequest, { params }: RouteProps) {
  const { orgId, expenseId } = await params;
  const authRes = await requireOrgMember(orgId);
  if (!authRes.success) return authRes.response;

  const expense = await db.query.expenses.findFirst({
    where: and(eq(expenses.id, expenseId), eq(expenses.orgId, orgId)),
    with: {
      createdByUser: {
        columns: { id: true, name: true, email: true },
      },
      updatedByUser: {
        columns: { id: true, name: true, email: true },
      },
    },
  });

  if (!expense) {
    return NextResponse.json(
      { success: false, error: "Expense ledger not found" },
      { status: 404 }
    );
  }

  const enriched = {
    ...expense,
    createdByName: expense.createdByUser?.name || expense.createdByUser?.email || null,
    updatedByName: expense.updatedByUser?.name || expense.updatedByUser?.email || null,
  };

  return NextResponse.json({ success: true, data: enriched });
}

// PATCH /api/v1/orgs/:orgId/expenses/:expenseId (Admin only)
export async function PATCH(req: NextRequest, { params }: RouteProps) {
  const { orgId, expenseId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  try {
    const body = await req.json();
    const validated = updateExpenseSchema.parse(body);

    const [updated] = await db
      .update(expenses)
      .set({
        ...validated,
        updatedBy: authRes.context.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(expenses.id, expenseId), eq(expenses.orgId, orgId)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Expense ledger not found" },
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
      { success: false, error: "Failed to update expense ledger" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/orgs/:orgId/expenses/:expenseId (Admin only)
// Docs ref §3.4: "Hard-deletes expense only if logCount === 0"
export async function DELETE(_req: NextRequest, { params }: RouteProps) {
  const { orgId, expenseId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  const expense = await db.query.expenses.findFirst({
    where: and(eq(expenses.id, expenseId), eq(expenses.orgId, orgId)),
  });

  if (!expense) {
    return NextResponse.json(
      { success: false, error: "Expense ledger not found" },
      { status: 404 }
    );
  }

  if (expense.logCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Cannot delete expense ledger with existing logs. Archive it instead to preserve 15-year historical records.",
      },
      { status: 400 }
    );
  }

  await db
    .delete(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.orgId, orgId)));

  return NextResponse.json({
    success: true,
    message: "Expense ledger deleted successfully",
  });
}
