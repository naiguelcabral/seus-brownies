ALTER TABLE "inventory_cost_allocations" ADD COLUMN "exact_cost" jsonb;--> statement-breakpoint
ALTER TABLE "inventory_cost_layers" ADD COLUMN "exact_original_cost" jsonb;--> statement-breakpoint
ALTER TABLE "inventory_cost_layers" ADD COLUMN "exact_remaining_cost" jsonb;--> statement-breakpoint
ALTER TABLE "inventory_cost_reversals" ADD COLUMN "exact_cost" jsonb;--> statement-breakpoint
ALTER TABLE "production_batch_consumptions" ADD COLUMN "exact_cost" jsonb;--> statement-breakpoint
ALTER TABLE "production_batch_outputs" ADD COLUMN "exact_cost" jsonb;--> statement-breakpoint
ALTER TABLE "production_batches" ADD COLUMN "exact_cost" jsonb;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "exact_cost" jsonb;