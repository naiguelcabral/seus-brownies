CREATE TYPE "public"."financial_event_type" AS ENUM('sale_revenue', 'cash_receipt', 'cash_refund', 'store_credit_issued', 'store_credit_redeemed', 'revenue_correction', 'cash_correction');--> statement-breakpoint
CREATE TYPE "public"."financial_period_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "financial_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"idempotency_key" varchar(160) NOT NULL,
	"idempotency_hash" varchar(64) NOT NULL,
	"type" "financial_event_type" NOT NULL,
	"sale_id" integer,
	"sale_item_id" integer,
	"corrects_event_id" integer,
	"amount" numeric(12, 2) NOT NULL,
	"competence_date" date NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text NOT NULL,
	"created_by_auth_user_id" varchar(191) NOT NULL,
	"authorized_by_auth_user_id" varchar(191),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "financial_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_month" date NOT NULL,
	"status" "financial_period_status" DEFAULT 'open' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"closure_snapshot" jsonb,
	"closure_notes" text,
	"closed_by_auth_user_id" varchar(191),
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_periods_period_month_unique" UNIQUE("period_month")
);
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_sale_item_id_sale_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_correction_fk" FOREIGN KEY ("corrects_event_id") REFERENCES "public"."financial_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_events_competence_idx" ON "financial_events" USING btree ("competence_date","type");--> statement-breakpoint
CREATE INDEX "financial_events_occurred_idx" ON "financial_events" USING btree ("occurred_at","type");--> statement-breakpoint
CREATE INDEX "financial_events_sale_idx" ON "financial_events" USING btree ("sale_id");--> statement-breakpoint
ALTER TABLE "financial_periods" ADD CONSTRAINT "financial_periods_month_start_check" CHECK (period_month = date_trunc('month', period_month::timestamp)::date);--> statement-breakpoint
ALTER TABLE "financial_periods" ADD CONSTRAINT "financial_periods_closure_check" CHECK ((status = 'open' AND closed_at IS NULL AND closed_by_auth_user_id IS NULL AND closure_snapshot IS NULL) OR (status = 'closed' AND closed_at IS NOT NULL AND closed_by_auth_user_id IS NOT NULL AND closure_snapshot IS NOT NULL));--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_amount_check" CHECK ((type IN ('revenue_correction', 'cash_correction') AND amount <> 0) OR (type NOT IN ('revenue_correction', 'cash_correction') AND amount > 0));--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_correction_check" CHECK ((type IN ('revenue_correction', 'cash_correction')) = (corrects_event_id IS NOT NULL));--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_authorization_check" CHECK ((type NOT IN ('cash_refund', 'store_credit_issued')) OR authorized_by_auth_user_id IS NOT NULL);--> statement-breakpoint
CREATE FUNCTION prevent_financial_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'financial_events are immutable';
END;
$$;--> statement-breakpoint
CREATE TRIGGER financial_events_immutable BEFORE UPDATE OR DELETE ON "financial_events" FOR EACH ROW EXECUTE FUNCTION prevent_financial_event_mutation();
