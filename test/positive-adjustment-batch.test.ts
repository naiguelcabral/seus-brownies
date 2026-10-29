import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adjustmentMoneyCents,
  decodeAdjustmentBatchFragment,
  maxAdjustmentBatchBytes,
  parsePositiveAdjustmentBatch,
  previewPositiveAdjustmentBatch,
  runPositiveAdjustmentBatch,
} from '../src/features/inventory/positive-adjustment-batch'
import type {
  AdjustmentBatchPorts,
  AdjustmentBatchResult,
} from '../src/features/inventory/positive-adjustment-batch'
import { inventoryEventSourceKey } from '../src/features/inventory/lifecycle'
import { exactCost } from '../src/lib/exact-cost'

const origin = 'https://pilot.example.invalid'
function manifest() {
  return {
    version: 1,
    targetOrigin: origin,
    adjustments: [
      {
        productId: 11,
        name: 'Farinha sintética',
        sku: 'QA-FLOUR',
        unit: 'g',
        quantity: '240',
        totalCost: '1.20',
        reason: 'Fixture descartável',
        reference: 'QA-FLOUR-001',
        originReference: 'Fixture:B8:F8',
      },
      {
        productId: 12,
        name: 'Embalagem sintética',
        sku: 'QA-PACK',
        unit: 'unit',
        quantity: '24',
        totalCost: '3.84',
        reason: 'Fixture descartável',
        reference: 'QA-PACK-001',
        originReference: 'Fixture:B9:F9',
      },
    ],
  }
}
function fixture() {
  const batch = parsePositiveAdjustmentBatch(JSON.stringify(manifest()), origin)
  const products = batch.adjustments.map((item) => ({
    id: item.productId,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    isActive: true,
  }))
  const movements: Parameters<typeof previewPositiveAdjustmentBatch>[2] = []
  const inputs: Parameters<AdjustmentBatchPorts['record']>[0][] = []
  let failAt = -1
  let loseResponse = false
  const ports: AdjustmentBatchPorts = {
    preview: async (data) =>
      previewPositiveAdjustmentBatch(data, products, movements),
    record: async (input) => {
      inputs.push(input)
      if (inputs.length === failAt)
        throw new Error('Rede indisponível antes da gravação')
      const sourceKey = inventoryEventSourceKey(
        'adjustment-positive',
        input.productId,
        input.reference,
      )
      assert.equal(
        movements.some((row) => row.sourceKey === sourceKey),
        false,
        'uma referência consumida nunca deve receber outro POST',
      )
      const movementId = movements.length + 1
      movements.push({
        id: movementId,
        productId: input.productId,
        sourceKey,
        referenceType: 'adjustment_positive',
        quantityDelta: input.quantity,
        allocatedCost: input.totalCost,
        exactCost: exactCost(adjustmentMoneyCents(input.totalCost), 100n),
        notes: `${input.reason} | origem: ${input.originReference}`,
      })
      if (loseResponse) {
        loseResponse = false
        throw new Error('Resposta perdida após commit')
      }
      return { movementId, layerId: movementId }
    },
  }
  return {
    batch,
    products,
    movements,
    inputs,
    ports,
    fail: (position: number) => {
      failAt = position
    },
    lose: () => {
      loseResponse = true
    },
  }
}

test('adjustment batch validates environment, bounds, strict fields, units and distinct references', () => {
  assert.equal(fixture().batch.adjustments.length, 2)
  assert.throws(() => parsePositiveAdjustmentBatch('{}', origin))
  assert.throws(
    () =>
      parsePositiveAdjustmentBatch(
        'x'.repeat(maxAdjustmentBatchBytes + 1),
        origin,
      ),
    /32 KB/,
  )
  for (const invalid of [
    { ...manifest(), targetOrigin: 'https://other.example.invalid' },
    { ...manifest(), targetOrigin: 'not a url' },
    { ...manifest(), targetOrigin: origin + '/path' },
    { ...manifest(), actor: 'forged' },
    { ...manifest(), adjustments: [] },
    {
      ...manifest(),
      adjustments: Array.from({ length: 11 }, () => manifest().adjustments[0]),
    },
    {
      ...manifest(),
      adjustments: [manifest().adjustments[0], manifest().adjustments[0]],
    },
    ...['quantity', 'totalCost', 'unit', 'reference'].map((field) => ({
      ...manifest(),
      adjustments: [
        {
          ...manifest().adjustments[0],
          [field]:
            field === 'quantity'
              ? '0'
              : field === 'totalCost'
                ? '-1'
                : field === 'unit'
                  ? 'invalid'
                  : 'x'.repeat(160),
        },
      ],
    })),
    {
      ...manifest(),
      adjustments: [{ ...manifest().adjustments[1], quantity: '1.5' }],
    },
    {
      ...manifest(),
      adjustments: [{ ...manifest().adjustments[0], movementId: 1 }],
    },
  ])
    assert.throws(() =>
      parsePositiveAdjustmentBatch(JSON.stringify(invalid), origin),
    )
  assert.equal(adjustmentMoneyCents('9007199254740993.99'), 900719925474099399n)
  assert.throws(() => adjustmentMoneyCents('invalid'), /Custo/)
})

test('adjustment fragment preserves UTF8 and rejects malformed or oversized data', () => {
  const content = JSON.stringify(manifest())
  assert.equal(
    decodeAdjustmentBatchFragment(
      '#ajustes=' + Buffer.from(content).toString('base64url'),
    ),
    content,
  )
  assert.equal(decodeAdjustmentBatchFragment('#other'), '')
  for (const encoded of [
    '%',
    '_w',
    'x'.repeat(maxAdjustmentBatchBytes * 2 + 1),
  ])
    assert.throws(() => decodeAdjustmentBatchFragment('#ajustes=' + encoded))
})

test('preview writes nothing and rejects catalog drift or conflicting persisted receipts', async () => {
  const f = fixture()
  assert.deepEqual(
    (await f.ports.preview(f.batch)).items.map((row) => row.movementId),
    [null, null],
  )
  assert.equal(f.inputs.length, 0)
  for (const patch of [
    { isActive: false },
    { name: 'Outro' },
    { sku: 'OTHER' },
    { unit: 'kg' },
  ]) {
    assert.throws(
      () =>
        previewPositiveAdjustmentBatch(
          f.batch,
          f.products.map((product) => ({ ...product, ...patch })),
          [],
        ),
      /cadastro/,
    )
  }
  await runPositiveAdjustmentBatch(f.batch, f.ports, () => {})
  for (const patch of [
    { productId: 99 },
    { referenceType: 'purchase' },
    { quantityDelta: '241' },
    { allocatedCost: '1.21' },
    { exactCost: exactCost(121n, 100n) },
    { notes: 'Outra origem' },
  ]) {
    assert.throws(
      () =>
        previewPositiveAdjustmentBatch(
          f.batch,
          f.products,
          f.movements.map((row) => ({ ...row, ...patch })),
        ),
      /dados diferentes/,
    )
  }
  assert.throws(
    () =>
      previewPositiveAdjustmentBatch(f.batch, f.products, [
        ...f.movements,
        ...f.movements,
      ]),
    /dados diferentes/,
  )
})

test('batch records once with original references and skips matching receipts on reopen', async () => {
  const f = fixture()
  const results: AdjustmentBatchResult[] = []
  await runPositiveAdjustmentBatch(f.batch, f.ports, (row) => results.push(row))
  assert.deepEqual(
    results.map((row) => row.replayed),
    [false, false],
  )
  assert.deepEqual(
    f.inputs.map((row) => row.reference),
    f.batch.adjustments.map((row) => row.reference),
  )
  assert.equal(Object.hasOwn(f.inputs[0] ?? {}, 'actor'), false)
  await runPositiveAdjustmentBatch(f.batch, f.ports, (row) => results.push(row))
  assert.equal(f.inputs.length, 2)
  assert.deepEqual(
    results.slice(2).map((row) => row.replayed),
    [true, true],
  )
})

test('lost committed response is resolved by read, without resending consumed reference', async () => {
  const f = fixture()
  f.lose()
  const results: AdjustmentBatchResult[] = []
  await runPositiveAdjustmentBatch(f.batch, f.ports, (row) => results.push(row))
  assert.equal(f.inputs.length, 2)
  assert.equal(f.movements.length, 2)
  assert.deepEqual(
    results.map((row) => row.replayed),
    [true, false],
  )
})

test('partial failure stops and resumes only pending adjustments', async () => {
  const f = fixture()
  f.fail(2)
  await assert.rejects(
    runPositiveAdjustmentBatch(f.batch, f.ports, () => {}),
    /Rede indisponível/,
  )
  assert.equal(f.movements.length, 1)
  const results: AdjustmentBatchResult[] = []
  await runPositiveAdjustmentBatch(f.batch, f.ports, (row) => results.push(row))
  assert.equal(f.inputs.filter((row) => row.productId === 11).length, 1)
  assert.equal(f.movements.length, 2)
  assert.deepEqual(
    results.map((row) => row.replayed),
    [true, false],
  )
})

test('preflight conflict blocks every write and inaccessible verification never retries a POST', async () => {
  const f = fixture()
  const ports: AdjustmentBatchPorts = {
    ...f.ports,
    preview: async () => {
      throw new Error('Conferência bloqueada')
    },
  }
  await assert.rejects(
    runPositiveAdjustmentBatch(f.batch, ports, () => {}),
    /bloqueada/,
  )
  assert.equal(f.inputs.length, 0)
  let reads = 0
  ports.preview = async (batch) => {
    if (++reads > 1) throw new Error('Verificação indisponível')
    return f.ports.preview(batch)
  }
  f.fail(1)
  await assert.rejects(
    runPositiveAdjustmentBatch(f.batch, ports, () => {}),
    /indisponível/,
  )
  assert.equal(f.inputs.length, 1)
  assert.equal(f.movements.length, 0)
})
