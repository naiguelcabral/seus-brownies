ALTER TABLE "products" ADD COLUMN "reorder_point" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN "supplier_lot" varchar(80);--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN "expires_on" date;