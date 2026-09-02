-- FIFO phase 2: immutable lifecycle events. This migration is schema-only;
-- it intentionally contains no development IDs and no backfill.
CREATE TYPE "inventory_cost_layer_origin" AS ENUM ('production', 'purchase', 'adjustment');
--> statement-breakpoint
CREATE TYPE "inventory_cost_allocation_event_type" AS ENUM ('sale', 'loss', 'adjustment_negative');
--> statement-breakpoint
ALTER TABLE "inventory_cost_layers" ALTER COLUMN "production_batch_output_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory_cost_layers" ADD COLUMN "origin" "inventory_cost_layer_origin" DEFAULT 'production' NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory_cost_allocations" ADD COLUMN "event_type" "inventory_cost_allocation_event_type" DEFAULT 'sale' NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory_cost_allocations" ADD COLUMN "event_reference_type" varchar(40);
--> statement-breakpoint
ALTER TABLE "inventory_cost_allocations" ADD COLUMN "event_reference_id" integer;
--> statement-breakpoint
CREATE TABLE "inventory_cost_reversals" (
  "id" serial PRIMARY KEY NOT NULL,
  "original_allocation_id" integer NOT NULL,
  "incoming_stock_movement_id" integer NOT NULL,
  "event_type" varchar(24) NOT NULL,
  "reference_type" varchar(40) NOT NULL,
  "reference_id" integer NOT NULL,
  "quantity" numeric(14, 3) NOT NULL,
  "restored_cost" numeric(12, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_cost_reversals_original_movement_unique" UNIQUE("original_allocation_id", "incoming_stock_movement_id"),
  CONSTRAINT "inventory_cost_reversals_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "inventory_cost_reversals_cost_check" CHECK ("restored_cost" >= 0)
);
--> statement-breakpoint
ALTER TABLE "inventory_cost_reversals" ADD CONSTRAINT "inventory_cost_reversals_original_allocation_fk" FOREIGN KEY ("original_allocation_id") REFERENCES "public"."inventory_cost_allocations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_cost_reversals" ADD CONSTRAINT "inventory_cost_reversals_incoming_movement_fk" FOREIGN KEY ("incoming_stock_movement_id") REFERENCES "public"."stock_movements"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "inventory_cost_allocations_event_reference_idx" ON "inventory_cost_allocations" USING btree ("event_reference_type", "event_reference_id");
--> statement-breakpoint
CREATE INDEX "inventory_cost_reversals_reference_idx" ON "inventory_cost_reversals" USING btree ("reference_type", "reference_id");
--> statement-breakpoint
-- Rollback is operational, not destructive: stop lifecycle writers and deploy
-- the previous application. Do not delete immutable allocations/reversals.
