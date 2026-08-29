ALTER TABLE "production_batch_consumptions" ALTER COLUMN "unit_cost" SET DATA TYPE numeric(12, 3);--> statement-breakpoint
ALTER TABLE "production_batch_outputs" ALTER COLUMN "unit_cost" SET DATA TYPE numeric(12, 3);--> statement-breakpoint
ALTER TABLE "production_batches" ALTER COLUMN "unit_cost" SET DATA TYPE numeric(12, 3);--> statement-breakpoint
ALTER TABLE "purchase_items" ALTER COLUMN "unit_cost" SET DATA TYPE numeric(12, 3);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "unit_cost" SET DATA TYPE numeric(12, 3);