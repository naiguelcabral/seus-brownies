import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

if (process.env.CACAU_CONNECTED_QA !== 'local-postgres17') {
  throw new Error('Use the explicit connected QA runner.')
}

export default defineConfig({
  envDir: false,
  resolve: {
    tsconfigPaths: true,
    alias: [
      {
        find: 'cloudflare:workers',
        replacement: resolve('e2e/connected/cloudflare.server.ts'),
      },
      {
        find: /^(?:\.\/|.*\/)principal-resolver\.server(?:\.ts)?$/,
        replacement: resolve('e2e/connected/identity.server.ts'),
      },
      {
        find: '#/db/index',
        replacement: resolve('e2e/connected/database.server.ts'),
      },
    ],
  },
  server: { host: '127.0.0.1', port: 4178, strictPort: true },
  plugins: [tailwindcss(), tanstackStart(), react()],
})
