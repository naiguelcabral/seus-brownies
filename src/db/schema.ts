import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

const money = (name: string) => numeric(name, { precision: 12, scale: 2 })
const quantity = (name: string) => numeric(name, { precision: 14, scale: 3 })

export const productType = pgEnum('product_type', [
  'ingredient',
  'packaging',
  'finished_product',
])

export const measurementUnit = pgEnum('measurement_unit', [
  'g',
  'kg',
  'ml',
  'l',
  'unit',
])

export const stockMovementType = pgEnum('stock_movement_type', [
  'purchase',
  'production',
  'sale',
  'adjustment',
  'loss',
  'return',
])
export const saleStatus = pgEnum('sale_status', [
  'draft',
  'confirmed',
  'paid',
  'cancelled',
])
export const messageProcessingStatus = pgEnum('message_processing_status', [
  'received',
  'processing',
  'processed',
  'failed',
  'ignored',
])

/** Groups sellable products for reporting and menu organization. */
export const categories = pgTable('categories', {
  id: serial().primaryKey(),
  name: varchar({ length: 80 }).notNull().unique(),
  description: text(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Product balances are calculated from stockMovements, never stored here. */
export const products = pgTable('products', {
  id: serial().primaryKey(),
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  sku: varchar({ length: 64 }).notNull().unique(),
  name: varchar({ length: 120 }).notNull(),
  description: text(),
  type: productType('product_type').notNull(),
  unit: measurementUnit('measurement_unit').notNull(),
  // Ingredientes e embalagens não são vendidos diretamente.
  salePrice: money('sale_price'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** A signed quantityDelta forms the inventory ledger: positive enters, negative leaves. */
export const stockMovements = pgTable('stock_movements', {
  id: serial().primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  type: stockMovementType().notNull(),
  quantityDelta: quantity('quantity_delta').notNull(),
  unitCost: money('unit_cost'),
  referenceType: varchar('reference_type', { length: 40 }),
  referenceId: integer('reference_id'),
  notes: text(),
  occurredAt: timestamp('occurred_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const purchases = pgTable('purchases', {
  id: serial().primaryKey(),
  supplierName: varchar('supplier_name', { length: 160 }).notNull(),
  purchasedAt: date('purchased_at').notNull(),
  totalAmount: money('total_amount').notNull(),
  invoiceFileReference: varchar('invoice_file_reference', { length: 500 }),
  notes: text(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const purchaseItems = pgTable('purchase_items', {
  id: serial().primaryKey(),
  purchaseId: integer('purchase_id')
    .notNull()
    .references(() => purchases.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id, {
    onDelete: 'set null',
  }),
  itemName: varchar('item_name', { length: 160 }).notNull(),
  quantity: quantity('quantity').notNull(),
  unitCost: money('unit_cost').notNull(),
  totalAmount: money('total_amount').notNull(),
})

export const sales = pgTable('sales', {
  id: serial().primaryKey(),
  customerName: varchar('customer_name', { length: 120 }),
  customerPhone: varchar('customer_phone', { length: 32 }),
  status: saleStatus().notNull().default('draft'),
  subtotalAmount: money('subtotal_amount').notNull(),
  discountAmount: money('discount_amount').notNull().default('0'),
  deliveryFeeAmount: money('delivery_fee_amount').notNull().default('0'),
  totalAmount: money('total_amount').notNull(),
  notes: text(),
  soldAt: timestamp('sold_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Name and price snapshots preserve the historical value of each sale. */
export const saleItems = pgTable('sale_items', {
  id: serial().primaryKey(),
  saleId: integer('sale_id')
    .notNull()
    .references(() => sales.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id, {
    onDelete: 'set null',
  }),
  productName: varchar('product_name', { length: 120 }).notNull(),
  quantity: quantity('quantity').notNull(),
  unitPrice: money('unit_price').notNull(),
  totalAmount: money('total_amount').notNull(),
})

export const expenses = pgTable('expenses', {
  id: serial().primaryKey(),
  description: varchar({ length: 180 }).notNull(),
  category: varchar({ length: 80 }).notNull(),
  amount: money('amount').notNull(),
  occurredAt: date('occurred_at').notNull(),
  notes: text(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Idempotency and retry history for a future WhatsApp webhook integration. */
export const messageProcessingRecords = pgTable('message_processing_records', {
  id: serial().primaryKey(),
  providerMessageId: varchar('provider_message_id', { length: 191 })
    .notNull()
    .unique(),
  senderPhone: varchar('sender_phone', { length: 32 }),
  status: messageProcessingStatus().notNull().default('received'),
  payload: jsonb().notNull(),
  attempts: integer().notNull().default(0),
  lastError: text('last_error'),
  receivedAt: timestamp('received_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
