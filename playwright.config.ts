import { defineConfig } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000)
const baseURL = `http://127.0.0.1:${port}`
const artifactRoot = '/tmp/seus-brownies-playwright'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  workers: 1,
  reporter: [
    ['line'],
    ['html', { outputFolder: `${artifactRoot}/report`, open: 'never' }],
  ],
  outputDir: `${artifactRoot}/results`,
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
