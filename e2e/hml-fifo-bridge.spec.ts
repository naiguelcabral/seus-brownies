import { expect, test } from '@playwright/test'

test('aplica o backfill HML pela ponte local temporária', async ({ page }) => {
  await page.goto('/hml-fifo-bridge')
  await expect(page.getByTestId('hml-message')).toContainText('Pré-checagem concluída')
  const before = JSON.parse(await page.getByTestId('hml-summary').textContent() ?? '{}')
  expect(before.allocations).toHaveLength(0)
  await page.getByTestId('hml-run').click()
  await expect(page.getByTestId('hml-message')).toContainText('Backfill HML concluído')
  const after = JSON.parse(await page.getByTestId('hml-summary').textContent() ?? '{}')
  expect(after.action).toBe('created')
  expect(after.layers).toEqual(expect.arrayContaining([
    expect.objectContaining({ sku: 'PROD003', originalQuantity: '12.000', originalCost: '45.33', remainingQuantity: '10.000', remainingCost: '37.77' }),
    expect.objectContaining({ sku: 'PROD002', originalQuantity: '6.000', originalCost: '22.67', remainingQuantity: '6.000', remainingCost: '22.67' }),
  ]))
  expect(after.allocations).toHaveLength(2)
  expect(after.allocations.every((item: { quantity: string; allocatedCost: string }) => item.quantity === '1.000' && item.allocatedCost === '3.78')).toBeTruthy()
  console.log(JSON.stringify(after))
})
