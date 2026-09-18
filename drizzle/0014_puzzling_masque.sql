-- G1: Cacau-owned access, durable login-abuse state and authentication audit.
-- Migrations 0012/0013 were authored manually and have no Drizzle snapshots;
-- do not repeat their FIFO DDL here. This migration is intentionally schema-only
-- and must be reviewed before application to any environment with data.
CREATE TYPE "public"."app_access_role" AS ENUM('admin', 'manager', 'production', 'sales', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."auth_audit_outcome" AS ENUM('success', 'failure', 'blocked');--> statement-breakpoint
CREATE TABLE "app_user_access" (
  "id" serial PRIMARY KEY NOT NULL,
  "auth_user_id" varchar(191) NOT NULL,
  "role" "app_access_role" NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "role_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_user_access_auth_user_id_unique" UNIQUE("auth_user_id")
);--> statement-breakpoint
CREATE TABLE "auth_audit_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_auth_user_id" varchar(191),
  "action" varchar(80) NOT NULL,
  "outcome" "auth_audit_outcome" NOT NULL,
  "target_type" varchar(80),
  "target_id" varchar(191),
  "request_id" varchar(191),
  "network_hash" varchar(128),
  "metadata" jsonb,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "auth_login_attempts" (
  "id" serial PRIMARY KEY NOT NULL,
  "identity_hash" varchar(128) NOT NULL,
  "consecutive_failures" integer DEFAULT 0 NOT NULL,
  "cooldown_until" timestamp with time zone,
  "last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "auth_login_attempts_identity_hash_unique" UNIQUE("identity_hash")
);--> statement-breakpoint
CREATE INDEX "app_user_access_role_idx" ON "app_user_access" USING btree ("role");--> statement-breakpoint
CREATE INDEX "auth_audit_events_actor_idx" ON "auth_audit_events" USING btree ("actor_auth_user_id");--> statement-breakpoint
CREATE INDEX "auth_audit_events_occurred_at_idx" ON "auth_audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "auth_login_attempts_cooldown_idx" ON "auth_login_attempts" USING btree ("cooldown_until");
