import { defineConfig } from '@playwright/test'

if (process.env.CACAU_CONNECTED_QA !== 'local-postgres17') {
  throw new Error('Use the explicit connected QA runner.')
}
export default defineConfig({
  testDir: '.',
  testMatch: 'connected.spec.mjs',
  workers: 1,
  timeout: 120_000,
  reporter: 'line',
  outputDir: '/tmp/cacau-connected-results',
  use: {
    actionTimeout: 15_000,
    baseURL: 'http://127.0.0.1:4178',
    serviceWorkers: 'block',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: process.env.CACAU_SMOKE_BROWSER_PATH
      ? { executablePath: process.env.CACAU_SMOKE_BROWSER_PATH }
      : {},
  },
  webServer: {
    cwd: process.cwd(),
    env: { SQL_CONNECTION_PROBE_ENABLED: 'true' },
    command:
      'node node_modules/vite/bin/vite.js --config e2e/connected/vite.config.ts',
    url: 'http://127.0.0.1:4178/login',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
