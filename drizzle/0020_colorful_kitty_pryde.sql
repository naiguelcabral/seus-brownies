CREATE TYPE "public"."action_plan_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."action_plan_status" AS ENUM('open', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "action_plan_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_plan_id" integer NOT NULL,
	"version" integer NOT NULL,
	"event" varchar(40) NOT NULL,
	"actor_auth_user_id" varchar(191) NOT NULL,
	"snapshot" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_plan_history_plan_version_unique" UNIQUE("action_plan_id","version")
);
--> statement-breakpoint
CREATE TABLE "action_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"alert" text NOT NULL,
	"probable_cause" text,
	"action" text NOT NULL,
	"priority" "action_plan_priority" DEFAULT 'medium' NOT NULL,
	"kpi" varchar(160),
	"responsible" varchar(160),
	"due_date" date,
	"status" "action_plan_status" DEFAULT 'open' NOT NULL,
	"created_by_auth_user_id" varchar(191) NOT NULL,
	"updated_by_auth_user_id" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_plan_history" ADD CONSTRAINT "action_plan_history_action_plan_id_action_plans_id_fk" FOREIGN KEY ("action_plan_id") REFERENCES "public"."action_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_plan_history_actor_idx" ON "action_plan_history" USING btree ("actor_auth_user_id");--> statement-breakpoint
CREATE INDEX "action_plans_status_due_date_idx" ON "action_plans" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "action_plans_priority_idx" ON "action_plans" USING btree ("priority");