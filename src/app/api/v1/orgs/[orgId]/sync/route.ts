import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, dailyLogs } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { and, eq, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ orgId: string }>;
};

// GET /api/v1/orgs/:orgId/sync?since=2026-11-20T00:00:00Z
// Incremental mobile delta sync (Docs ref §2.4, §3.6)
export async function GET(req: NextRequest, { params }: RouteProps) {
  const { orgId } = await params;
  const authRes = await requireOrgMember(orgId);
  if (!authRes.success) return authRes.response;

  const { searchParams } = new URL(req.url);
  const sinceParam = searchParams.get("since");
  const sinceDate = sinceParam ? new Date(sinceParam) : new Date(0);

  const serverTimestamp = new Date().toISOString();

  // Query expenses updated since timestamp
  const updatedExpensesRaw = await db.query.expenses.findMany({
    where: and(eq(expenses.orgId, orgId), gt(expenses.updatedAt, sinceDate)),
    with: {
      createdByUser: {
        columns: { id: true, name: true, email: true },
      },
      updatedByUser: {
        columns: { id: true, name: true, email: true },
      },
    },
  });

  const updatedExpenses = updatedExpensesRaw.map((e) => ({
    ...e,
    createdByName: e.createdByUser?.name || e.createdByUser?.email || null,
    updatedByName: e.updatedByUser?.name || e.updatedByUser?.email || null,
  }));

  // Query daily logs updated since timestamp (includes soft-deleted items with deletedAt so mobile client deletes them)
  const updatedLogsRaw = await db.query.dailyLogs.findMany({
    where: and(eq(dailyLogs.orgId, orgId), gt(dailyLogs.updatedAt, sinceDate)),
    with: {
      loggedByUser: {
        columns: { id: true, name: true, email: true },
      },
      updatedByUser: {
        columns: { id: true, name: true, email: true },
      },
    },
  });

  const updatedLogs = updatedLogsRaw.map((l) => ({
    ...l,
    loggedByName: l.loggedByUser?.name || l.loggedByUser?.email || null,
    updatedByName: l.updatedByUser?.name || l.updatedByUser?.email || null,
  }));

  return NextResponse.json({
    success: true,
    data: {
      expenses: updatedExpenses,
      dailyLogs: updatedLogs,
      serverTimestamp,
    },
  });
}
