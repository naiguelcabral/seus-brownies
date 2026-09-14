CREATE TYPE "public"."management_scenario_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TABLE "management_scenario_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"revision" integer NOT NULL,
	"scenario_version" integer NOT NULL,
	"event" varchar(40) NOT NULL,
	"actor_auth_user_id" varchar(191) NOT NULL,
	"reason" text,
	"snapshot" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "management_scenario_history_revision_unique" UNIQUE("scenario_id","revision")
);
--> statement-breakpoint
CREATE TABLE "management_scenario_mix" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"original_weight" numeric(12, 6) NOT NULL,
	"normalized_weight_bps" integer NOT NULL,
	"planned_unit_price" numeric(12, 2) NOT NULL,
	"planned_unit_cost" numeric(12, 3) NOT NULL,
	CONSTRAINT "management_scenario_mix_product_unique" UNIQUE("scenario_id","product_id"),
	CONSTRAINT "management_scenario_mix_original_weight_check" CHECK ("management_scenario_mix"."original_weight" > 0),
	CONSTRAINT "management_scenario_mix_normalized_weight_check" CHECK ("management_scenario_mix"."normalized_weight_bps" > 0 and "management_scenario_mix"."normalized_weight_bps" <= 10000)
);
--> statement-breakpoint
CREATE TABLE "management_scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_key" varchar(36) NOT NULL,
	"version" integer NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"status" "management_scenario_status" DEFAULT 'draft' NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"effective_on" date NOT NULL,
	"monthly_profit_goal" numeric(12, 2) NOT NULL,
	"fixed_monthly_costs" numeric(12, 2) NOT NULL,
	"sales_days_per_month" integer NOT NULL,
	"weeks_per_month" numeric(5, 2) NOT NULL,
	"minimum_margin_bps" integer NOT NULL,
	"fee_tax_reserve_bps" integer NOT NULL,
	"supersedes_scenario_id" integer,
	"replacement_reason" text,
	"archive_reason" text,
	"created_by_auth_user_id" varchar(191) NOT NULL,
	"updated_by_auth_user_id" varchar(191) NOT NULL,
	"activated_by_auth_user_id" varchar(191),
	"archived_by_auth_user_id" varchar(191),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	CONSTRAINT "management_scenarios_key_version_unique" UNIQUE("scenario_key","version"),
	CONSTRAINT "management_scenarios_sales_days_check" CHECK ("management_scenarios"."sales_days_per_month" between 1 and 31),
	CONSTRAINT "management_scenarios_minimum_margin_check" CHECK ("management_scenarios"."minimum_margin_bps" between 0 and 10000),
	CONSTRAINT "management_scenarios_fee_tax_reserve_check" CHECK ("management_scenarios"."fee_tax_reserve_bps" between 0 and 10000)
);
--> statement-breakpoint
ALTER TABLE "management_scenario_history" ADD CONSTRAINT "management_scenario_history_scenario_id_management_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."management_scenarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_scenario_mix" ADD CONSTRAINT "management_scenario_mix_scenario_id_management_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."management_scenarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_scenario_mix" ADD CONSTRAINT "management_scenario_mix_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "management_scenarios" ADD CONSTRAINT "management_scenarios_supersedes_fk" FOREIGN KEY ("supersedes_scenario_id") REFERENCES "public"."management_scenarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "management_scenario_history_actor_idx" ON "management_scenario_history" USING btree ("actor_auth_user_id");--> statement-breakpoint
CREATE INDEX "management_scenario_mix_product_idx" ON "management_scenario_mix" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "management_scenarios_single_active_unique" ON "management_scenarios" USING btree ("status") WHERE "management_scenarios"."status" = 'active';--> statement-breakpoint
CREATE INDEX "management_scenarios_status_effective_idx" ON "management_scenarios" USING btree ("status","effective_on");