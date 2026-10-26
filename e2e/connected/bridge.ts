import {
  listCategories,
  createCategory,
  updateCategory,
  setCategoryActive,
  listProducts,
  createProduct,
  updateProduct,
  setProductActive,
} from '../../src/features/catalog/functions'
import {
  listSalesLocations,
  listActiveSalesLocations,
  createSalesLocation,
  updateSalesLocation,
  setSalesLocationActive,
} from '../../src/features/locations/functions'
import {
  listPurchasableProducts,
  listPurchases,
  createPurchase,
  listInventory,
  listSaleProducts,
  createSale,
  listSales,
  createExpense,
  listExpenses,
  getDashboard,
} from '../../src/features/operations/functions'
import {
  getProductionWorkspace,
  previewProductionBatch,
  createProductionBatch,
  getProductionBatch,
  completeProductionBatch,
} from '../../src/features/production/functions'
import {
  deliverSale,
  getSalePaymentOptions,
  receiveSalePayment,
  compensateDeliveredSale,
  redeemStoreCredit,
  closeFinancialPeriod,
  correctFinancialEvent,
  getFinancialOverview,
} from '../../src/features/finance/functions'
import { getOperationalReports } from '../../src/features/reports/functions'
import {
  listScenarios,
  createScenario,
  updateScenarioDraft,
  createScenarioVersion,
  activateScenario,
  archiveScenario,
} from '../../src/features/scenarios/functions'
import {
  getManagementSettings,
  updateManagementSettings,
} from '../../src/features/management/functions'
import {
  listActionPlans,
  createActionPlan,
  updateActionPlan,
} from '../../src/features/action-plans/functions'
import {
  cancelSaleLifecycle,
  returnSaleLifecycle,
  recordLossLifecycle,
  recordNegativeAdjustmentLifecycle,
  recordPositiveAdjustmentLifecycle,
} from '../../src/features/inventory/lifecycle-writers'
import { getFifoMigrationAudit } from '../../src/features/inventory/fifo-migration-audit'
import { checkSqlConnection } from '../../src/features/diagnostics/functions'
import {
  findRegistrationCandidate,
  approveRegistration,
} from '../../src/features/auth/registration-approval.functions'
import { serverFunctionPolicies } from '../../src/features/auth/server-function-policy'

// Imported explicitly by Playwright into the local Vite runtime only.
export const functions = {
  findRegistrationCandidate,
  approveRegistration,
  listCategories,
  createCategory,
  updateCategory,
  setCategoryActive,
  listProducts,
  createProduct,
  updateProduct,
  setProductActive,
  listSalesLocations,
  listActiveSalesLocations,
  createSalesLocation,
  updateSalesLocation,
  setSalesLocationActive,
  listPurchasableProducts,
  listPurchases,
  createPurchase,
  listInventory,
  listSaleProducts,
  createSale,
  listSales,
  createExpense,
  listExpenses,
  getDashboard,
  getProductionWorkspace,
  previewProductionBatch,
  createProductionBatch,
  getProductionBatch,
  completeProductionBatch,
  deliverSale,
  getSalePaymentOptions,
  receiveSalePayment,
  compensateDeliveredSale,
  redeemStoreCredit,
  closeFinancialPeriod,
  correctFinancialEvent,
  getFinancialOverview,
  getOperationalReports,
  listScenarios,
  createScenario,
  updateScenarioDraft,
  createScenarioVersion,
  activateScenario,
  archiveScenario,
  getManagementSettings,
  updateManagementSettings,
  listActionPlans,
  createActionPlan,
  updateActionPlan,
  cancelSaleLifecycle,
  returnSaleLifecycle,
  recordLossLifecycle,
  recordNegativeAdjustmentLifecycle,
  recordPositiveAdjustmentLifecycle,
  getFifoMigrationAudit,
  checkSqlConnection,
}
export { serverFunctionPolicies }
