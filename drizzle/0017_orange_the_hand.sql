ALTER TABLE "expenses" ADD COLUMN "idempotency_key" varchar(160);--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "idempotency_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "created_by_auth_user_id" varchar(191);--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "idempotency_key" varchar(160);--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "idempotency_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "created_by_auth_user_id" varchar(191);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "idempotency_key" varchar(160);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "idempotency_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "created_by_auth_user_id" varchar(191);--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_idempotency_key_unique" UNIQUE("idempotency_key");--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_idempotency_key_unique" UNIQUE("idempotency_key");--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_idempotency_key_unique" UNIQUE("idempotency_key");--> statement-breakpoint
CREATE OR REPLACE FUNCTION "prevent_used_product_structure_change"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW."product_type", NEW."unit") IS DISTINCT FROM (OLD."product_type", OLD."unit")
    AND (
      EXISTS (SELECT 1 FROM "stock_movements" WHERE "product_id" = OLD."id")
      OR EXISTS (SELECT 1 FROM "purchase_items" WHERE "product_id" = OLD."id")
      OR EXISTS (SELECT 1 FROM "sale_items" WHERE "product_id" = OLD."id")
      OR EXISTS (SELECT 1 FROM "product_import_aliases" WHERE "product_id" = OLD."id")
      OR EXISTS (SELECT 1 FROM "recipe_items" WHERE "product_id" = OLD."id")
      OR EXISTS (
        SELECT 1 FROM "production_profiles"
        WHERE "product_id" = OLD."id" OR "packaging_product_id" = OLD."id"
      )
      OR EXISTS (
        SELECT 1 FROM "production_profile_components" WHERE "product_id" = OLD."id"
      )
      OR EXISTS (SELECT 1 FROM "production_batch_outputs" WHERE "product_id" = OLD."id")
    )
  THEN
    RAISE EXCEPTION 'used product structure cannot change'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "products_preserve_used_structure"
BEFORE UPDATE OF "product_type", "unit" ON "products"
FOR EACH ROW
EXECUTE FUNCTION "prevent_used_product_structure_change"();
