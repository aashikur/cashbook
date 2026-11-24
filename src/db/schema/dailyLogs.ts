/**
 * Daily log entries — the core financial ledger.
 * Docs ref: §1.5 daily_logs, §2 database indexes
 *
 * Compound indexes on (orgId, fiscalYear, fiscalMonth, logDate) guarantee
 * sub-100ms queries across 15 years of historical data.
 */
import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { organizations } from "./organizations";
import { expenses } from "./expenses";

// ─── R2 attachment sub-type (stored as jsonb array) ───────────────────────────

export type R2Attachment = {
  key: string; // orgs/{orgId}/{fiscalYear}/{fiscalMonth}/{uuid}.webp
  url: string;
  mimeType: string;
  sizeBytes: number;
};

// ─── daily_logs ────────────────────────────────────────────────────────────────

export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: text("id").primaryKey(), // client-generated UUID (Idempotency-Key)
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "restrict" }),
    // Explicit transaction direction: "in" (Cash In) vs "out" (Cash Out / Expense)
    type: text("type").$type<"in" | "out">().notNull().default("out"),
    // High-level category (Rent, EMI, Food, Shopping, Utilities, Salary, etc. Default: General)
    category: text("category").notNull().default("General"),
    // Store as integer cents (BDT paisa) to avoid floating-point drift.
    // e.g. ৳1,250.75 → 125075
    amountPaisa: integer("amount_paisa").notNull(),
    note: text("note").notNull(),
    logDate: text("log_date").notNull(), // YYYY-MM-DD (indexed)
    fiscalYear: integer("fiscal_year").notNull(),
    fiscalMonth: integer("fiscal_month").notNull(), // 1–12
    attachments: jsonb("attachments").$type<R2Attachment[]>().default([]),
    loggedBy: text("logged_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"), // soft-delete for delta sync
  },
  (t) => [
    // Primary browsing: monthly ledger view
    index("daily_logs_org_year_month_date_idx").on(
      t.orgId,
      t.fiscalYear,
      t.fiscalMonth,
      t.logDate
    ),
    // Expense drill-down
    index("daily_logs_org_expense_date_idx").on(
      t.orgId,
      t.expenseId,
      t.logDate
    ),
    // Category indexing for fast analytics & filtering
    index("daily_logs_org_category_idx").on(t.orgId, t.category),
    // Delta sync for mobile clients
    index("daily_logs_org_updated_idx").on(t.orgId, t.updatedAt),
  ]
);

// ─── Relations ─────────────────────────────────────────────────────────────────

export const dailyLogsRelations = relations(dailyLogs, ({ one }) => ({
  org: one(organizations, {
    fields: [dailyLogs.orgId],
    references: [organizations.id],
  }),
  expense: one(expenses, {
    fields: [dailyLogs.expenseId],
    references: [expenses.id],
  }),
  loggedByUser: one(user, {
    fields: [dailyLogs.loggedBy],
    references: [user.id],
  }),
  updatedByUser: one(user, {
    fields: [dailyLogs.updatedBy],
    references: [user.id],
  }),
}));
