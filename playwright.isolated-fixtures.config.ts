import { defineConfig } from '@playwright/test'

if (process.env.CACAU_FIXTURE_E2E_ISOLATED !== '1') {
  throw new Error('Use npm run test:e2e:isolated.')
}

// Explicit allowlist: legacy shared-environment specs must never join this job.
export default defineConfig({
  testDir: './e2e',
  testMatch: [
    'product-editor.spec.ts',
    'catalog-editors.spec.ts',
    'dashboard-overview.spec.ts',
    'integrity-report.spec.ts',
    'operations-ux.spec.ts',
    'payment-fees.spec.ts',
    'operation-finance.spec.ts',
    'scenario-ux.spec.ts',
  ],
  workers: 1,
  timeout: 30_000,
  reporter: 'line',
  outputDir: '/tmp/cacau-isolated-fixtures-results',
  use: {
    headless: true,
    serviceWorkers: 'block',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: process.env.CACAU_SMOKE_BROWSER_PATH
      ? { executablePath: process.env.CACAU_SMOKE_BROWSER_PATH }
      : {},
  },
})
