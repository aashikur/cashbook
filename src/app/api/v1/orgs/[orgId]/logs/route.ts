import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyLogs } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { and, eq, isNull, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ orgId: string }>;
};

// GET /api/v1/orgs/:orgId/logs (Paginated monthly / yearly / expense browsing)
export async function GET(req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId);
  if (!authRes.success) return authRes.response;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined;
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : undefined;
  const expenseId = searchParams.get("expenseId") || undefined;
  const date = searchParams.get("date") || undefined;
  const category = searchParams.get("category") || undefined;
  const type = searchParams.get("type") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const offset = (page - 1) * limit;

  const conditions = [
    eq(dailyLogs.orgId, orgId),
    isNull(dailyLogs.deletedAt),
  ];

  if (year) conditions.push(eq(dailyLogs.fiscalYear, year));
  if (month) conditions.push(eq(dailyLogs.fiscalMonth, month));
  if (expenseId) conditions.push(eq(dailyLogs.expenseId, expenseId));
  if (date) conditions.push(eq(dailyLogs.logDate, date));
  if (category && category !== "All") conditions.push(eq(dailyLogs.category, category));
  if (type === "in" || type === "out") conditions.push(eq(dailyLogs.type, type));

  const items = await db.query.dailyLogs.findMany({
    where: and(...conditions),
    with: {
      expense: {
        columns: {
          id: true,
          title: true,
          category: true,
        },
      },
      loggedByUser: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      updatedByUser: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [desc(dailyLogs.logDate), desc(dailyLogs.createdAt)],
    limit,
    offset,
  });

  const enrichedItems = items.map((log) => ({
    ...log,
    loggedByName: log.loggedByUser?.name || log.loggedByUser?.email || null,
    updatedByName: log.updatedByUser?.name || log.updatedByUser?.email || null,
  }));

  return NextResponse.json({
    success: true,
    data: {
      items: enrichedItems,
      page,
      limit,
      hasMore: items.length === limit,
    },
  });
}
