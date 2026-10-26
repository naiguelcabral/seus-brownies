import assert from 'node:assert/strict'
import test from 'node:test'

import { createDatabaseScope } from '../src/db/scope.server'

test('database opens lazily, reuses within nested operations and awaits close', async () => {
  const events: string[] = []
  const database = { identity: 'one' }
  const scope = createDatabaseScope(() => {
    events.push('open')
    return {
      database,
      close: async () => {
        await Promise.resolve()
        events.push('close')
      },
    }
  })
  await scope.run(async () => {})
  assert.deepEqual(events, [])
  assert.throws(() => scope.getDb(), /active operation scope/)
  assert.equal(
    await scope.run(async () => {
      assert.equal(scope.getDb(), database)
      await scope.run(async () => assert.equal(scope.getDb(), database))
      assert.deepEqual(events, ['open'])
      return 42
    }),
    42,
  )
  assert.deepEqual(events, ['open', 'close'])
})

test('concurrent operations never share resources, even across awaits', async () => {
  let created = 0
  const closed: number[] = []
  const scope = createDatabaseScope(() => {
    const database = ++created
    return {
      database,
      close: async () => {
        closed.push(database)
      },
    }
  })
  const results = await Promise.all(
    [1, 2, 3].map(() =>
      scope.run(async () => {
        const original = scope.getDb()
        await new Promise<void>((resolve) => setImmediate(resolve))
        assert.equal(scope.getDb(), original)
        return original
      }),
    ),
  )
  assert.equal(new Set(results).size, 3)
  assert.deepEqual(closed.sort(), [1, 2, 3])
})

test('failure closes once, propagates and never reuses the failed operation', async () => {
  let closes = 0
  let opens = 0
  const scope = createDatabaseScope(() => ({
    database: ++opens,
    close: async () => {
      closes++
    },
  }))
  const error = new Error('synthetic transaction failure')
  await assert.rejects(
    scope.run(async () => {
      scope.getDb()
      throw error
    }),
    (value) => value === error,
  )
  assert.equal(closes, 1)
  assert.equal(await scope.run(async () => scope.getDb()), 2)
  assert.equal(closes, 2)
})

test('deferred work cannot reopen a completed operation or leak a connection', async () => {
  let lateRead: (() => unknown) | undefined
  const scope = createDatabaseScope(() => ({
    database: 1,
    close: async () => {},
  }))
  await scope.run(async () => {
    const { AsyncResource } = await import('node:async_hooks')
    lateRead = AsyncResource.bind(() => scope.getDb())
  })
  assert.ok(lateRead)
  assert.throws(lateRead, /active operation scope/)
})

test('open and close failures reject the operation instead of reporting success', async () => {
  const opening = createDatabaseScope(() => {
    throw new Error('open failed')
  })
  await assert.rejects(
    opening.run(async () => opening.getDb()),
    /open failed/,
  )
  const closing = createDatabaseScope(() => ({
    database: 1,
    close: async () => {
      throw new Error('close failed')
    },
  }))
  await assert.rejects(
    closing.run(async () => closing.getDb()),
    /close failed/,
  )
})
