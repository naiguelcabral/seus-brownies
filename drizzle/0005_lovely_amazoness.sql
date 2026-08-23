CREATE TYPE "public"."recipe_version_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TABLE "production_batch_consumptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_key" varchar(160) NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"production_batch_id" integer NOT NULL,
	"recipe_item_id" integer,
	"product_id" integer NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"unit_cost" numeric(12, 2),
	"total_cost" numeric(12, 2),
	"source_payload" jsonb NOT NULL,
	CONSTRAINT "production_batch_consumptions_source_key_unique" UNIQUE("source_key"),
	CONSTRAINT "production_batch_consumptions_source_hash_unique" UNIQUE("source_hash")
);
--> statement-breakpoint
CREATE TABLE "production_batch_losses" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_key" varchar(160) NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"production_batch_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"reason" varchar(240),
	"source_payload" jsonb NOT NULL,
	CONSTRAINT "production_batch_losses_source_key_unique" UNIQUE("source_key"),
	CONSTRAINT "production_batch_losses_source_hash_unique" UNIQUE("source_hash")
);
--> statement-breakpoint
CREATE TABLE "production_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" varchar(80) NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"recipe_version_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"cut_size" varchar(80),
	"filling" varchar(120),
	"expected_yield" numeric(14, 3) NOT NULL,
	"packaging_product_id" integer,
	"packaging_quantity" numeric(14, 3),
	"source_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_profiles_source_id_unique" UNIQUE("source_id"),
	CONSTRAINT "production_profiles_source_hash_unique" UNIQUE("source_hash"),
	CONSTRAINT "production_profiles_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "recipe_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_key" varchar(160) NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"recipe_version_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"source_name" varchar(160) NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"unit" "measurement_unit" NOT NULL,
	"historical_cost" numeric(12, 2),
	"source_payload" jsonb NOT NULL,
	CONSTRAINT "recipe_items_source_key_unique" UNIQUE("source_key"),
	CONSTRAINT "recipe_items_source_hash_unique" UNIQUE("source_hash")
);
--> statement-breakpoint
CREATE TABLE "recipe_operational_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_key" varchar(160) NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"recipe_version_id" integer NOT NULL,
	"type" "operational_cost_type" NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"unit" varchar(24) NOT NULL,
	"historical_cost" numeric(12, 2),
	"source_payload" jsonb NOT NULL,
	CONSTRAINT "recipe_operational_requirements_source_key_unique" UNIQUE("source_key"),
	CONSTRAINT "recipe_operational_requirements_source_hash_unique" UNIQUE("source_hash")
);
--> statement-breakpoint
CREATE TABLE "recipe_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" varchar(80) NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"name" varchar(160) NOT NULL,
	"version" integer NOT NULL,
	"status" "recipe_version_status" DEFAULT 'draft' NOT NULL,
	"source_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_versions_source_id_unique" UNIQUE("source_id"),
	CONSTRAINT "recipe_versions_source_hash_unique" UNIQUE("source_hash")
);
--> statement-breakpoint
ALTER TABLE "production_batch_outputs" ADD COLUMN "source_key" varchar(160);--> statement-breakpoint
ALTER TABLE "production_batch_outputs" ADD COLUMN "source_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "production_profile_id" integer;--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "recipe_version_id" integer;--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "planned_batch_count" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "planned_quantity" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "actual_quantity" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "source_payload" jsonb;--> statement-breakpoint
ALTER TABLE "production_batch_consumptions" ADD CONSTRAINT "production_batch_consumptions_production_batch_id_production_batches_id_fk" FOREIGN KEY ("production_batch_id") REFERENCES "public"."production_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batch_consumptions" ADD CONSTRAINT "production_batch_consumptions_recipe_item_id_recipe_items_id_fk" FOREIGN KEY ("recipe_item_id") REFERENCES "public"."recipe_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batch_consumptions" ADD CONSTRAINT "production_batch_consumptions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batch_losses" ADD CONSTRAINT "production_batch_losses_production_batch_id_production_batches_id_fk" FOREIGN KEY ("production_batch_id") REFERENCES "public"."production_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batch_losses" ADD CONSTRAINT "production_batch_losses_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_profiles" ADD CONSTRAINT "production_profiles_recipe_version_id_recipe_versions_id_fk" FOREIGN KEY ("recipe_version_id") REFERENCES "public"."recipe_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_profiles" ADD CONSTRAINT "production_profiles_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_profiles" ADD CONSTRAINT "production_profiles_packaging_product_id_products_id_fk" FOREIGN KEY ("packaging_product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_recipe_version_id_recipe_versions_id_fk" FOREIGN KEY ("recipe_version_id") REFERENCES "public"."recipe_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_operational_requirements" ADD CONSTRAINT "recipe_operational_requirements_recipe_version_id_recipe_versions_id_fk" FOREIGN KEY ("recipe_version_id") REFERENCES "public"."recipe_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_production_profile_id_production_profiles_id_fk" FOREIGN KEY ("production_profile_id") REFERENCES "public"."production_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_recipe_version_id_recipe_versions_id_fk" FOREIGN KEY ("recipe_version_id") REFERENCES "public"."recipe_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batch_outputs" ADD CONSTRAINT "production_batch_outputs_source_key_unique" UNIQUE("source_key");