CREATE TYPE "public"."production_batch_output_role" AS ENUM('primary', 'co_product');--> statement-breakpoint
ALTER TYPE "public"."production_batch_status" ADD VALUE 'draft' BEFORE 'planned';--> statement-breakpoint
ALTER TABLE "operational_costs" ADD COLUMN "quantity" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "operational_costs" ADD COLUMN "unit" varchar(24);--> statement-breakpoint
ALTER TABLE "operational_costs" ADD COLUMN "unit_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "production_batch_outputs" ADD COLUMN "role" "production_batch_output_role" DEFAULT 'primary' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_batch_outputs" ADD COLUMN "unit" "measurement_unit";--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "recipe_multiplier" numeric(14, 3) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "completion_payload" jsonb;--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "total_cost" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "unit_cost" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "production_batch_outputs" ADD CONSTRAINT "production_batch_outputs_source_hash_unique" UNIQUE("source_hash");--> statement-breakpoint
ALTER TABLE "production_batch_outputs" ADD CONSTRAINT "production_batch_outputs_batch_product_unique" UNIQUE("production_batch_id","product_id");