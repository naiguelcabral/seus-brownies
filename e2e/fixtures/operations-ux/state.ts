// Only imported by the isolated preview aliases, never by application code.
let mode = ''
let calls: { kind: string; data: unknown }[] = []
const listeners = new Set<() => void>()
let completed = false
export const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
export const snapshot = () => JSON.stringify(calls)
export function setMode(value: string) {
  mode = value
}
function record(kind: string, data: unknown) {
  calls = [...calls, { kind, data }]
  listeners.forEach((fn) => fn())
}
export async function refresh() {
  if (mode === 'refresh')
    throw new Error('Falha sintética ao atualizar histórico')
}
const products = [
  { id: 1, name: 'Açúcar sintético', unit: 'g' },
  { id: 2, name: 'Saquinho sintético', unit: 'unit' },
]
export const purchaseData = {
  products,
  history: { purchases: [], total: 0, page: 1, pageSize: 20, totalPages: 1 },
  canReadHistory: true,
}
export const workspace = {
  recipes: [
    { id: 2, name: 'Receita sintética', version: 2, measuredRecovery: true },
  ],
  profiles: [
    {
      recipeVersionId: 2,
      productId: 3,
      name: 'Brownie sintético',
      sku: 'PROD015',
      expectedYield: '48.000',
    },
  ],
  batches: [
    {
      id: 1,
      status: 'draft',
      recipeName: 'Receita sintética',
      recipeVersion: 2,
      recipeMultiplier: '1',
      plannedFor: '2026-10-19',
      totalCost: null,
    },
  ],
  page: 1,
  totalPages: 1,
  total: 1,
}
export async function createPurchase({ data }: { data: unknown }) {
  record('purchase', data)
  if (mode === 'save') throw new Error('Falha sintética ao registrar compra')
  return { id: 1 }
}
export async function createProductionBatch({ data }: { data: unknown }) {
  record('draft', data)
  if (mode === 'save') throw new Error('Falha sintética ao salvar lote')
  return { id: 2 }
}
export async function previewProductionBatch({ data }: { data: unknown }) {
  record('preview', data)
  return {
    totalCost: '31.50',
    unitCost: '0.65',
    capacity: { occupied: '1', multiplier: '1', remaining: '0' },
    bordinhas: {
      selected: '0',
      measuredGrams: '0',
      unpackagedGrams: '0',
      suggested: '0',
    },
    outputs: [
      {
        productId: 3,
        productName: 'Brownie sintético',
        unit: 'unit',
        quantity: '48',
      },
    ],
    consumptions: [
      {
        productId: 1,
        productName: 'Açúcar sintético',
        available: '1000',
        quantity: '500',
        sufficient: true,
        unit: 'g',
        source: ['massa'],
      },
    ],
    operational: [],
  }
}
export async function getProductionBatch() {
  if (completed && mode === 'refresh')
    throw new Error('Falha sintética ao ler detalhes')
  return {
    batch: {
      ...workspace.batches[0],
      status: completed ? 'completed' : 'draft',
      totalCost: completed ? '31.50' : null,
      unitCost: completed ? '0.65' : null,
    },
    plannedLosses: [],
    losses: [],
    outputs: [],
    consumptions: [],
    costs: [],
    costReconciliation: [],
  }
}
export async function completeProductionBatch({ data }: { data: unknown }) {
  record('complete', data)
  completed = true
  return { id: 1, totalCost: '31.50' }
}
export async function getProductionWorkspace() {
  return workspace
}
export async function listPurchasableProducts() {
  return products
}
export async function listPurchases() {
  return purchaseData.history
}
