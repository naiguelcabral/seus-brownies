-- First FIFO delivery: production outputs become cost layers. Purchases of
-- finished goods and non-sale outflows are intentionally outside this migration.
CREATE TABLE "inventory_cost_layers" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_id" integer NOT NULL,
  "production_batch_output_id" integer NOT NULL,
  "source_stock_movement_id" integer NOT NULL,
  "available_at" timestamp with time zone NOT NULL,
  "original_quantity" numeric(14, 3) NOT NULL,
  "original_cost" numeric(12, 2) NOT NULL,
  "remaining_quantity" numeric(14, 3) NOT NULL,
  "remaining_cost" numeric(12, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_cost_layers_output_unique" UNIQUE("production_batch_output_id"),
  CONSTRAINT "inventory_cost_layers_movement_unique" UNIQUE("source_stock_movement_id"),
  CONSTRAINT "inventory_cost_layers_quantity_check" CHECK (
    "original_quantity" > 0 AND "remaining_quantity" >= 0
    AND "remaining_quantity" <= "original_quantity"
  ),
  CONSTRAINT "inventory_cost_layers_cost_check" CHECK (
    "original_cost" >= 0 AND "remaining_cost" >= 0
    AND "remaining_cost" <= "original_cost"
  )
);
--> statement-breakpoint
CREATE TABLE "inventory_cost_allocations" (
  "id" serial PRIMARY KEY NOT NULL,
  "inventory_cost_layer_id" integer NOT NULL,
  "outgoing_stock_movement_id" integer NOT NULL,
  "sale_item_id" integer,
  "product_id" integer NOT NULL,
  "quantity" numeric(14, 3) NOT NULL,
  "allocated_cost" numeric(12, 2) NOT NULL,
  "unit_cost" numeric(12, 3),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_cost_allocations_layer_movement_unique" UNIQUE("inventory_cost_layer_id", "outgoing_stock_movement_id"),
  CONSTRAINT "inventory_cost_allocations_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "inventory_cost_allocations_cost_check" CHECK ("allocated_cost" >= 0)
);
--> statement-breakpoint
ALTER TABLE "inventory_cost_layers" ADD CONSTRAINT "inventory_cost_layers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_cost_layers" ADD CONSTRAINT "inventory_cost_layers_output_id_outputs_id_fk" FOREIGN KEY ("production_batch_output_id") REFERENCES "public"."production_batch_outputs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_cost_layers" ADD CONSTRAINT "inventory_cost_layers_movement_id_movements_id_fk" FOREIGN KEY ("source_stock_movement_id") REFERENCES "public"."stock_movements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_cost_allocations" ADD CONSTRAINT "inventory_cost_allocations_layer_id_layers_id_fk" FOREIGN KEY ("inventory_cost_layer_id") REFERENCES "public"."inventory_cost_layers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_cost_allocations" ADD CONSTRAINT "inventory_cost_allocations_outgoing_movement_id_movements_id_fk" FOREIGN KEY ("outgoing_stock_movement_id") REFERENCES "public"."stock_movements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_cost_allocations" ADD CONSTRAINT "inventory_cost_allocations_sale_item_id_sale_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_cost_allocations" ADD CONSTRAINT "inventory_cost_allocations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_cost_layers_fifo_idx" ON "inventory_cost_layers" USING btree ("product_id", "available_at", "id");--> statement-breakpoint
CREATE INDEX "inventory_cost_allocations_sale_item_idx" ON "inventory_cost_allocations" USING btree ("sale_item_id");--> statement-breakpoint
CREATE INDEX "inventory_cost_allocations_outgoing_movement_idx" ON "inventory_cost_allocations" USING btree ("outgoing_stock_movement_id");--> statement-breakpoint

-- Idempotently materialize layers for every valued, completed production output.
INSERT INTO "inventory_cost_layers" (
  "product_id", "production_batch_output_id", "source_stock_movement_id",
  "available_at", "original_quantity", "original_cost",
  "remaining_quantity", "remaining_cost"
)
SELECT
  output."product_id", output."id", movement."id",
  COALESCE(batch."completed_at", movement."occurred_at"),
  output."actual_quantity", output."allocated_cost",
  output."actual_quantity", output."allocated_cost"
FROM "production_batch_outputs" AS output
INNER JOIN "production_batches" AS batch ON batch."id" = output."production_batch_id"
INNER JOIN "stock_movements" AS movement
  ON movement."reference_type" = 'production_output'
  AND movement."reference_id" = output."production_batch_id"
  AND movement."product_id" = output."product_id"
WHERE batch."status" = 'completed'
  AND output."actual_quantity" > 0
  AND output."allocated_cost" IS NOT NULL
  AND movement."quantity_delta" > 0
ON CONFLICT ("source_stock_movement_id") DO NOTHING;

-- Practical rollback: first stop new confirmed/paid sales and deploy code that
-- ignores FIFO tables. Preserve these accounting facts; drop tables only after
-- an explicit export and approval, never as an automatic rollback.
