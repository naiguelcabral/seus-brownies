import { defineConfig } from '@playwright/test'

export const hmlAuthE2eBaseUrl =
  'https://cacau-v1-hml.naiguelcabral.workers.dev'

if (process.env.CACAU_HML_AUTH_E2E !== 'authorized') {
  throw new Error(
    'Execução HML recusada: defina CACAU_HML_AUTH_E2E=authorized após o gate humano.',
  )
}

export default defineConfig({
  testDir: './e2e',
  testMatch: 'auth-hml-non-destructive.spec.ts',
  timeout: 90_000,
  workers: 1,
  fullyParallel: false,
  reporter: 'line',
  outputDir: '/tmp/seus-brownies-auth-hml-e2e',
  use: {
    baseURL: hmlAuthE2eBaseUrl,
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
})
