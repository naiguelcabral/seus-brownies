import { defineConfig } from '@playwright/test'

if (process.env.CACAU_PUBLIC_SMOKE_ISOLATED !== '1') {
  throw new Error('Use bash scripts/test-public-smoke-isolated.sh.')
}
const baseURL = 'http://127.0.0.1:3459'
export default defineConfig({
  testDir: './e2e',
  testMatch: 'auth-public-routes.spec.ts',
  workers: 1,
  timeout: 45_000,
  reporter: 'line',
  outputDir: './public-smoke-results',
  use: {
    baseURL,
    headless: true,
    serviceWorkers: 'block',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: process.env.CACAU_SMOKE_BROWSER_PATH
      ? { executablePath: process.env.CACAU_SMOKE_BROWSER_PATH }
      : {},
  },
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3459 --strictPort',
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
