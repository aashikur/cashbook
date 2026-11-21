import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyLogs, expenses } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { and, eq, gte, lte, isNull, desc, sql } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createLogSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(["in", "out"]).default("out"),
  category: z.string().min(1).default("General"),
  amountPaisa: z.number().int().positive("Amount must be a positive integer in paisa/cents"),
  note: z.string().max(500).optional().default(""),
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
  const category = searchParams.get("category");
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
  if (category && category !== "All") conditions.push(eq(dailyLogs.category, category));

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

    // Insert log + increment parent expense totalSpent & logCount
    const [inserted] = await db
      .insert(dailyLogs)
      .values({
        id: logId,
        orgId,
        expenseId,
        type: validated.type,
        category: validated.category,
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
      // Signed balance delta (+ for in, - for out)
      const signedDelta =
        validated.type === "in" ? validated.amountPaisa : -validated.amountPaisa;

      await db
        .update(expenses)
        .set({
          totalSpent: sql`${expenses.totalSpent} + ${signedDelta}`,
          logCount: sql`${expenses.logCount} + 1`,
          updatedAt: now,
        })
        .where(eq(expenses.id, expenseId));
    }

    const newLog =
      inserted ||
      (await db.query.dailyLogs.findFirst({
        where: eq(dailyLogs.id, logId),
      }));

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
