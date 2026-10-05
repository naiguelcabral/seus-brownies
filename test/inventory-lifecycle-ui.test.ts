import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { PositiveAdjustmentForm } from '../src/features/inventory/positive-adjustment-form'
import {
  canCancelSale,
  canSubmitLifecycle,
  canSubmitPositiveAdjustment,
  createNegativeInventoryFormValues,
  lifecycleErrorMessage,
  validateLifecycleForm,
} from '../src/features/inventory/lifecycle-ui'

test('cancelamento só fica disponível para venda confirmada ou paga', () => {
  assert.equal(canCancelSale('draft'), false)
  assert.equal(canCancelSale('cancelled'), false)
  assert.equal(canCancelSale('confirmed'), true)
  assert.equal(canCancelSale('paid'), true)
})

test('validação local preserva payload do writer e bloqueia quantidade inválida', () => {
  assert.deepEqual(
    validateLifecycleForm('loss', {
      productId: 3,
      quantity: '1.250',
      reason: 'Quebra',
      reference: 'L-1',
    }),
    {
      ok: true,
      data: {
        productId: 3,
        quantity: '1.250',
        reason: 'Quebra',
        reference: 'L-1',
      },
    },
  )
  assert.equal(
    validateLifecycleForm('return', {
      saleItemId: 2,
      quantity: '1.0000',
      settlement: 'refund',
      occurredOn: '2026-09-11',
      reason: 'Retorno',
      reference: 'R-1',
    }).ok,
    false,
  )
})

test('erro de schema ausente recebe orientação operacional sem simular sucesso', () => {
  assert.match(
    lifecycleErrorMessage(
      new Error(
        'FIFO fase 2 requer a migration 0013_fifo_lifecycle antes de gravar.',
      ),
    ),
    /migration 0013/,
  )
})

test('estado pendente ou confirmação ausente bloqueia reenvio local', () => {
  assert.equal(canSubmitLifecycle(true), false)
  assert.equal(canSubmitLifecycle(false, true, false), false)
  assert.equal(canSubmitLifecycle(false, true, true), true)
})

test('perda e ajuste negativo iniciam com estados independentes', () => {
  const lossValues = createNegativeInventoryFormValues()
  const adjustmentValues = createNegativeInventoryFormValues()

  lossValues.productId = '3'
  lossValues.quantity = '1.000'
  lossValues.reason = 'Quebra'

  assert.deepEqual(adjustmentValues, {
    productId: '',
    quantity: '',
    reason: '',
    reference: '',
  })
})

const validPositiveAdjustment = {
  productId: '3',
  quantity: '1.250',
  totalCost: '12,50',
  originReference: 'NF-123',
  reason: 'Contagem física',
  reference: 'AJ-123',
}

test('ajuste positivo renderiza confirmação explícita e inicia bloqueado', () => {
  const markup = renderToStaticMarkup(
    createElement(PositiveAdjustmentForm, {
      products: [{ id: 3, name: 'Brownie', sku: 'PROD003' }],
      values: {
        productId: '',
        quantity: '',
        totalCost: '',
        originReference: '',
        reason: '',
        reference: '',
      },
      setValues: () => undefined,
      pending: false,
      confirmed: false,
      setConfirmed: () => undefined,
      onSubmit: () => undefined,
    }),
  )
  assert.equal((markup.match(/type="checkbox"/g) ?? []).length, 1)
  assert.match(markup, /aumenta o estoque e cria uma camada FIFO/)
  assert.match(markup, /disabled=""/)
})

test('ajuste positivo só habilita com campos válidos e confirmação', () => {
  assert.equal(canSubmitPositiveAdjustment(false, {}, false), false)
  assert.equal(
    canSubmitPositiveAdjustment(false, validPositiveAdjustment, false),
    false,
  )
  assert.equal(
    canSubmitPositiveAdjustment(
      false,
      { ...validPositiveAdjustment, totalCost: '' },
      true,
    ),
    false,
  )
  assert.equal(
    canSubmitPositiveAdjustment(true, validPositiveAdjustment, true),
    false,
  )
  assert.equal(
    canSubmitPositiveAdjustment(false, validPositiveAdjustment, true),
    true,
  )
})
