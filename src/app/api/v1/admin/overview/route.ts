import { NextResponse } from "next/server";
import { db } from "@/db";
import { user, organizations, expenses, dailyLogs, orgMembers } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/admin-helpers";
import { desc, isNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/admin/overview (Super Admin only)
export async function GET() {
  const authRes = await requireSuperAdmin();
  if (!authRes.success) return authRes.response;

  try {
    // 1. Total counts across platform
    const [userCount] = await db
      .select({ count: sql<number>`count(${user.id})::int` })
      .from(user);

    const [orgCount] = await db
      .select({ count: sql<number>`count(${organizations.id})::int` })
      .from(organizations);

    const [bookCount] = await db
      .select({ count: sql<number>`count(${expenses.id})::int` })
      .from(expenses);

    const [logCount] = await db
      .select({ count: sql<number>`count(${dailyLogs.id})::int` })
      .from(dailyLogs)
      .where(isNull(dailyLogs.deletedAt));

    // 2. Fetch all users with their memberships & organizations
    const allUsers = await db.query.user.findMany({
      orderBy: [desc(user.createdAt)],
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    const allOrgs = await db.query.organizations.findMany({
      orderBy: [desc(organizations.createdAt)],
      with: {
        owner: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          columns: {
            id: true,
            userId: true,
            userEmail: true,
            role: true,
            status: true,
          },
        },
      },
    });

    // Count books per organization
    const booksPerOrg = await db
      .select({
        orgId: expenses.orgId,
        count: sql<number>`count(${expenses.id})::int`,
      })
      .from(expenses)
      .groupBy(expenses.orgId);

    const orgBookMap = new Map<string, number>();
    for (const b of booksPerOrg) {
      orgBookMap.set(b.orgId, b.count);
    }

    // Build enriched users list
    const enrichedUsers = allUsers.map((u) => {
      const ownedOrgs = allOrgs.filter((o) => o.ownerId === u.id);
      const memberOrgs = allOrgs.filter((o) =>
        o.members.some((m) => m.userId === u.id && m.status === "active")
      );

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        createdAt: u.createdAt,
        ownedOrgsCount: ownedOrgs.length,
        ownedOrgs: ownedOrgs.map((o) => ({
          id: o.id,
          name: o.name,
          currency: o.currency,
          booksCount: orgBookMap.get(o.id) || 0,
          membersCount: o.members.length,
          createdAt: o.createdAt,
        })),
        memberOrgsCount: memberOrgs.length,
      };
    });

    // Enriched organizations overview
    const enrichedOrgs = allOrgs.map((o) => ({
      id: o.id,
      name: o.name,
      currency: o.currency,
      ownerId: o.ownerId,
      ownerName: o.owner?.name || o.owner?.email || "Unknown",
      ownerEmail: o.owner?.email || "",
      membersCount: o.members.length,
      booksCount: orgBookMap.get(o.id) || 0,
      createdAt: o.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalUsers: userCount?.count || 0,
          totalOrganizations: orgCount?.count || 0,
          totalBooks: bookCount?.count || 0,
          totalTransactions: logCount?.count || 0,
        },
        users: enrichedUsers,
        organizations: enrichedOrgs,
      },
    });
  } catch (err) {
    console.error("Admin overview error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate admin overview" },
      { status: 500 }
    );
  }
}
