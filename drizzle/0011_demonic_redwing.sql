ALTER TABLE "production_batch_outputs" ADD COLUMN "allocated_cost" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "allocated_cost" numeric(12, 2);--> statement-breakpoint
-- Allocate completed batch totals in cents. Largest fractional remainders receive
-- residual cents; equal remainders are resolved by the lowest product_id, then id.
WITH eligible_outputs AS (
  SELECT
    output.id,
    output.production_batch_id,
    output.product_id,
    round(batch.total_cost * 100)::bigint AS total_cents,
    round(output.actual_quantity * 1000)::bigint AS quantity_millis,
    sum(round(output.actual_quantity * 1000)::bigint) OVER (
      PARTITION BY output.production_batch_id
    ) AS total_quantity_millis
  FROM "production_batch_outputs" AS output
  INNER JOIN "production_batches" AS batch ON batch.id = output.production_batch_id
  WHERE batch.status = 'completed'
    AND batch.total_cost IS NOT NULL
    AND output.actual_quantity IS NOT NULL
    AND output.actual_quantity > 0
), shares AS (
  SELECT
    *,
    (total_cents * quantity_millis) / total_quantity_millis AS base_cents,
    mod(total_cents * quantity_millis, total_quantity_millis) AS remainder
  FROM eligible_outputs
), ranked_shares AS (
  SELECT
    *,
    row_number() OVER (
      PARTITION BY production_batch_id
      ORDER BY remainder DESC, product_id ASC, id ASC
    ) AS remainder_rank,
    sum(base_cents) OVER (PARTITION BY production_batch_id) AS base_total_cents
  FROM shares
), allocations AS (
  SELECT
    id,
    (base_cents + CASE
      WHEN remainder_rank <= total_cents - base_total_cents THEN 1
      ELSE 0
    END)::numeric / 100 AS allocated_cost
  FROM ranked_shares
)
UPDATE "production_batch_outputs" AS output
SET "allocated_cost" = allocations.allocated_cost
FROM allocations
WHERE output.id = allocations.id
  AND output.allocated_cost IS NULL;--> statement-breakpoint
-- Mirror the output allocation to its stock entry. Re-running the migration leaves
-- populated rows untouched, making this backfill idempotent.
UPDATE "stock_movements" AS movement
SET "allocated_cost" = output.allocated_cost
FROM "production_batch_outputs" AS output
WHERE movement.reference_type = 'production_output'
  AND movement.reference_id = output.production_batch_id
  AND movement.product_id = output.product_id
  AND output.allocated_cost IS NOT NULL
  AND movement.allocated_cost IS NULL;

-- Manual rollback before any dependent migration:
-- ALTER TABLE "stock_movements" DROP COLUMN "allocated_cost";
-- ALTER TABLE "production_batch_outputs" DROP COLUMN "allocated_cost";
