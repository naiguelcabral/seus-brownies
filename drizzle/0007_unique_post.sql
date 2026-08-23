CREATE TYPE "public"."production_profile_component_role" AS ENUM('filling');--> statement-breakpoint
CREATE TABLE "production_profile_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" varchar(100) NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"production_profile_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"role" "production_profile_component_role" NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"unit" "measurement_unit" NOT NULL,
	"quantity_basis" varchar(40) DEFAULT 'per_finished_unit' NOT NULL,
	"source_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_profile_components_source_id_unique" UNIQUE("source_id"),
	CONSTRAINT "production_profile_components_source_hash_unique" UNIQUE("source_hash"),
	CONSTRAINT "production_profile_components_profile_product_role_unique" UNIQUE("production_profile_id","product_id","role")
);
--> statement-breakpoint
ALTER TABLE "production_profile_components" ADD CONSTRAINT "production_profile_components_production_profile_id_production_profiles_id_fk" FOREIGN KEY ("production_profile_id") REFERENCES "public"."production_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_profile_components" ADD CONSTRAINT "production_profile_components_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;