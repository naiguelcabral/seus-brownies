import {
  boolean,
  date,
  foreignKey,
  integer,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'

const money = (name: string) => numeric(name, { precision: 12, scale: 2 })
const unitCost = (name: string) => numeric(name, { precision: 12, scale: 3 })
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
  'm',
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
export const inventoryCostLayerOrigin = pgEnum('inventory_cost_layer_origin', [
  'production',
  'purchase',
  'adjustment',
])
export const inventoryCostAllocationEventType = pgEnum(
  'inventory_cost_allocation_event_type',
  ['sale', 'loss', 'adjustment_negative'],
)
export const saleStatus = pgEnum('sale_status', [
  'draft',
  'confirmed',
  'paid',
  'cancelled',
])
export const saleAdjustmentKind = pgEnum('sale_adjustment_kind', [
  'none',
  'discount',
  'combo',
  'gift',
  'manual_adjustment',
])
export const actionPlanPriority = pgEnum('action_plan_priority', [
  'low',
  'medium',
  'high',
  'critical',
])
export const actionPlanStatus = pgEnum('action_plan_status', [
  'open',
  'in_progress',
  'completed',
  'cancelled',
])
export const salesLocationClassification = pgEnum(
  'sales_location_classification',
  ['unclassified', 'physical', 'online', 'event', 'partner'],
)
export const productionBatchStatus = pgEnum('production_batch_status', [
  'draft',
  'planned',
  'completed',
  'cancelled',
])
export const productionBatchOutputRole = pgEnum(
  'production_batch_output_role',
  ['primary', 'co_product'],
)
export const productionProfileComponentRole = pgEnum(
  'production_profile_component_role',
  ['filling'],
)
export const operationalCostType = pgEnum('operational_cost_type', [
  'energy',
  'labor',
])
export const recipeVersionStatus = pgEnum('recipe_version_status', [
  'draft',
  'active',
  'archived',
])
export const messageProcessingStatus = pgEnum('message_processing_status', [
  'received',
  'processing',
  'processed',
  'failed',
  'ignored',
])
export const appAccessRole = pgEnum('app_access_role', [
  'owner',
  'employee',
  // Retained while migration 0016 converts the existing HML Admin link.
  'admin',
  'manager',
  'production',
  'sales',
  'viewer',
])
export const authAuditOutcome = pgEnum('auth_audit_outcome', [
  'success',
  'failure',
  'blocked',
])
export const financialEventType = pgEnum('financial_event_type', [
  'sale_revenue',
  'cash_receipt',
  'cash_refund',
  'store_credit_issued',
  'store_credit_redeemed',
  'revenue_correction',
  'cash_correction',
])
export const financialPeriodStatus = pgEnum('financial_period_status', [
  'open',
  'closed',
])

/**
 * Cacau-owned access link. The identity provider remains responsible for its
 * user and session records; this table intentionally has no foreign key into
 * provider-managed schema.
 */
export const appUserAccess = pgTable(
  'app_user_access',
  {
    id: serial().primaryKey(),
    authUserId: varchar('auth_user_id', { length: 191 }).notNull().unique(),
    role: appAccessRole('role').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    roleUpdatedAt: timestamp('role_updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('app_user_access_role_idx').on(table.role)],
)

/**
 * Durable abuse state keyed by a server-derived identity hash. Raw e-mail,
 * password, reset token and session material never belong in this table.
 */
export const authLoginAttempts = pgTable(
  'auth_login_attempts',
  {
    id: serial().primaryKey(),
    identityHash: varchar('identity_hash', { length: 128 }).notNull().unique(),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    cooldownUntil: timestamp('cooldown_until', { withTimezone: true }),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('auth_login_attempts_cooldown_idx').on(table.cooldownUntil),
  ],
)

/**
 * Authentication audit facts. Provider secrets and credentials are excluded
 * by schema; metadata must remain sanitized by the writer.
 */
export const authAuditEvents = pgTable(
  'auth_audit_events',
  {
    id: serial().primaryKey(),
    actorAuthUserId: varchar('actor_auth_user_id', { length: 191 }),
    action: varchar('action', { length: 80 }).notNull(),
    outcome: authAuditOutcome('outcome').notNull(),
    targetType: varchar('target_type', { length: 80 }),
    targetId: varchar('target_id', { length: 191 }),
    requestId: varchar('request_id', { length: 191 }),
    networkHash: varchar('network_hash', { length: 128 }),
    metadata: jsonb('metadata'),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('auth_audit_events_actor_idx').on(table.actorAuthUserId),
    index('auth_audit_events_occurred_at_idx').on(table.occurredAt),
  ],
)

/** Immutable audit facts for operational mutations; business rows remain the source of truth. */
export const operationalAuditEvents = pgTable(
  'operational_audit_events',
  {
    id: serial().primaryKey(),
    actorAuthUserId: varchar('actor_auth_user_id', { length: 191 }),
    action: varchar('action', { length: 80 }).notNull(),
    entityType: varchar('entity_type', { length: 80 }).notNull(),
    entityId: varchar('entity_id', { length: 191 }).notNull(),
    operationReference: varchar('operation_reference', { length: 160 }),
    reason: text(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('operational_audit_events_actor_idx').on(table.actorAuthUserId),
    index('operational_audit_events_entity_idx').on(
      table.entityType,
      table.entityId,
    ),
    index('operational_audit_events_occurred_at_idx').on(table.occurredAt),
  ],
)

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
  /** Alert threshold in the product's canonical measurement unit; never a stored balance. */
  reorderPoint: quantity('reorder_point'),
  /** Informational default only; purchases always preserve their actual supplier. */
  preferredSupplierName: varchar('preferred_supplier_name', { length: 160 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Sales channels may be classified gradually without changing historical sales. */
export const salesLocations = pgTable('sales_locations', {
  id: serial().primaryKey(),
  sourceId: varchar('source_id', { length: 80 }).unique(),
  sourceHash: varchar('source_hash', { length: 64 }),
  name: varchar({ length: 120 }).notNull().unique(),
  classification: salesLocationClassification('classification')
    .notNull()
    .default('unclassified'),
  frequency: varchar({ length: 80 }),
  isActive: boolean('is_active').notNull().default(true),
  notes: text(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Singleton, server-validated management assumptions. Financial use still follows human gates. */
export const managementSettings = pgTable('management_settings', {
  id: integer().primaryKey(),
  version: integer().notNull().default(1),
  monthlyProfitGoal: money('monthly_profit_goal').notNull(),
  fixedMonthlyCosts: money('fixed_monthly_costs').notNull(),
  salesDaysPerMonth: integer('sales_days_per_month').notNull(),
  weeksPerMonth: numeric('weeks_per_month', {
    precision: 5,
    scale: 2,
  }).notNull(),
  normalRevenueTolerance: numeric('normal_revenue_tolerance', {
    precision: 6,
    scale: 4,
  }).notNull(),
  criticalRevenueTolerance: numeric('critical_revenue_tolerance', {
    precision: 6,
    scale: 4,
  }).notNull(),
  minimumProductMargin: numeric('minimum_product_margin', {
    precision: 6,
    scale: 4,
  }).notNull(),
  feeTaxReserveRate: numeric('fee_tax_reserve_rate', {
    precision: 6,
    scale: 4,
  }).notNull(),
  updatedByAuthUserId: varchar('updated_by_auth_user_id', { length: 191 }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Human-owned response to an observed alert; the system never asserts the cause. */
export const actionPlans = pgTable(
  'action_plans',
  {
    id: serial().primaryKey(),
    version: integer().notNull().default(1),
    alert: text().notNull(),
    probableCause: text('probable_cause'),
    action: text().notNull(),
    priority: actionPlanPriority().notNull().default('medium'),
    kpi: varchar({ length: 160 }),
    responsible: varchar({ length: 160 }),
    dueDate: date('due_date'),
    status: actionPlanStatus().notNull().default('open'),
    createdByAuthUserId: varchar('created_by_auth_user_id', {
      length: 191,
    }).notNull(),
    updatedByAuthUserId: varchar('updated_by_auth_user_id', {
      length: 191,
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('action_plans_status_due_date_idx').on(table.status, table.dueDate),
    index('action_plans_priority_idx').on(table.priority),
  ],
)

/** Append-only snapshots preserve authorship and the evolution of every action plan. */
export const actionPlanHistory = pgTable(
  'action_plan_history',
  {
    id: serial().primaryKey(),
    actionPlanId: integer('action_plan_id')
      .notNull()
      .references(() => actionPlans.id, { onDelete: 'restrict' }),
    version: integer().notNull(),
    event: varchar({ length: 40 }).notNull(),
    actorAuthUserId: varchar('actor_auth_user_id', { length: 191 }).notNull(),
    snapshot: jsonb().notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('action_plan_history_plan_version_unique').on(
      table.actionPlanId,
      table.version,
    ),
    index('action_plan_history_actor_idx').on(table.actorAuthUserId),
  ],
)

/** A signed quantityDelta forms the inventory ledger: positive enters, negative leaves. */
export const stockMovements = pgTable('stock_movements', {
  id: serial().primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  type: stockMovementType().notNull(),
  quantityDelta: quantity('quantity_delta').notNull(),
  unitCost: unitCost('unit_cost'),
  /** Exact cost allocation for a production output; other movement types leave it null. */
  allocatedCost: money('allocated_cost'),
  referenceType: varchar('reference_type', { length: 40 }),
  referenceId: integer('reference_id'),
  sourceKey: varchar('source_key', { length: 160 }).unique(),
  sourceHash: varchar('source_hash', { length: 64 }),
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
  idempotencyKey: varchar('idempotency_key', { length: 160 }).unique(),
  idempotencyHash: varchar('idempotency_hash', { length: 64 }),
  createdByAuthUserId: varchar('created_by_auth_user_id', { length: 191 }),
  sourceId: varchar('source_id', { length: 80 }).unique(),
  sourceHash: varchar('source_hash', { length: 64 }),
  supplierName: varchar('supplier_name', { length: 160 }),
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
  sourceId: varchar('source_id', { length: 80 }).unique(),
  sourceHash: varchar('source_hash', { length: 64 }),
  purchaseId: integer('purchase_id')
    .notNull()
    .references(() => purchases.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id, {
    onDelete: 'set null',
  }),
  itemName: varchar('item_name', { length: 160 }).notNull(),
  quantity: quantity('quantity').notNull(),
  unitCost: unitCost('unit_cost').notNull(),
  totalAmount: money('total_amount').notNull(),
  supplierLot: varchar('supplier_lot', { length: 80 }),
  expiresOn: date('expires_on'),
  sourceQuantityBase: quantity('source_quantity_base'),
  sourceQuantityPurchased: quantity('source_quantity_purchased'),
  sourceUnitPrice: money('source_unit_price'),
})

/** Maps a supplier/workbook description to one stock product and conversion factor. */
export const productImportAliases = pgTable('product_import_aliases', {
  id: serial().primaryKey(),
  // The source row is part of the key: equal descriptions can represent distinct inputs.
  sourceId: varchar('source_id', { length: 80 }).notNull().unique(),
  sourceName: varchar('source_name', { length: 180 }).notNull(),
  normalizedSourceName: varchar('normalized_source_name', {
    length: 180,
  }).notNull(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  sourceUnit: measurementUnit('source_unit').notNull(),
  quantityMultiplier: quantity('quantity_multiplier').notNull(),
  notes: text(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const sales = pgTable('sales', {
  id: serial().primaryKey(),
  idempotencyKey: varchar('idempotency_key', { length: 160 }).unique(),
  idempotencyHash: varchar('idempotency_hash', { length: 64 }),
  createdByAuthUserId: varchar('created_by_auth_user_id', { length: 191 }),
  sourceId: varchar('source_id', { length: 80 }).unique(),
  sourceHash: varchar('source_hash', { length: 64 }),
  locationId: integer('location_id').references(() => salesLocations.id, {
    onDelete: 'set null',
  }),
  customerName: varchar('customer_name', { length: 120 }),
  customerPhone: varchar('customer_phone', { length: 32 }),
  status: saleStatus().notNull().default('draft'),
  subtotalAmount: money('subtotal_amount').notNull(),
  discountAmount: money('discount_amount').notNull().default('0'),
  deliveryFeeAmount: money('delivery_fee_amount').notNull().default('0'),
  totalAmount: money('total_amount').notNull(),
  reportedAmount: money('reported_amount'),
  calculatedAmount: money('calculated_amount'),
  auditStatus: varchar('audit_status', { length: 40 }),
  auditNotes: text('audit_notes'),
  adjustmentKind: saleAdjustmentKind('adjustment_kind')
    .notNull()
    .default('none'),
  adjustmentReason: text('adjustment_reason'),
  affectsStock: boolean('affects_stock').notNull().default(true),
  notes: text(),
  soldAt: timestamp('sold_at', { withTimezone: true }).notNull().defaultNow(),
  /** Revenue competence starts at delivery; null means not delivered. */
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Manual period closure with the exact aggregates visible at the close. */
export const financialPeriods = pgTable('financial_periods', {
  id: serial().primaryKey(),
  periodMonth: date('period_month').notNull().unique(),
  status: financialPeriodStatus().notNull().default('open'),
  version: integer().notNull().default(1),
  closureSnapshot: jsonb('closure_snapshot'),
  closureNotes: text('closure_notes'),
  closedByAuthUserId: varchar('closed_by_auth_user_id', { length: 191 }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Immutable accrual and cash facts; event type defines the indicator affected. */
export const financialEvents = pgTable(
  'financial_events',
  {
    id: serial().primaryKey(),
    idempotencyKey: varchar('idempotency_key', { length: 160 })
      .notNull()
      .unique(),
    idempotencyHash: varchar('idempotency_hash', { length: 64 }).notNull(),
    type: financialEventType().notNull(),
    saleId: integer('sale_id').references(() => sales.id, {
      onDelete: 'restrict',
    }),
    saleItemId: integer('sale_item_id').references(() => saleItems.id, {
      onDelete: 'restrict',
    }),
    correctsEventId: integer('corrects_event_id'),
    settlesEventId: integer('settles_event_id'),
    quantity: quantity('quantity'),
    amount: money('amount').notNull(),
    /** Signed effects keep accrual and cash views independently additive. */
    revenueEffect: money('revenue_effect').notNull().default('0'),
    cashEffect: money('cash_effect').notNull().default('0'),
    competenceDate: date('competence_date').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    reason: text().notNull(),
    createdByAuthUserId: varchar('created_by_auth_user_id', {
      length: 191,
    }).notNull(),
    authorizedByAuthUserId: varchar('authorized_by_auth_user_id', {
      length: 191,
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.correctsEventId],
      foreignColumns: [table.id],
      name: 'financial_events_correction_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.settlesEventId],
      foreignColumns: [table.id],
      name: 'financial_events_settlement_fk',
    }).onDelete('restrict'),
    index('financial_events_competence_idx').on(
      table.competenceDate,
      table.type,
    ),
    index('financial_events_occurred_idx').on(table.occurredAt, table.type),
    index('financial_events_sale_idx').on(table.saleId),
    index('financial_events_settlement_idx').on(table.settlesEventId),
  ],
)

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
  /** Exact share of the sale-level reported revenue allocated to this item. */
  reportedAmount: money('reported_amount'),
})

export const expenses = pgTable('expenses', {
  id: serial().primaryKey(),
  idempotencyKey: varchar('idempotency_key', { length: 160 }).unique(),
  idempotencyHash: varchar('idempotency_hash', { length: 64 }),
  createdByAuthUserId: varchar('created_by_auth_user_id', { length: 191 }),
  sourceId: varchar('source_id', { length: 80 }).unique(),
  sourceHash: varchar('source_hash', { length: 64 }),
  description: varchar({ length: 180 }).notNull(),
  category: varchar({ length: 80 }).notNull(),
  amount: money('amount').notNull(),
  occurredAt: date('occurred_at').notNull(),
  notes: text(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** A versioned technical base recipe preserves source quantities and audit metadata. */
export const recipeVersions = pgTable('recipe_versions', {
  id: serial().primaryKey(),
  sourceId: varchar('source_id', { length: 80 }).notNull().unique(),
  sourceHash: varchar('source_hash', { length: 64 }).notNull().unique(),
  name: varchar({ length: 160 }).notNull(),
  version: integer().notNull(),
  status: recipeVersionStatus().notNull().default('draft'),
  sourcePayload: jsonb('source_payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Physical stock consumed by a recipe; operational requirements live separately. */
export const recipeItems = pgTable('recipe_items', {
  id: serial().primaryKey(),
  sourceKey: varchar('source_key', { length: 160 }).notNull().unique(),
  sourceHash: varchar('source_hash', { length: 64 }).notNull().unique(),
  recipeVersionId: integer('recipe_version_id')
    .notNull()
    .references(() => recipeVersions.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  sourceName: varchar('source_name', { length: 160 }).notNull(),
  quantity: quantity('quantity').notNull(),
  unit: measurementUnit('unit').notNull(),
  historicalCost: money('historical_cost'),
  sourcePayload: jsonb('source_payload').notNull(),
})

/** Energy and labor requirements are auditable recipe metadata, never inventory. */
export const recipeOperationalRequirements = pgTable(
  'recipe_operational_requirements',
  {
    id: serial().primaryKey(),
    sourceKey: varchar('source_key', { length: 160 }).notNull().unique(),
    sourceHash: varchar('source_hash', { length: 64 }).notNull().unique(),
    recipeVersionId: integer('recipe_version_id')
      .notNull()
      .references(() => recipeVersions.id, { onDelete: 'cascade' }),
    type: operationalCostType().notNull(),
    quantity: quantity('quantity').notNull(),
    unit: varchar({ length: 24 }).notNull(),
    historicalCost: money('historical_cost'),
    sourcePayload: jsonb('source_payload').notNull(),
  },
)

/** Versioned rates are selected by type and effective date for completed future batches. */
export const operationalCostRates = pgTable('operational_cost_rates', {
  id: serial().primaryKey(),
  sourceId: varchar('source_id', { length: 100 }).notNull().unique(),
  sourceHash: varchar('source_hash', { length: 64 }).notNull().unique(),
  type: operationalCostType().notNull(),
  unit: varchar({ length: 24 }).notNull(),
  unitAmount: money('unit_amount').notNull(),
  effectiveFrom: date('effective_from').notNull(),
  sourcePayload: jsonb('source_payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** A final product profile combines the base recipe with cut, yield, filling and packaging. */
export const productionProfiles = pgTable(
  'production_profiles',
  {
    id: serial().primaryKey(),
    sourceId: varchar('source_id', { length: 80 }).notNull().unique(),
    sourceHash: varchar('source_hash', { length: 64 }).notNull().unique(),
    recipeVersionId: integer('recipe_version_id')
      .notNull()
      .references(() => recipeVersions.id, { onDelete: 'restrict' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    cutSize: varchar('cut_size', { length: 80 }),
    filling: varchar({ length: 120 }),
    expectedYield: quantity('expected_yield').notNull(),
    packagingProductId: integer('packaging_product_id').references(
      () => products.id,
      {
        onDelete: 'restrict',
      },
    ),
    packagingQuantity: quantity('packaging_quantity'),
    sourcePayload: jsonb('source_payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('production_profiles_recipe_version_id_product_id_unique').on(
      table.recipeVersionId,
      table.productId,
    ),
  ],
)

/** Physical additions specific to a profile, separate from the shared base recipe. */
export const productionProfileComponents = pgTable(
  'production_profile_components',
  {
    id: serial().primaryKey(),
    sourceId: varchar('source_id', { length: 100 }).notNull().unique(),
    sourceHash: varchar('source_hash', { length: 64 }).notNull().unique(),
    productionProfileId: integer('production_profile_id')
      .notNull()
      .references(() => productionProfiles.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    role: productionProfileComponentRole().notNull(),
    quantity: quantity('quantity').notNull(),
    unit: measurementUnit('unit').notNull(),
    quantityBasis: varchar('quantity_basis', { length: 40 })
      .notNull()
      .default('per_finished_unit'),
    sourcePayload: jsonb('source_payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('production_profile_components_profile_product_role_unique').on(
      table.productionProfileId,
      table.productId,
      table.role,
    ),
  ],
)

/** A batch records planned or completed production, separately from inventory movement. */
export const productionBatches = pgTable('production_batches', {
  id: serial().primaryKey(),
  sourceId: varchar('source_id', { length: 80 }).unique(),
  sourceHash: varchar('source_hash', { length: 64 }),
  productionProfileId: integer('production_profile_id').references(
    () => productionProfiles.id,
    { onDelete: 'restrict' },
  ),
  recipeVersionId: integer('recipe_version_id').references(
    () => recipeVersions.id,
    {
      onDelete: 'restrict',
    },
  ),
  status: productionBatchStatus('status').notNull().default('planned'),
  plannedFor: date('planned_for'),
  /** Multiplier of the active base recipe used by operational batches. */
  recipeMultiplier: quantity('recipe_multiplier').notNull().default('1'),
  plannedBatchCount: quantity('planned_batch_count'),
  plannedQuantity: quantity('planned_quantity'),
  actualQuantity: quantity('actual_quantity'),
  sourcePayload: jsonb('source_payload'),
  completionPayload: jsonb('completion_payload'),
  totalCost: money('total_cost'),
  unitCost: unitCost('unit_cost'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  notes: text(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const productionBatchOutputs = pgTable(
  'production_batch_outputs',
  {
    id: serial().primaryKey(),
    sourceKey: varchar('source_key', { length: 160 }).unique(),
    sourceHash: varchar('source_hash', { length: 64 }).unique(),
    productionBatchId: integer('production_batch_id')
      .notNull()
      .references(() => productionBatches.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    role: productionBatchOutputRole('role').notNull().default('primary'),
    unit: measurementUnit('unit'),
    plannedQuantity: quantity('planned_quantity'),
    actualQuantity: quantity('actual_quantity'),
    lossQuantity: quantity('loss_quantity'),
    unitCost: unitCost('unit_cost'),
    /** Exact cents allocated to this output when its batch is completed. */
    allocatedCost: money('allocated_cost'),
  },
  (table) => [
    unique('production_batch_outputs_batch_product_unique').on(
      table.productionBatchId,
      table.productId,
    ),
  ],
)

/**
 * FIFO cost layers are created only for completed production outputs in the
 * first delivery. Other incoming-stock sources are intentionally deferred.
 */
export const inventoryCostLayers = pgTable(
  'inventory_cost_layers',
  {
    id: serial().primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productionBatchOutputId: integer('production_batch_output_id')
      .references(() => productionBatchOutputs.id, { onDelete: 'restrict' })
      .unique(),
    sourceStockMovementId: integer('source_stock_movement_id')
      .notNull()
      .references(() => stockMovements.id, { onDelete: 'restrict' })
      .unique(),
    origin: inventoryCostLayerOrigin('origin').notNull().default('production'),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull(),
    originalQuantity: quantity('original_quantity').notNull(),
    originalCost: money('original_cost').notNull(),
    remainingQuantity: quantity('remaining_quantity').notNull(),
    remainingCost: money('remaining_cost').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('inventory_cost_layers_fifo_idx').on(
      table.productId,
      table.availableAt,
      table.id,
    ),
  ],
)

/**
 * Immutable detail of the cost consumed by an outgoing movement. A sale item
 * may span several production-output layers while retaining exact cents.
 */
export const inventoryCostAllocations = pgTable(
  'inventory_cost_allocations',
  {
    id: serial().primaryKey(),
    inventoryCostLayerId: integer('inventory_cost_layer_id')
      .notNull()
      .references(() => inventoryCostLayers.id, { onDelete: 'restrict' }),
    outgoingStockMovementId: integer('outgoing_stock_movement_id')
      .notNull()
      .references(() => stockMovements.id, { onDelete: 'restrict' }),
    saleItemId: integer('sale_item_id').references(() => saleItems.id, {
      onDelete: 'restrict',
    }),
    eventType: inventoryCostAllocationEventType('event_type')
      .notNull()
      .default('sale'),
    eventReferenceType: varchar('event_reference_type', { length: 40 }),
    eventReferenceId: integer('event_reference_id'),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: quantity('quantity').notNull(),
    allocatedCost: money('allocated_cost').notNull(),
    unitCost: unitCost('unit_cost'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('inventory_cost_allocations_layer_movement_unique').on(
      table.inventoryCostLayerId,
      table.outgoingStockMovementId,
    ),
    index('inventory_cost_allocations_sale_item_idx').on(table.saleItemId),
    index('inventory_cost_allocations_outgoing_movement_idx').on(
      table.outgoingStockMovementId,
    ),
    index('inventory_cost_allocations_event_reference_idx').on(
      table.eventReferenceType,
      table.eventReferenceId,
    ),
  ],
)

/** Immutable restorations linked to one original consumption allocation. */
export const inventoryCostReversals = pgTable(
  'inventory_cost_reversals',
  {
    id: serial().primaryKey(),
    originalAllocationId: integer('original_allocation_id')
      .notNull()
      .references(() => inventoryCostAllocations.id, { onDelete: 'restrict' }),
    incomingStockMovementId: integer('incoming_stock_movement_id')
      .notNull()
      .references(() => stockMovements.id, { onDelete: 'restrict' }),
    eventType: varchar('event_type', { length: 24 }).notNull(),
    referenceType: varchar('reference_type', { length: 40 }).notNull(),
    referenceId: integer('reference_id').notNull(),
    quantity: quantity('quantity').notNull(),
    restoredCost: money('restored_cost').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('inventory_cost_reversals_original_movement_unique').on(
      table.originalAllocationId,
      table.incomingStockMovementId,
    ),
    index('inventory_cost_reversals_reference_idx').on(
      table.referenceType,
      table.referenceId,
    ),
  ],
)

/** Only completed batches can receive physical consumption entries. */
export const productionBatchConsumptions = pgTable(
  'production_batch_consumptions',
  {
    id: serial().primaryKey(),
    sourceKey: varchar('source_key', { length: 160 }).notNull().unique(),
    sourceHash: varchar('source_hash', { length: 64 }).notNull().unique(),
    productionBatchId: integer('production_batch_id')
      .notNull()
      .references(() => productionBatches.id, { onDelete: 'cascade' }),
    recipeItemId: integer('recipe_item_id').references(() => recipeItems.id, {
      onDelete: 'set null',
    }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: quantity('quantity').notNull(),
    unitCost: unitCost('unit_cost'),
    totalCost: money('total_cost'),
    sourcePayload: jsonb('source_payload').notNull(),
  },
)

/** Losses are explicit completed-batch facts and produce no planned-batch stock movement. */
export const productionBatchLosses = pgTable('production_batch_losses', {
  id: serial().primaryKey(),
  sourceKey: varchar('source_key', { length: 160 }).notNull().unique(),
  sourceHash: varchar('source_hash', { length: 64 }).notNull().unique(),
  productionBatchId: integer('production_batch_id')
    .notNull()
    .references(() => productionBatches.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  quantity: quantity('quantity').notNull(),
  reason: varchar({ length: 240 }).notNull(),
  sourcePayload: jsonb('source_payload').notNull(),
})

/** Energy and labor are operational costs, never stock products or stock movements. */
export const operationalCosts = pgTable('operational_costs', {
  id: serial().primaryKey(),
  sourceId: varchar('source_id', { length: 80 }).unique(),
  sourceHash: varchar('source_hash', { length: 64 }),
  type: operationalCostType('type').notNull(),
  productionBatchId: integer('production_batch_id').references(
    () => productionBatches.id,
    { onDelete: 'set null' },
  ),
  operationalRateId: integer('operational_rate_id').references(
    () => operationalCostRates.id,
    { onDelete: 'restrict' },
  ),
  quantity: quantity('quantity'),
  unit: varchar({ length: 24 }),
  /** Snapshot of the rate used, retained even if rate metadata changes later. */
  unitAmount: money('unit_amount'),
  amount: money('amount').notNull(),
  occurredAt: date('occurred_at').notNull(),
  notes: text(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Immutable source metadata makes workbook imports auditable and idempotent. */
export const historicalImportRecords = pgTable('historical_import_records', {
  id: serial().primaryKey(),
  sourceKey: varchar('source_key', { length: 160 }).notNull().unique(),
  sourceHash: varchar('source_hash', { length: 64 }).notNull().unique(),
  entityType: varchar('entity_type', { length: 40 }).notNull(),
  sourceSheet: varchar('source_sheet', { length: 80 }).notNull(),
  payload: jsonb().notNull(),
  importedAt: timestamp('imported_at', { withTimezone: true })
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
