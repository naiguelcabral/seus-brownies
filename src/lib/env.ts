import { z } from 'zod'

const databaseUrl = z
  .string()
  .trim()
  .min(1)
  .url()
  .refine(
    (value) => {
      const protocol = new URL(value).protocol
      return protocol === 'postgres:' || protocol === 'postgresql:'
    },
    { message: 'DATABASE_URL deve usar PostgreSQL.' },
  )

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: databaseUrl,
})

export type DatabaseEnvironment = z.infer<typeof databaseEnvironmentSchema>

/**
 * Validates values supplied by the server runtime. It deliberately never loads
 * dotenv files, logs values, or returns Zod's value-bearing diagnostics.
 */
export function requireDatabaseEnvironment(
  environment: Record<string, string | undefined>,
): DatabaseEnvironment {
  const result = databaseEnvironmentSchema.safeParse(environment)
  if (result.success) return result.data

  const fields = result.error.issues
    .map((issue) => issue.path.join('.'))
    .filter(Boolean)
  const names = [...new Set(fields)].join(', ') || 'DATABASE_URL'
  throw new Error(`Configuração de ambiente inválida: ${names}.`)
}
