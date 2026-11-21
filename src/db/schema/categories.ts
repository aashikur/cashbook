/**
 * Organization-scoped custom categories for financial tagging.
 */
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(), // client-generated UUID
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("Tag"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("categories_org_name_idx").on(t.orgId, t.name),
  ]
);

export const categoriesRelations = relations(categories, ({ one }) => ({
  org: one(organizations, {
    fields: [categories.orgId],
    references: [organizations.id],
  }),
}));
