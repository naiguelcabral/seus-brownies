import assert from 'node:assert/strict'
import test from 'node:test'
import { valueInventory } from '../src/features/reports/calculations'
import {
  pilotMaterialCost,
  pilotInventoryValue,
  readPilotWorkbookCosts,
} from '../src/features/production/pilot-workbook-costs'

const policy = {
  schemaVersion: 1,
  workbookSha256: 'a'.repeat(64),
  costs: {
    'TEST-OIL': {
      unit: 'ml',
      unitCost: { numerator: '7', denominator: '900' },
      source: 'Fixture!C5:D5',
    },
  },
  operationalPerRecipe: {
    energy: {
      unit: 'batch',
      unitCost: { numerator: '1', denominator: '2' },
      source: 'Fixture!C6',
    },
    labor: {
      unit: 'batch',
      unitCost: { numerator: '3', denominator: '1' },
      source: 'Fixture!C7',
    },
  },
}
const environment = {
  PILOT_STOCK_POLICY: 'workbook_negative',
  PILOT_WORKBOOK_COSTS: JSON.stringify(policy),
  PASSWORD_RESET_REDIRECT_ORIGIN:
    'https://cacau-v1-piloto.naiguelcabral.workers.dev',
}
test('pilot costs require both the explicit server policy and the exact pilot origin', () => {
  assert.equal(readPilotWorkbookCosts({}), null)
  assert.equal(
    readPilotWorkbookCosts({ ...environment, PILOT_STOCK_POLICY: 'true' }),
    null,
  )
  assert.equal(
    readPilotWorkbookCosts({
      ...environment,
      PASSWORD_RESET_REDIRECT_ORIGIN: 'https://example.test',
    }),
    null,
  )
  assert.equal(
    readPilotWorkbookCosts({ ...environment, PILOT_WORKBOOK_COSTS: undefined }),
    null,
  )
  assert.deepEqual(readPilotWorkbookCosts(environment), policy)
})
test('invalid pilot costs fail without exposing the supplied configuration', () => {
  for (const value of [
    'private-invalid-json',
    JSON.stringify({
      ...policy,
      costs: {
        A: {
          unit: 'g',
          unitCost: { numerator: '-1', denominator: '0' },
          source: 'Fixture!A1',
        },
      },
    }),
  ]) {
    assert.throws(
      () =>
        readPilotWorkbookCosts({ ...environment, PILOT_WORKBOOK_COSTS: value }),
      /^Error: Referências do workbook inválidas no piloto\.$/,
    )
  }
})
test('package price and quantity retain the exact fraction for repeated consumption', () => {
  const parsed = readPilotWorkbookCosts(environment)
  assert.ok(parsed)
  assert.deepEqual(pilotMaterialCost(parsed, 'TEST-OIL', 'ml', 215_000n), {
    numerator: '301',
    denominator: '180',
  })
  assert.deepEqual(pilotMaterialCost(parsed, 'TEST-OIL', 'ml', 900_000n), {
    numerator: '7',
    denominator: '1',
  })
  assert.throws(
    () => pilotMaterialCost(parsed, 'UNKNOWN', 'g', 1_000n),
    /Custo do workbook ausente/,
  )
  assert.throws(
    () => pilotMaterialCost(parsed, 'TEST-OIL', 'l', 1_000n),
    /unidade incompatível/,
  )
  assert.throws(
    () => pilotMaterialCost(parsed, 'TEST-OIL', 'ml', -1n),
    /Quantidade de referência inválida/,
  )
  assert.deepEqual(pilotInventoryValue(parsed, 'TEST-OIL', 'ml', -900_000n), {
    numerator: '-7',
    denominator: '1',
  })
  const position = valueInventory(
    [
      {
        productId: 1,
        sku: 'TEST-OIL',
        productName: 'Óleo sintético',
        unit: 'ml',
        quantityDelta: '-900.000',
        unitCost: null,
      },
    ],
    parsed,
  )
  assert.equal(position[0]?.balance, '-900.000')
  assert.equal(position[0]?.value, '-7.00')
  assert.deepEqual(position[0]?.exactValue, {
    numerator: '-7',
    denominator: '1',
  })
})
