CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'Tag' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD COLUMN "type" text DEFAULT 'out' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD COLUMN "category" text DEFAULT 'General' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_org_name_idx" ON "categories" USING btree ("org_id","name");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_org_deleted_idx" ON "expenses" USING btree ("org_id","deleted_at");--> statement-breakpoint
CREATE INDEX "daily_logs_org_category_idx" ON "daily_logs" USING btree ("org_id","category");