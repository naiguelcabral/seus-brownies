CREATE TYPE "public"."operational_cost_type" AS ENUM('energy', 'labor');--> statement-breakpoint
CREATE TYPE "public"."production_batch_status" AS ENUM('planned', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sales_location_classification" AS ENUM('unclassified', 'physical', 'online', 'event', 'partner');--> statement-breakpoint
CREATE TABLE "historical_import_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_key" varchar(160) NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"source_sheet" varchar(80) NOT NULL,
	"payload" jsonb NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "historical_import_records_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
CREATE TABLE "operational_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" varchar(80),
	"source_hash" varchar(64),
	"type" "operational_cost_type" NOT NULL,
	"production_batch_id" integer,
	"amount" numeric(12, 2) NOT NULL,
	"occurred_at" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operational_costs_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "product_import_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" varchar(80) NOT NULL,
	"source_name" varchar(180) NOT NULL,
	"normalized_source_name" varchar(180) NOT NULL,
	"product_id" integer NOT NULL,
	"source_unit" "measurement_unit" NOT NULL,
	"quantity_multiplier" numeric(14, 3) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_import_aliases_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "production_batch_outputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"production_batch_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"planned_quantity" numeric(14, 3),
	"actual_quantity" numeric(14, 3),
	"loss_quantity" numeric(14, 3),
	"unit_cost" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "production_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" varchar(80),
	"source_hash" varchar(64),
	"status" "production_batch_status" DEFAULT 'planned' NOT NULL,
	"planned_for" date,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_batches_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "sales_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" varchar(80),
	"source_hash" varchar(64),
	"name" varchar(120) NOT NULL,
	"classification" "sales_location_classification" DEFAULT 'unclassified' NOT NULL,
	"frequency" varchar(80),
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_locations_source_id_unique" UNIQUE("source_id"),
	CONSTRAINT "sales_locations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "purchases" ALTER COLUMN "supplier_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "source_id" varchar(80);--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "source_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN "source_id" varchar(80);--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN "source_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN "source_quantity_base" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN "source_quantity_purchased" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN "source_unit_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "source_id" varchar(80);--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "source_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "source_id" varchar(80);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "source_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "location_id" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "reported_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "calculated_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "audit_status" varchar(40);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "audit_notes" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "affects_stock" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "source_key" varchar(160);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "source_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "operational_costs" ADD CONSTRAINT "operational_costs_production_batch_id_production_batches_id_fk" FOREIGN KEY ("production_batch_id") REFERENCES "public"."production_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_import_aliases" ADD CONSTRAINT "product_import_aliases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batch_outputs" ADD CONSTRAINT "production_batch_outputs_production_batch_id_production_batches_id_fk" FOREIGN KEY ("production_batch_id") REFERENCES "public"."production_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batch_outputs" ADD CONSTRAINT "production_batch_outputs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_location_id_sales_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."sales_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_source_id_unique" UNIQUE("source_id");--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_source_id_unique" UNIQUE("source_id");--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_source_id_unique" UNIQUE("source_id");--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_source_id_unique" UNIQUE("source_id");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_source_key_unique" UNIQUE("source_key");
