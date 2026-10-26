import { createServerFn } from '@tanstack/react-start'

import { requireServerFunctionPermission } from './server-function-middleware'
import { assertPrincipalPermission } from './principal'
import {
  registrationApprovalInput,
  registrationLookupInput,
  RegistrationApprovalError,
} from './registration-approval'

function approvalMessage(error: unknown) {
  return error instanceof RegistrationApprovalError
    ? error.message
    : 'Não foi possível concluir a aprovação. Verifique os dados e tente novamente.'
}

export const findRegistrationCandidate = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('findRegistrationCandidate')])
  .validator(registrationLookupInput)
  .handler(async ({ context, data }) => {
    try {
      const { getDb } = await import('#/db/index')
      const { createRegistrationDirectory } =
        await import('./registration-directory.server')
      const service = await import('./registration-approval.server')
      const candidate = await service.findRegistrationCandidate(
        getDb(),
        createRegistrationDirectory(process.env),
        assertPrincipalPermission(context.principal, 'access:approve'),
        data.email,
      )
      return { ok: true as const, candidate }
    } catch (error) {
      return { ok: false as const, message: approvalMessage(error) }
    }
  })

export const approveRegistration = createServerFn({ method: 'POST' })
  .middleware([requireServerFunctionPermission('approveRegistration')])
  .validator(registrationApprovalInput)
  .handler(async ({ context, data }) => {
    try {
      const { getDb } = await import('#/db/index')
      const { createRegistrationDirectory } =
        await import('./registration-directory.server')
      const service = await import('./registration-approval.server')
      const result = await service.approveRegistration(
        getDb(),
        createRegistrationDirectory(process.env),
        assertPrincipalPermission(context.principal, 'access:approve'),
        data,
      )
      return { ok: true as const, ...result }
    } catch (error) {
      return { ok: false as const, message: approvalMessage(error) }
    }
  })
