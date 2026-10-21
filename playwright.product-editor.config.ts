import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'product-editor.spec.ts',
  workers: 1,
  timeout: 30_000,
  reporter: 'line',
  outputDir: '/tmp/cacau-product-editor-results',
  use: { headless: true, trace: 'off', screenshot: 'off', video: 'off' },
})
