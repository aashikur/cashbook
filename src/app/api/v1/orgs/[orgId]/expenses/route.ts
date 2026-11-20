import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";

const createExpenseSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(100),
  category: z.string().max(50).optional(),
});

type RouteProps = {
  params: Promise<{ orgId: string }>;
};

// GET /api/v1/orgs/:orgId/expenses
export async function GET(req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId);
  if (!authRes.success) return authRes.response;

  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("includeArchived") === "true";

  const conditions = [eq(expenses.orgId, orgId)];
  if (!includeArchived) {
    conditions.push(eq(expenses.isArchived, false));
  }

  const results = await db.query.expenses.findMany({
    where: and(...conditions),
    orderBy: [desc(expenses.updatedAt)],
  });

  return NextResponse.json({ success: true, data: results });
}

// POST /api/v1/orgs/:orgId/expenses (Admin only, idempotent)
export async function POST(req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  try {
    const body = await req.json();
    const validated = createExpenseSchema.parse(body);

    const idempotencyId =
      req.headers.get("Idempotency-Key") || validated.id || crypto.randomUUID();

    const now = new Date();

    const [expense] = await db
      .insert(expenses)
      .values({
        id: idempotencyId,
        orgId,
        title: validated.title,
        category: validated.category,
        totalSpent: "0",
        logCount: 0,
        isArchived: false,
        createdBy: authRes.context.userId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: expenses.id })
      .returning();

    // If onConflictDoNothing occurred (idempotent replay), fetch existing
    const finalExpense =
      expense ||
      (await db.query.expenses.findFirst({
        where: eq(expenses.id, idempotencyId),
      }));

    return NextResponse.json({ success: true, data: finalExpense }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create expense ledger" },
      { status: 500 }
    );
  }
}
