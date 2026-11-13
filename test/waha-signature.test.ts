import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifyWahaSignature } from '../src/features/whatsapp/waha-signature'

test('verifies WAHA documented raw-body signature and rejects changes', async () => {
  const body = new TextEncoder().encode(
    '{"event":"message","session":"default","engine":"WEBJS"}',
  )
  const input = {
    body,
    secret: 'my-secret-key',
    algorithm: 'sha512',
    signature:
      '208f8a55dde9e05519e898b10b89bf0d0b3b0fdf11fdbf09b6b90476301b98d8097c462b2b17a6ce93b6b47a136cf2e78a33a63f6752c2c1631777076153fa89',
  }
  assert.equal(await verifyWahaSignature(input), true)
  assert.equal(
    await verifyWahaSignature({
      ...input,
      body: new TextEncoder().encode('changed'),
    }),
    false,
  )
  assert.equal(await verifyWahaSignature({ ...input, secret: 'wrong' }), false)
  assert.equal(await verifyWahaSignature({ ...input, signature: null }), false)
  assert.equal(
    await verifyWahaSignature({ ...input, signature: 'z'.repeat(128) }),
    false,
  )
  assert.equal(
    await verifyWahaSignature({ ...input, algorithm: 'sha256' }),
    false,
  )
  assert.equal(
    await verifyWahaSignature({ ...input, secret: undefined }),
    false,
  )
})
