/**
 * Converts a unit price expressed in cents and a quantity expressed in
 * thousandths into a rounded total expressed in cents.
 */
export function calculatePriceCentsTotal(
  priceCents: bigint,
  quantityThousandths: bigint,
) {
  return (priceCents * quantityThousandths + 500n) / 1_000n
}

/**
 * Converts a unit cost expressed in thousandths of a real and a quantity
 * expressed in thousandths into a rounded total expressed in cents.
 */
export function calculateUnitCostMillisTotal(
  unitCostMillis: bigint,
  quantityThousandths: bigint,
) {
  return (unitCostMillis * quantityThousandths + 5_000n) / 10_000n
}
