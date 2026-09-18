export function isMissingOptionalSchemaError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === '42P01' || error.code === '42703')
  )
}
