import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyLogs, expenses } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateLogSchema = z.object({
  type: z.enum(["in", "out"]).optional(),
  category: z.string().min(1).optional(),
  amountPaisa: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expenseId: z.string().uuid().optional(),
  attachments: z
    .array(
      z.object({
        key: z.string(),
        url: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number(),
      })
    )
    .optional(),
});

type RouteProps = {
  params: Promise<{ orgId: string; logId: string }>;
};

// GET /api/v1/orgs/:orgId/logs/:logId
export async function GET(_req: NextRequest, { params }: RouteProps) {
  const { orgId, logId } = await params;
  const authRes = await requireOrgMember(orgId);
  if (!authRes.success) return authRes.response;

  const log = await db.query.dailyLogs.findFirst({
    where: and(
      eq(dailyLogs.id, logId),
      eq(dailyLogs.orgId, orgId),
      isNull(dailyLogs.deletedAt)
    ),
    with: {
      expense: true,
    },
  });

  if (!log) {
    return NextResponse.json({ success: false, error: "Log not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: log });
}

// PATCH /api/v1/orgs/:orgId/logs/:logId (Admin only)
export async function PATCH(req: NextRequest, { params }: RouteProps) {
  const { orgId, logId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  try {
    const body = await req.json();
    const validated = updateLogSchema.parse(body);

    const existingLog = await db.query.dailyLogs.findFirst({
      where: and(
        eq(dailyLogs.id, logId),
        eq(dailyLogs.orgId, orgId),
        isNull(dailyLogs.deletedAt)
      ),
    });

    if (!existingLog) {
      return NextResponse.json({ success: false, error: "Log not found" }, { status: 404 });
    }

    const now = new Date();
    let newFiscalYear = existingLog.fiscalYear;
    let newFiscalMonth = existingLog.fiscalMonth;

    if (validated.logDate) {
      const [y, m] = validated.logDate.split("-").map(Number);
      newFiscalYear = y;
      newFiscalMonth = m;
    }

    const oldSigned =
      existingLog.type === "in"
        ? existingLog.amountPaisa
        : -existingLog.amountPaisa;

    const finalType = validated.type ?? existingLog.type;
    const finalAmount = validated.amountPaisa ?? existingLog.amountPaisa;
    const newSigned = finalType === "in" ? finalAmount : -finalAmount;
    const deltaSigned = newSigned - oldSigned;

    const [updatedLog] = await db
      .update(dailyLogs)
      .set({
        type: finalType,
        category: validated.category ?? existingLog.category,
        amountPaisa: finalAmount,
        note: validated.note ?? existingLog.note,
        logDate: validated.logDate ?? existingLog.logDate,
        fiscalYear: newFiscalYear,
        fiscalMonth: newFiscalMonth,
        expenseId: validated.expenseId ?? existingLog.expenseId,
        attachments: validated.attachments ?? existingLog.attachments,
        updatedAt: now,
      })
      .where(eq(dailyLogs.id, logId))
      .returning();

    // Adjust totalSpent on parent expense based on signed balance delta
    if (deltaSigned !== 0) {
      await db
        .update(expenses)
        .set({
          totalSpent: sql`${expenses.totalSpent} + ${deltaSigned}`,
          updatedAt: now,
        })
        .where(eq(expenses.id, existingLog.expenseId));
    }

    return NextResponse.json({ success: true, data: updatedLog });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update daily log" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/orgs/:orgId/logs/:logId (Soft delete, Admin only)
export async function DELETE(_req: NextRequest, { params }: RouteProps) {
  const { orgId, logId } = await params;
  const authRes = await requireOrgMember(orgId, "admin");
  if (!authRes.success) return authRes.response;

  const existingLog = await db.query.dailyLogs.findFirst({
    where: and(
      eq(dailyLogs.id, logId),
      eq(dailyLogs.orgId, orgId),
      isNull(dailyLogs.deletedAt)
    ),
  });

  if (!existingLog) {
    return NextResponse.json({ success: false, error: "Log not found" }, { status: 404 });
  }

  const now = new Date();

  // Soft delete log by setting deletedAt
  await db
    .update(dailyLogs)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(eq(dailyLogs.id, logId));

  const oldSigned =
    existingLog.type === "in"
      ? existingLog.amountPaisa
      : -existingLog.amountPaisa;

  // Revert signed delta and decrement logCount on parent expense
  await db
    .update(expenses)
    .set({
      totalSpent: sql`${expenses.totalSpent} - ${oldSigned}`,
      logCount: sql`greatest(0, ${expenses.logCount} - 1)`,
      updatedAt: now,
    })
    .where(eq(expenses.id, existingLog.expenseId));

  return NextResponse.json({ success: true, message: "Log soft-deleted successfully" });
}
