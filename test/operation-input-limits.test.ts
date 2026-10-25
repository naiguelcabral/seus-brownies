import assert from 'node:assert/strict'
import test from 'node:test'
import { purchaseInput, saleInput } from '../src/features/operations/input'
import { batchInput } from '../src/features/production/input'
import {
  maxOperationItems,
  maxNumericInputLength,
} from '../src/lib/input-limits'

const purchase = {
  idempotencyKey: '00000000-0000-4000-8000-000000000001',
  supplierName: 'Fornecedor',
  purchasedAt: '2026-10-25',
  items: [{ productId: 1, quantity: '1.000', totalAmount: '12.34' }],
}
const sale = {
  idempotencyKey: purchase.idempotencyKey,
  locationId: 1,
  status: 'confirmed',
  reportedAmount: '12.34',
  adjustmentKind: 'none',
  items: [{ productId: 1, quantity: '1.000' }],
}
const batch = {
  recipeVersionId: 1,
  productionDate: '2026-10-25',
  recipeMultiplier: '1.000',
  outputs: [{ productId: 1, quantity: '1.000' }],
}

test('purchase, sale and production accept the item boundary and reject excess before item validation', () => {
  for (const [schema, data, key, item] of [
    [purchaseInput, purchase, 'items', purchase.items[0]],
    [saleInput, sale, 'items', sale.items[0]],
    [batchInput, batch, 'outputs', batch.outputs[0]],
    [
      batchInput,
      batch,
      'losses',
      { productId: 1, quantity: '1.000', reason: 'Perda declarada' },
    ],
  ] as const) {
    assert.equal(
      schema.safeParse({
        ...data,
        [key]: Array.from({ length: maxOperationItems }, () => item),
      }).success,
      true,
    )
    const excess = schema.safeParse({
      ...data,
      [key]: Array.from({ length: maxOperationItems + 1 }, () => ({
        productId: null,
      })),
    })
    assert.equal(excess.success, false)
    assert.ok(
      excess.error.issues.some(
        (issue) => issue.code === 'too_big' && issue.path[0] === key,
      ),
    )
    assert.equal(excess.error.issues.length, 1)
  }
})

test('numeric strings are bounded before arithmetic and valid business constraints remain', () => {
  const huge = '9'.repeat(maxNumericInputLength + 1)
  assert.equal(
    purchaseInput.safeParse({
      ...purchase,
      items: [{ productId: 1, quantity: huge }],
    }).success,
    false,
  )
  assert.equal(
    saleInput.safeParse({ ...sale, items: [{ productId: 1, quantity: huge }] })
      .success,
    false,
  )
  assert.equal(
    batchInput.safeParse({ ...batch, recipeMultiplier: huge }).success,
    false,
  )
  assert.equal(
    batchInput.safeParse({
      ...batch,
      outputs: [{ productId: 1, quantity: '0' }],
    }).success,
    false,
  )
  assert.equal(saleInput.safeParse({ ...sale, status: 'paid' }).success, false)
  assert.equal(
    purchaseInput.safeParse({
      ...purchase,
      items: [{ ...purchase.items[0], expiresOn: '2026-10-24' }],
    }).success,
    false,
  )
})
