import { defineConfig } from 'drizzle-kit'
// Offline metadata generation only. Never loads environment files or credentials.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle/pending-profile-materials',
})
