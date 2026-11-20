/**
 * Organizations & RBAC membership tables.
 * Docs ref: §1.2 organizations, §1.3 org_members
 */
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

// ─── Enums & Types ────────────────────────────────────────────────────────────

export const memberRoleEnum = pgEnum("member_role", ["admin", "viewer"]);
export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "active",
  "revoked",
]);

export type MemberRole = "admin" | "viewer";
export type InviteStatus = "pending" | "active" | "revoked";

// ─── organizations ─────────────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(), // client-generated UUID
  name: text("name").notNull(),
  description: text("description"),
  currency: text("currency").notNull().default("BDT"), // ISO 4217
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── org_members ───────────────────────────────────────────────────────────────

export const orgMembers = pgTable(
  "org_members",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(), // denormalized for fast listing
    role: memberRoleEnum("role").notNull().default("viewer"),
    status: inviteStatusEnum("status").notNull().default("pending"),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("org_members_org_user_idx").on(t.orgId, t.userId),
    index("org_members_user_status_idx").on(t.userId, t.status),
  ]
);

// ─── Relations ─────────────────────────────────────────────────────────────────

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(user, { fields: [organizations.ownerId], references: [user.id] }),
  members: many(orgMembers),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  org: one(organizations, { fields: [orgMembers.orgId], references: [organizations.id] }),
  user: one(user, { fields: [orgMembers.userId], references: [user.id] }),
  inviter: one(user, { fields: [orgMembers.invitedBy], references: [user.id] }),
}));
