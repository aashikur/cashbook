import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyLogs, expenses } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { and, eq, gte, lte, isNull, desc, sql } from "drizzle-orm";
import { z } from "zod";

const createLogSchema = z.object({
  id: z.string().uuid().optional(),
  amountPaisa: z.number().int().positive("Amount must be a positive integer in paisa/cents"),
  note: z.string().min(1, "Note description is required").max(500),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  attachments: z
    .array(
      z.object({
        key: z.string(),
        url: z.string().url(),
        mimeType: z.string(),
        sizeBytes: z.number(),
      })
    )
    .default([]),
});

type RouteProps = {
  params: Promise<{ orgId: string; expenseId: string }>;
};

// GET /api/v1/orgs/:orgId/expenses/:expenseId/logs
export async function GET(req: NextRequest, { params }: RouteProps) {
  const { orgId, expenseId } = await params;
  const authRes = await requireOrgMember(orgId);
  if (!authRes.success) return authRes.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const offset = (page - 1) * limit;

  const conditions = [
    eq(dailyLogs.orgId, orgId),
    eq(dailyLogs.expenseId, expenseId),
    isNull(dailyLogs.deletedAt),
  ];

  if (from) conditions.push(gte(dailyLogs.logDate, from));
  if (to) conditions.push(lte(dailyLogs.logDate, to));

  const items = await db.query.dailyLogs.findMany({
    where: and(...conditions),
    orderBy: [desc(dailyLogs.logDate), desc(dailyLogs.createdAt)],
    limit,
    offset,
  });

  return NextResponse.json({
    success: true,
    data: {
      items,
      page,
      limit,
      hasMore: items.length === limit,
    },
  });
}

// POST /api/v1/orgs/:orgId/expenses/:expenseId/logs (Admin only, Idempotent)
export async function POST(req: NextRequest, { params }: RouteProps) {
  const { orgId, expenseId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  try {
    const body = await req.json();
    const validated = createLogSchema.parse(body);

    const logId =
      req.headers.get("Idempotency-Key") || validated.id || crypto.randomUUID();

    // Derive fiscalYear and fiscalMonth from logDate (YYYY-MM-DD)
    const [year, month] = validated.logDate.split("-").map(Number);
    const now = new Date();

    // Verify parent expense exists in this org
    const expense = await db.query.expenses.findFirst({
      where: and(eq(expenses.id, expenseId), eq(expenses.orgId, orgId)),
    });

    if (!expense) {
      return NextResponse.json(
        { success: false, error: "Parent expense ledger not found" },
        { status: 404 }
      );
    }

    // Atomic insert of log + atomic increment of parent expense totalSpent & logCount
    const newLog = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(dailyLogs)
        .values({
          id: logId,
          orgId,
          expenseId,
          amountPaisa: validated.amountPaisa,
          note: validated.note,
          logDate: validated.logDate,
          fiscalYear: year,
          fiscalMonth: month,
          attachments: validated.attachments,
          loggedBy: authRes.context.userId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: dailyLogs.id })
        .returning();

      if (inserted) {
        // Increment running total and count on parent expense
        await tx
          .update(expenses)
          .set({
            totalSpent: sql`${expenses.totalSpent} + ${validated.amountPaisa}`,
            logCount: sql`${expenses.logCount} + 1`,
            updatedAt: now,
          })
          .where(eq(expenses.id, expenseId));
      }

      return (
        inserted ||
        (await tx.query.dailyLogs.findFirst({
          where: eq(dailyLogs.id, logId),
        }))
      );
    });

    return NextResponse.json({ success: true, data: newLog }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Create log error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to record daily log" },
      { status: 500 }
    );
  }
}
