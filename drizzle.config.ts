import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// `generate` compara somente o schema; não carregue credenciais locais nessa etapa.
const isGenerating = process.argv.includes('generate')
if (!isGenerating) {
  config({ path: ['.env.local', '.env'] })
}

const databaseUrl = process.env.DATABASE_URL

if (!isGenerating && !databaseUrl) {
  throw new Error(
    'Defina DATABASE_URL em .env.local antes de executar migrations.',
  )
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      databaseUrl ??
      'postgresql://placeholder:placeholder@localhost:5432/cacau',
  },
})
