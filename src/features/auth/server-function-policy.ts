import type { Permission } from './authorization'

/**
 * Declarative inventory of Server Functions protected by the shared server
 * authorization middleware. Runtime HML validation remains pending while the
 * public Worker is blocked at the edge and awaits a deploy of this source.
 */
export const serverFunctionPolicies = {
  listCategories: 'catalog:read',
  createCategory: 'catalog:write',
  updateCategory: 'catalog:write',
  setCategoryActive: 'catalog:write',
  listProducts: 'catalog:read',
  createProduct: 'catalog:write',
  updateProduct: 'catalog:write',
  setProductActive: 'catalog:write',
  listSalesLocations: 'catalog:write',
  listActiveSalesLocations: 'catalog:read',
  createSalesLocation: 'catalog:write',
  updateSalesLocation: 'catalog:write',
  setSalesLocationActive: 'catalog:write',
  listPurchasableProducts: 'catalog:read',
  listPurchases: 'purchases:read',
  createPurchase: 'purchases:write',
  listInventory: 'inventory:read',
  listSaleProducts: 'catalog:read',
  createSale: 'sales:write',
  listSales: 'sales:read',
  createExpense: 'expenses:write',
  listExpenses: 'expenses:read',
  getDashboard: 'dashboard:read',
  getProductionWorkspace: 'production:read',
  previewProductionBatch: 'production:write',
  createProductionBatch: 'production:write',
  getProductionBatch: 'production:read',
  completeProductionBatch: 'production:write',
  getOperationalReports: 'reports:financial:read',
  getManagementSettings: 'access:manage',
  updateManagementSettings: 'access:manage',
  listActionPlans: 'access:manage',
  createActionPlan: 'access:manage',
  updateActionPlan: 'access:manage',
  getFifoMigrationAudit: 'fifo:audit:read',
  cancelSaleLifecycle: 'fifo:lifecycle:write',
  returnSaleLifecycle: 'fifo:lifecycle:write',
  recordLossLifecycle: 'fifo:lifecycle:write',
  recordNegativeAdjustmentLifecycle: 'fifo:lifecycle:write',
  recordPositiveAdjustmentLifecycle: 'fifo:lifecycle:write',
} as const satisfies Record<string, Permission>

export type ProtectedServerFunction = keyof typeof serverFunctionPolicies
