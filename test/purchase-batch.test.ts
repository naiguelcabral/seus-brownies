import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decodePurchaseBatchFragment,
  maxPurchaseBatchBytes,
  parsePurchaseBatch,
  preparePurchaseBatch,
  purchaseBatchTotal,
  runPurchaseBatch,
} from '../src/features/operations/purchase-batch'
import type { PurchaseBatchPorts } from '../src/features/operations/purchase-batch'
import { requireDefined } from '../src/lib/required-value'

const origin = 'https://pilot.example.invalid'
function manifest() {
  return {
    version: 1,
    targetOrigin: origin,
    products: [
      {
        key: 'sugar',
        kind: 'existing',
        id: 1,
        name: 'Açúcar sintético',
        sku: 'TEST-SUGAR',
        type: 'ingredient',
        unit: 'g',
      },
      {
        key: 'oil',
        kind: 'existing',
        id: 2,
        name: 'Óleo sintético',
        sku: 'TEST-OIL',
        type: 'ingredient',
        unit: 'ml',
      },
      {
        key: 'filling',
        kind: 'new',
        name: 'Recheio sintético',
        sku: 'TEST-FILLING',
        type: 'ingredient',
        unit: 'g',
        categoryId: 1,
        categoryName: 'Insumos sintéticos',
        description: 'Fixture isolada',
      },
    ],
    purchases: [
      {
        idempotencyKey: '4bd967cc-a5a5-4500-8710-7303ef41a187',
        supplierName: 'Fornecedor sintético A',
        purchasedAt: '2026-09-01',
        invoiceFileReference: 'TEST-A',
        notes: 'Fixture sem compra real',
        items: [
          {
            productKey: 'sugar',
            quantity: '1.5',
            purchaseUnit: 'kg',
            totalAmount: '7.31',
          },
          { productKey: 'oil', quantity: '900', totalAmount: '6.99' },
        ],
      },
      {
        idempotencyKey: 'e0197a6a-6f93-4006-9335-f4f7b65190dc',
        supplierName: 'Fornecedor sintético B',
        purchasedAt: '2026-09-02',
        invoiceFileReference: 'TEST-B',
        notes: 'Fixture sem compra real',
        items: [
          {
            productKey: 'filling',
            quantity: '1.01',
            purchaseUnit: 'kg',
            totalAmount: '12.13',
          },
        ],
      },
    ],
  }
}
function parsed() {
  return parsePurchaseBatch(JSON.stringify(manifest()), origin)
}
function fixture() {
  const catalog: Awaited<ReturnType<PurchaseBatchPorts['findProducts']>> = [
    {
      id: 1,
      name: 'Açúcar sintético',
      sku: 'TEST-SUGAR',
      type: 'ingredient',
      unit: 'g',
      isActive: true,
      categoryId: 1,
      description: null,
    },
    {
      id: 2,
      name: 'Óleo sintético',
      sku: 'TEST-OIL',
      type: 'ingredient',
      unit: 'ml',
      isActive: true,
      categoryId: 1,
      description: null,
    },
  ]
  const saved = new Map<string, { payload: string; id: number }>()
  const inputs: Parameters<PurchaseBatchPorts['createPurchase']>[0][] = []
  let writes = 0
  let loseProductResponse = false
  let losePurchaseResponse = false
  const ports: PurchaseBatchPorts = {
    findProducts: async (sku) =>
      catalog.filter((product) => product.sku === sku),
    listCategories: async () => [
      { id: 1, name: 'Insumos sintéticos', isActive: true },
    ],
    createProduct: async (data) => {
      assert.equal(
        catalog.some((product) => product.sku === data.sku),
        false,
      )
      catalog.push({ ...data, id: 3, isActive: true })
      writes++
      if (loseProductResponse) {
        loseProductResponse = false
        throw new Error('Resposta do cadastro perdida')
      }
      return { id: 3 }
    },
    createPurchase: async (data) => {
      inputs.push(data)
      const prior = saved.get(data.idempotencyKey)
      if (prior) {
        assert.equal(prior.payload, JSON.stringify(data))
        return { id: prior.id, replayed: true }
      }
      const id = saved.size + 1
      saved.set(data.idempotencyKey, { id, payload: JSON.stringify(data) })
      writes++
      if (losePurchaseResponse) {
        losePurchaseResponse = false
        throw new Error('Resposta da compra perdida')
      }
      return { id, replayed: false }
    },
  }
  return {
    catalog,
    saved,
    inputs,
    ports,
    writes: () => writes,
    loseProduct: () => {
      loseProductResponse = true
    },
    losePurchase: () => {
      losePurchaseResponse = true
    },
  }
}

test('lote preserva custo total exato, kg e ml; conferência não grava', async () => {
  const batch = parsed()
  assert.equal(purchaseBatchTotal(batch), 2643n)
  const f = fixture()
  const preview = await preparePurchaseBatch(batch, f.ports)
  assert.deepEqual(
    preview.missing.map((product) => product.sku),
    ['TEST-FILLING'],
  )
  assert.equal(f.writes(), 0)
  const results: unknown[] = []
  await runPurchaseBatch(batch, f.ports, (result) => results.push(result))
  assert.equal(f.saved.size, 2)
  assert.deepEqual(f.inputs[0]?.items, [
    { productId: 1, quantity: '1.5', purchaseUnit: 'kg', totalAmount: '7.31' },
    { productId: 2, quantity: '900', totalAmount: '6.99' },
  ])
  assert.deepEqual(results, [
    { index: 0, id: 1, replayed: false },
    { index: 1, id: 2, replayed: false },
  ])
})
test('retomada após respostas perdidas recupera SKU e reutiliza as referências originais', async () => {
  const f = fixture()
  f.loseProduct()
  await assert.rejects(
    runPurchaseBatch(parsed(), f.ports, () => {}),
    /cadastro perdida/,
  )
  assert.equal(f.saved.size, 0)
  assert.equal(f.catalog.length, 3)
  f.losePurchase()
  await assert.rejects(
    runPurchaseBatch(parsed(), f.ports, () => {}),
    /compra perdida/,
  )
  assert.equal(f.saved.size, 1)
  const results: boolean[] = []
  await runPurchaseBatch(parsed(), f.ports, (result) =>
    results.push(result.replayed),
  )
  assert.deepEqual(results, [true, false])
  assert.equal(f.saved.size, 2)
  assert.equal(f.writes(), 3)
  await runPurchaseBatch(parsed(), f.ports, () => {})
  assert.equal(f.writes(), 3)
})
test('catálogo divergente ou inativo interrompe o lote inteiro antes de gravar', async () => {
  for (const patch of [
    { name: 'Outro produto' },
    { id: 99 },
    { unit: 'unit' },
    { type: 'finished_product' },
    { isActive: false },
  ]) {
    const f = fixture()
    Object.assign(f.catalog[0] ?? {}, patch)
    await assert.rejects(
      runPurchaseBatch(parsed(), f.ports, () => {}),
      /diverge/,
    )
    assert.equal(f.writes(), 0)
  }
  const f = fixture()
  f.ports.listCategories = async () => []
  await assert.rejects(
    runPurchaseBatch(parsed(), f.ports, () => {}),
    /Categoria/,
  )
  assert.equal(f.writes(), 0)
})
test('negação da autorização de cadastro não grava compras nem fabrica ator', async () => {
  const f = fixture()
  f.ports.createProduct = async () => {
    throw new Error('Acesso negado pelo servidor')
  }
  await assert.rejects(
    runPurchaseBatch(parsed(), f.ports, () => {}),
    /Acesso negado/,
  )
  assert.equal(f.saved.size, 0)
})
test('manifesto recusa ambiente errado, referências repetidas, campos extras e unidades erradas', () => {
  assert.throws(
    () =>
      parsePurchaseBatch(
        JSON.stringify(manifest()),
        'https://other.example.invalid',
      ),
    /outro ambiente/,
  )
  const duplicate = manifest()
  duplicate.purchases.push(requireDefined(duplicate.purchases[0]))
  assert.throws(
    () => parsePurchaseBatch(JSON.stringify(duplicate), origin),
    /repetidos/,
  )
  const unknown = { ...manifest(), actorAuthUserId: 'forged' }
  assert.throws(
    () => parsePurchaseBatch(JSON.stringify(unknown), origin),
    /Formato/,
  )
  const wrongUnit = manifest()
  requireDefined(requireDefined(wrongUnit.purchases[0]).items[0]).purchaseUnit =
    'ml'
  assert.throws(
    () => parsePurchaseBatch(JSON.stringify(wrongUnit), origin),
    /Formato/,
  )
  const wrongProduct = manifest()
  requireDefined(
    requireDefined(wrongProduct.purchases[0]).items[0],
  ).productKey = 'absent'
  assert.throws(
    () => parsePurchaseBatch(JSON.stringify(wrongProduct), origin),
    /produto definido/,
  )
  const invalid = manifest()
  requireDefined(requireDefined(invalid.purchases[0]).items[0]).totalAmount =
    '-1'
  assert.throws(
    () => parsePurchaseBatch(JSON.stringify(invalid), origin),
    /Formato/,
  )
  assert.throws(
    () => parsePurchaseBatch(' '.repeat(maxPurchaseBatchBytes + 1), origin),
    /64 KB/,
  )
})
test('link carrega somente dados UTF-8; não muda destino nem executa operações', () => {
  const text = JSON.stringify(manifest())
  assert.equal(
    decodePurchaseBatchFragment(
      '#lote=' + Buffer.from(text).toString('base64url'),
    ),
    text,
  )
  assert.equal(decodePurchaseBatchFragment('#outra-coisa'), '')
  assert.throws(
    () => decodePurchaseBatchFragment('#lote=../../example'),
    /inválido/,
  )
  assert.throws(
    () =>
      decodePurchaseBatchFragment(
        '#lote=' + 'a'.repeat(maxPurchaseBatchBytes * 2 + 1),
      ),
    /grande/,
  )
})
