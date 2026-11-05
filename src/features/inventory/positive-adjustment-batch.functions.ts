import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { requireServerFunctionPermission } from '../auth/server-function-middleware'
import {
  positiveAdjustmentBatchSchema,
  parsePositiveAdjustmentBatch,
} from './positive-adjustment-batch'

/** Read-only POST keeps commercial payloads out of query strings. */
export const checkPositiveAdjustmentBatch = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('checkPositiveAdjustmentBatch')])
  .validator(positiveAdjustmentBatchSchema)
  .handler(async ({ data }) => {
    const batch = parsePositiveAdjustmentBatch(
      JSON.stringify(data),
      new URL(getRequest().url).origin,
    )
    const { readPositiveAdjustmentBatch } =
      await import('./positive-adjustment-batch.server')
    const { getDb } = await import('#/db/index')
    return readPositiveAdjustmentBatch(getDb(), batch)
  })
