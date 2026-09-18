CREATE TABLE "operational_audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_auth_user_id" varchar(191),
	"action" varchar(80) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" varchar(191) NOT NULL,
	"operation_reference" varchar(160),
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "operational_audit_events_actor_idx" ON "operational_audit_events" USING btree ("actor_auth_user_id");--> statement-breakpoint
CREATE INDEX "operational_audit_events_entity_idx" ON "operational_audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "operational_audit_events_occurred_at_idx" ON "operational_audit_events" USING btree ("occurred_at");