import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/whatsapp/waha')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { receiveWahaWebhook } =
          await import('#/features/whatsapp/waha-persistence.server')
        return receiveWahaWebhook(request)
      },
    },
  },
})
