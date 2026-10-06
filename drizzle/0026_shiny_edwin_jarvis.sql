ALTER TABLE "financial_events" ADD COLUMN "settles_event_id" integer;--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_settlement_fk" FOREIGN KEY ("settles_event_id") REFERENCES "public"."financial_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_events_settlement_idx" ON "financial_events" USING btree ("settles_event_id");--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_settlement_check" CHECK ((type = 'store_credit_redeemed') = (settles_event_id IS NOT NULL));--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_redemption_effect_check" CHECK (type <> 'store_credit_redeemed' OR (revenue_effect = 0 AND cash_effect = 0 AND authorized_by_auth_user_id IS NOT NULL));
