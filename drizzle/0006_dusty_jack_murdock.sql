CREATE TABLE "operational_cost_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" varchar(100) NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"type" "operational_cost_type" NOT NULL,
	"unit" varchar(24) NOT NULL,
	"unit_amount" numeric(12, 2) NOT NULL,
	"effective_from" date NOT NULL,
	"source_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operational_cost_rates_source_id_unique" UNIQUE("source_id"),
	CONSTRAINT "operational_cost_rates_source_hash_unique" UNIQUE("source_hash")
);
--> statement-breakpoint
ALTER TABLE "production_profiles" DROP CONSTRAINT "production_profiles_product_id_unique";--> statement-breakpoint
ALTER TABLE "operational_costs" ADD COLUMN "operational_rate_id" integer;--> statement-breakpoint
ALTER TABLE "operational_costs" ADD CONSTRAINT "operational_costs_operational_rate_id_operational_cost_rates_id_fk" FOREIGN KEY ("operational_rate_id") REFERENCES "public"."operational_cost_rates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_profiles" ADD CONSTRAINT "production_profiles_recipe_version_id_product_id_unique" UNIQUE("recipe_version_id","product_id");