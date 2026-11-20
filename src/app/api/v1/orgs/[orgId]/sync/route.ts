import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, dailyLogs } from "@/db/schema";
import { requireOrgMember } from "@/lib/auth-helpers";
import { and, eq, gt } from "drizzle-orm";

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
  const updatedExpenses = await db.query.expenses.findMany({
    where: and(eq(expenses.orgId, orgId), gt(expenses.updatedAt, sinceDate)),
  });

  // Query daily logs updated since timestamp (includes soft-deleted items with deletedAt so mobile client deletes them)
  const updatedLogs = await db.query.dailyLogs.findMany({
    where: and(eq(dailyLogs.orgId, orgId), gt(dailyLogs.updatedAt, sinceDate)),
  });

  return NextResponse.json({
    success: true,
    data: {
      expenses: updatedExpenses,
      dailyLogs: updatedLogs,
      serverTimestamp,
    },
  });
}
