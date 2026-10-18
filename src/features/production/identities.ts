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
  component: CatalogProductIdentity & {
    role: 'filling' | 'coating' | 'packaging'
    quantityBasis: string
  },
): ConsumptionProduct {
  if (component.quantityBasis !== 'per_finished_unit')
    throw new Error('A quantidade do componente deve ser por unidade pronta.')
  const valid =
    component.role === 'packaging'
      ? component.type === 'packaging'
      : component.type === 'ingredient'
  if (!valid)
    throw new Error(`Componente de perfil inválido: ${component.name}.`)
  return { ...component, id: component.productId }
}

export function consumptionProductIds(consumptions: Array<{ id: number }>) {
  return [...new Set(consumptions.map((consumption) => consumption.id))]
}

export function movementsForProduct<T extends { productId: number }>(
  movements: T[],
  productId: number,
) {
  return movements.filter((movement) => movement.productId === productId)
}
