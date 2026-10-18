import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'dashboard-overview.spec.ts',
  workers: 1,
  timeout: 30000,
  reporter: 'line',
  outputDir: '/tmp/cacau-dashboard-results',
  use: { headless: true, trace: 'off', screenshot: 'off', video: 'off' },
})
