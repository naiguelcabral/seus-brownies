ALTER TABLE "expenses" ADD COLUMN "classification" varchar(24);--> statement-breakpoint
ALTER TABLE "financial_events" ADD COLUMN "payment_fee" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "payment_details" jsonb;