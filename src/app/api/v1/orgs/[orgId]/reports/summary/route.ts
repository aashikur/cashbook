import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyLogs, expenses } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { and, eq, isNull, sql } from "drizzle-orm";

type RouteProps = {
  params: Promise<{ orgId: string }>;
};

// GET /api/v1/orgs/:orgId/reports/summary?year=2026
export async function GET(req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId);
  if (!authRes.success) return authRes.response;

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || `${new Date().getFullYear()}`, 10);

  // 1. Monthly aggregate for the requested fiscal year
  const monthlyRows = await db
    .select({
      fiscalYear: dailyLogs.fiscalYear,
      fiscalMonth: dailyLogs.fiscalMonth,
      totalPaisa: sql<number>`coalesce(sum(${dailyLogs.amountPaisa}), 0)::int`,
      logCount: sql<number>`count(${dailyLogs.id})::int`,
    })
    .from(dailyLogs)
    .where(
      and(
        eq(dailyLogs.orgId, orgId),
        eq(dailyLogs.fiscalYear, year),
        isNull(dailyLogs.deletedAt)
      )
    )
    .groupBy(dailyLogs.fiscalYear, dailyLogs.fiscalMonth)
    .orderBy(dailyLogs.fiscalMonth);

  // 2. Expense category breakdown
  const expenseRows = await db
    .select({
      expenseId: dailyLogs.expenseId,
      expenseTitle: expenses.title,
      totalPaisa: sql<number>`coalesce(sum(${dailyLogs.amountPaisa}), 0)::int`,
      logCount: sql<number>`count(${dailyLogs.id})::int`,
    })
    .from(dailyLogs)
    .innerJoin(expenses, eq(dailyLogs.expenseId, expenses.id))
    .where(
      and(
        eq(dailyLogs.orgId, orgId),
        eq(dailyLogs.fiscalYear, year),
        isNull(dailyLogs.deletedAt)
      )
    )
    .groupBy(dailyLogs.expenseId, expenses.title)
    .orderBy(sql`sum(${dailyLogs.amountPaisa}) desc`);

  const grandTotalPaisa = monthlyRows.reduce((acc, r) => acc + r.totalPaisa, 0);

  return NextResponse.json({
    success: true,
    data: {
      year,
      grandTotalPaisa,
      monthlyBreakdown: monthlyRows,
      expenseBreakdown: expenseRows,
    },
  });
}
