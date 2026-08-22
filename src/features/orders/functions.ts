import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { getDb } from '#/db/index'
import { orderItems, orders } from '#/db/schema'
import { catalogProducts } from '#/features/catalog/catalog'

const productBySlug = new Map(catalogProducts.map((product) => [product.slug, product]))

const createOrderInput = z
  .object({
    customerName: z.string().trim().min(2).max(120),
    customerPhone: z.string().trim().min(8).max(32),
    fulfillment: z.enum(['pickup', 'delivery']),
    deliveryAddress: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(500).optional(),
    items: z
      .array(
        z.object({
          productSlug: z.enum(['tradicional', 'doce-de-leite', 'nozes']),
          quantity: z.number().int().min(1).max(12),
        }),
      )
      .min(1)
      .max(catalogProducts.length),
  })
  .superRefine((value, context) => {
    if (value.fulfillment === 'delivery' && !value.deliveryAddress) {
      context.addIssue({
        code: 'custom',
        path: ['deliveryAddress'],
        message: 'Informe o endereço para entrega.',
      })
    }
  })

export const createOrder = createServerFn({ method: 'POST' })
  .inputValidator(createOrderInput)
  .handler(async ({ data }) => {
    const items = data.items.map((item) => {
      const product = productBySlug.get(item.productSlug)

      if (!product) {
        throw new Error('Um item selecionado não está disponível.')
      }

      return {
        productSlug: product.slug,
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity: item.quantity,
        totalCents: product.priceCents * item.quantity,
      }
    })

    const subtotalCents = items.reduce((total, item) => total + item.totalCents, 0)
    const database = getDb()

    return database.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          fulfillment: data.fulfillment,
          deliveryAddress: data.deliveryAddress || null,
          notes: data.notes || null,
          subtotalCents,
          totalCents: subtotalCents,
        })
        .returning({ id: orders.id })

      if (!order) {
        throw new Error('Não foi possível registrar o pedido.')
      }

      await tx.insert(orderItems).values(
        items.map((item) => ({
          ...item,
          orderId: order.id,
        })),
      )

      return {
        orderNumber: `CAC-${String(order.id).padStart(4, '0')}`,
        totalCents: subtotalCents,
      }
    })
  })
