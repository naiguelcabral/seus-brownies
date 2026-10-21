import assert from 'node:assert/strict'
import test from 'node:test'

import { reportNeonAuthDestination } from '../src/features/auth/destination-diagnostic.server'

const now = Date.parse('2026-10-17T20:00:00Z')
const configured = {
  AUTH_DESTINATION_DIAGNOSTIC_ENABLED: 'true',
  AUTH_DESTINATION_DIAGNOSTIC_UNTIL: '2026-10-17T20:30:00Z',
  AUTH_DESTINATION_EXPECTED_BASE_URL:
    'https://expected.example.test/neondb/auth',
  NEON_AUTH_BASE_URL: ' https://expected.example.test/neondb/auth/ ',
}

test('diagnóstico expõe apenas evento fixo e comparação booleana', () => {
  const events: unknown[] = []
  const emit = (event: unknown) => events.push(event)
  reportNeonAuthDestination(configured, { now, emit })
  for (const actual of [
    'https://other.example.test/neondb/auth',
    'https://expected.example.test/other/auth',
    'https://secret:canary@expected.example.test/neondb/auth',
    'https://expected.example.test/neondb/auth?secret=canary',
    'https://expected.example.test/neondb/auth#canary',
    'http://expected.example.test/neondb/auth',
    'canary-invalid',
    '',
  ]) {
    reportNeonAuthDestination(
      { ...configured, NEON_AUTH_BASE_URL: actual },
      { now, emit },
    )
  }
  assert.deepEqual(events, [
    { event: 'auth.destination-diagnostic', matchesExpected: true },
    ...Array.from({ length: 8 }, () => ({
      event: 'auth.destination-diagnostic',
      matchesExpected: false,
    })),
  ])
  assert.doesNotMatch(JSON.stringify(events), /canary|https|secret|example/)
})

test('diagnóstico exige ativação explícita, destino válido e janela de até 30 minutos', () => {
  const events: unknown[] = []
  const emit = (event: unknown) => events.push(event)
  for (const environment of [
    {},
    { ...configured, AUTH_DESTINATION_DIAGNOSTIC_ENABLED: 'false' },
    { ...configured, AUTH_DESTINATION_DIAGNOSTIC_UNTIL: '' },
    {
      ...configured,
      AUTH_DESTINATION_DIAGNOSTIC_UNTIL: '2026-10-17T20:00:00Z',
    },
    {
      ...configured,
      AUTH_DESTINATION_DIAGNOSTIC_UNTIL: '2026-10-17T20:30:01Z',
    },
    { ...configured, AUTH_DESTINATION_EXPECTED_BASE_URL: 'invalid' },
  ]) {
    reportNeonAuthDestination(environment, { now, emit })
  }
  assert.deepEqual(events, [])
})

test('falha do logger não interrompe autenticação', () => {
  assert.doesNotThrow(() =>
    reportNeonAuthDestination(configured, {
      now,
      emit: () => {
        throw new Error('synthetic logger failure')
      },
    }),
  )
})
