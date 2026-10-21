import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['payment-fees.spec.ts','operation-finance.spec.ts'],
  workers: 1,
  timeout: 30000,
  reporter: 'line',
  outputDir: '/tmp/cacau-payment-fees-results',
  use: { headless: true, trace: 'off', screenshot: 'off', video: 'off' },
})
