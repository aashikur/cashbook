/**
 * Expense ledger categories per organization.
 * Docs ref: §1.4 expenses
 */
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { organizations } from "./organizations";

export const expenses = pgTable(
  "expenses",
  {
    id: text("id").primaryKey(), // client-generated UUID (offline support)
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category"),
    // Running aggregates — updated atomically on log create/update/delete
    totalSpent: numeric("total_spent", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    logCount: integer("log_count").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"), // Soft-delete tombstone for delta sync
  },
  (t) => [
    index("expenses_org_archived_updated_idx").on(
      t.orgId,
      t.isArchived,
      t.updatedAt
    ),
    index("expenses_org_deleted_idx").on(t.orgId, t.deletedAt),
  ]
);

// ─── Relations ─────────────────────────────────────────────────────────────────

export const expensesRelations = relations(expenses, ({ one }) => ({
  org: one(organizations, {
    fields: [expenses.orgId],
    references: [organizations.id],
  }),
  createdByUser: one(user, {
    fields: [expenses.createdBy],
    references: [user.id],
  }),
  updatedByUser: one(user, {
    fields: [expenses.updatedBy],
    references: [user.id],
  }),
}));
