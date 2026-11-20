import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, expenses, dailyLogs, user } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, unknown> = {};
  let isHealthy = true;

  // 1. Neon Database Connection & Latency Check
  let dbLatency = 0;
  try {
    const dbStart = Date.now();
    const result = await db.execute(
      sql`SELECT 1 as ping, current_database() as db, NOW() as server_time;`
    );
    dbLatency = Date.now() - dbStart;
    const pingRow =
      result.rows && result.rows[0]
        ? (result.rows[0] as Record<string, unknown>)
        : {};

    // Fetch quick summary counts
    const [orgCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations);
    const [bookCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(expenses);
    const [logCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailyLogs);
    const [userCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(user);

    checks.database = {
      status: "connected",
      latencyMs: dbLatency,
      databaseName: pingRow.db || "neondb",
      serverTime: pingRow.server_time,
      records: {
        users: Number(userCount?.count || 0),
        organizations: Number(orgCount?.count || 0),
        books: Number(bookCount?.count || 0),
        transactions: Number(logCount?.count || 0),
      },
    };
  } catch (err: unknown) {
    isHealthy = false;
    checks.database = {
      status: "disconnected",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // 2. Authentication Engine Check
  const hasAuthSecret = Boolean(process.env.BETTER_AUTH_SECRET);
  checks.auth = {
    status: hasAuthSecret ? "configured" : "missing_secret",
    engine: "Better Auth",
    googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  };

  // 3. Cloudflare R2 Object Storage Check
  const hasR2Creds = Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
  checks.storage = {
    status: hasR2Creds ? "configured" : "demo_mode_local",
    bucket: process.env.R2_BUCKET_NAME || "cashbook-receipts",
    zeroEgress: true,
  };

  // 4. Runtime & Process Metrics
  const totalLatencyMs = Date.now() - startTime;
  const memoryUsage = process.memoryUsage();

  const responseBody = {
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    totalLatencyMs,
    environment: process.env.NODE_ENV || "development",
    services: checks,
    memory: {
      rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
    },
  };

  return NextResponse.json(responseBody, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
