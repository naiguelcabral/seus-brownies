type ProductStructure = {
  type: 'ingredient' | 'packaging' | 'finished_product'
  unit: 'g' | 'kg' | 'ml' | 'l' | 'm' | 'unit'
}

export function assertProductStructureChangeAllowed(
  current: ProductStructure,
  next: ProductStructure,
  hasOperationalUse: boolean,
) {
  const changed = current.type !== next.type || current.unit !== next.unit
  if (changed && hasOperationalUse) {
    throw new Error(
      'Tipo e unidade não podem ser alterados após o produto ser utilizado.',
    )
  }
}
