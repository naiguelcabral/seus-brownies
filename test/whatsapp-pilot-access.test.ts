import { test } from 'node:test'
import assert from 'node:assert/strict'
import { authorizePilotSender } from '../src/features/whatsapp/pilot-access'

const members = [
  { phone: '+15550101234', authUserId: 'test-user-1', active: true },
  { phone: '+15550105678', authUserId: 'test-user-2', active: true },
] as const

test('only the two active, fully configured identities are accepted', () => {
  assert.equal(authorizePilotSender('+15550101234', members), 'test-user-1')
  assert.equal(authorizePilotSender('+15550105678', members), 'test-user-2')
  assert.equal(authorizePilotSender('+15550109999', members), null)
  assert.equal(authorizePilotSender('+15550101234', [members[0]]), null)
  assert.equal(
    authorizePilotSender('+15550101234', [members[0], members[0]]),
    null,
  )
  assert.equal(
    authorizePilotSender('+15550101234', [
      members[0],
      { ...members[1], authUserId: 'test-user-1' },
    ]),
    null,
  )
  assert.equal(
    authorizePilotSender('+15550101234', [
      { ...members[0], active: false },
      members[1],
    ]),
    null,
  )
})

test('sender identity must be canonical and configuration must be valid', () => {
  for (const sender of [
    '15550101234',
    '+1 555 010 1234',
    '+15550101234@c.us',
    '+15550101234@lid',
    '',
  ])
    assert.equal(authorizePilotSender(sender, members), null)
  assert.equal(
    authorizePilotSender('+15550101234', [
      members[0],
      { ...members[1], phone: 'bad' },
    ]),
    null,
  )
  assert.equal(
    authorizePilotSender('+15550101234', [
      members[0],
      { ...members[1], authUserId: ' ' },
    ]),
    null,
  )
})
