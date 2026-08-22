import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const productCategory = pgEnum('product_category', [
  'classic',
  'special',
  'gift',
])

export const fulfillmentMethod = pgEnum('fulfillment_method', [
  'pickup',
  'delivery',
])

export const orderStatus = pgEnum('order_status', [
  'awaiting_confirmation',
  'awaiting_payment',
  'confirmed',
  'in_production',
  'ready',
  'delivered',
  'cancelled',
])

/** Products available to be shown in the Cacau catalog. */
export const products = pgTable('products', {
  id: serial().primaryKey(),
  slug: varchar({ length: 80 }).notNull().unique(),
  name: varchar({ length: 120 }).notNull(),
  description: text().notNull(),
  category: productCategory().notNull().default('classic'),
  priceCents: integer('price_cents').notNull(),
  imageUrl: text('image_url'),
  isAvailable: boolean('is_available').notNull().default(true),
  isFeatured: boolean('is_featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** A customer order. Prices are stored in cents to avoid floating-point errors. */
export const orders = pgTable('orders', {
  id: serial().primaryKey(),
  customerName: varchar('customer_name', { length: 120 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 32 }).notNull(),
  fulfillment: fulfillmentMethod().notNull(),
  deliveryAddress: text('delivery_address'),
  notes: text(),
  subtotalCents: integer('subtotal_cents').notNull(),
  deliveryFeeCents: integer('delivery_fee_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull(),
  status: orderStatus().notNull().default('awaiting_confirmation'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Immutable snapshots keep an order accurate after a catalog price changes. */
export const orderItems = pgTable('order_items', {
  id: serial().primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productSlug: varchar('product_slug', { length: 80 }).notNull(),
  productName: varchar('product_name', { length: 120 }).notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  quantity: integer().notNull(),
  totalCents: integer('total_cents').notNull(),
})
