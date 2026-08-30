export type CatalogProductIdentity = {
  productId: number
  sku: string
  name: string
  unit: 'g' | 'kg' | 'ml' | 'l' | 'm' | 'unit'
  type: 'ingredient' | 'packaging' | 'finished_product'
}

export type ConsumptionProduct = Omit<CatalogProductIdentity, 'productId'> & {
  id: number
  productId: number
}

export function recipeItemToConsumption(
  item: CatalogProductIdentity & { recipeItemId: number },
): ConsumptionProduct & { recipeItemId: number } {
  return { ...item, id: item.productId }
}

export function profileComponentToConsumption(
  component: CatalogProductIdentity,
): ConsumptionProduct {
  return { ...component, id: component.productId }
}

export function consumptionProductIds(
  consumptions: Array<{ id: number }>,
) {
  return [...new Set(consumptions.map((consumption) => consumption.id))]
}

export function movementsForProduct<T extends { productId: number }>(
  movements: T[],
  productId: number,
) {
  return movements.filter((movement) => movement.productId === productId)
}
