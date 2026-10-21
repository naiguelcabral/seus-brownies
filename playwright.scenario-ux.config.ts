import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'scenario-ux.spec.ts',
  workers: 1,
  timeout: 30000,
  reporter: 'line',
  outputDir: '/tmp/cacau-scenario-ux-results',
  use: { headless: true, trace: 'off', screenshot: 'off', video: 'off' },
})
