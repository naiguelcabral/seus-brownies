import { expect, test as base } from '@playwright/test'

export const test = base.extend<{ loopbackOnly: void }>({
  loopbackOnly: [
    async ({ context }, use) => {
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url())
        return url.protocol === 'http:' && url.hostname === '127.0.0.1'
          ? route.continue()
          : route.abort('blockedbyclient')
      })
      await context.routeWebSocket('**/*', (socket) => socket.close())
      await use()
    },
    { auto: true },
  ],
})
export { expect }
