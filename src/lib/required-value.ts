/** Fail before using a missing query result or violating a collection invariant. */
export function requireDefined<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Resultado obrigatório ausente.')
  return value
}

export function requireFirst<T>(values: readonly T[]): T {
  return requireDefined(values[0])
}
