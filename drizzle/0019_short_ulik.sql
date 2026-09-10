CREATE TYPE "public"."sale_adjustment_kind" AS ENUM('none', 'discount', 'combo', 'gift', 'manual_adjustment');--> statement-breakpoint
CREATE TABLE "management_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"monthly_profit_goal" numeric(12, 2) NOT NULL,
	"fixed_monthly_costs" numeric(12, 2) NOT NULL,
	"sales_days_per_month" integer NOT NULL,
	"weeks_per_month" numeric(5, 2) NOT NULL,
	"normal_revenue_tolerance" numeric(6, 4) NOT NULL,
	"critical_revenue_tolerance" numeric(6, 4) NOT NULL,
	"minimum_product_margin" numeric(6, 4) NOT NULL,
	"fee_tax_reserve_rate" numeric(6, 4) NOT NULL,
	"updated_by_auth_user_id" varchar(191),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "management_settings" (
	"id",
	"version",
	"monthly_profit_goal",
	"fixed_monthly_costs",
	"sales_days_per_month",
	"weeks_per_month",
	"normal_revenue_tolerance",
	"critical_revenue_tolerance",
	"minimum_product_margin",
	"fee_tax_reserve_rate"
) VALUES (1, 1, '10000.00', '2200.00', 20, '4.00', '0.0300', '0.0800', '0.7000', '0.0000');
--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "reported_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "adjustment_kind" "sale_adjustment_kind" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "adjustment_reason" text;
