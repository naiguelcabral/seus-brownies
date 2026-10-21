import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'catalog-editors.spec.ts',
  workers: 1,
  timeout: 30_000,
  reporter: 'line',
  outputDir: '/tmp/cacau-catalog-editors-results',
  use: { headless: true, trace: 'off', screenshot: 'off', video: 'off' },
})
