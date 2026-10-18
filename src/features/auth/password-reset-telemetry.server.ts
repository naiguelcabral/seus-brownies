import { telemetryRequestId } from './telemetry-request-id'

const auditErrorCodes = [
  '42P01',
  '42703',
  '42501',
  '28P01',
  '3D000',
  '23502',
  '23503',
  '23505',
  '23514',
  '22P02',
  '08001',
  '08006',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
] as const

type AuditErrorCode = (typeof auditErrorCodes)[number]

/** Reads only known codes, including wrapped driver errors; never messages or SQL. */
export function readAuditErrorCode(error: unknown): AuditErrorCode | undefined {
  let current = error
  for (let depth = 0; depth < 5; depth++) {
    if (!current || typeof current !== 'object') return undefined
    const candidate = 'code' in current ? current.code : undefined
    const code = auditErrorCodes.find((allowed) => allowed === candidate)
    if (code) return code
    current = 'cause' in current ? current.cause : undefined
  }
  return undefined
}

const passwordResetTelemetryStages = [
  'runtime_config_missing',
  'initial_audit_failed',
  'provider_request_started',
  'provider_request_failed',
  'provider_request_succeeded',
  'final_audit_failed',
  'completed',
] as const

type PasswordResetTelemetryStage = (typeof passwordResetTelemetryStages)[number]

export type PasswordResetTelemetryEvent = {
  requestId: string
  stage: PasswordResetTelemetryStage
  auditErrorCode?: AuditErrorCode
  reasonCode?:
    | 'provider_timeout'
    | 'provider_network_error'
    | 'provider_http_error'
}

export type PasswordResetTelemetry = {
  emit: (event: PasswordResetTelemetryEvent) => void
}

/**
 * Emits only an allowlisted lifecycle record. Request credentials, upstream
 * errors and runtime configuration values deliberately have no representation.
 */
export function createPasswordResetTelemetry(): PasswordResetTelemetry {
  return {
    emit: (event) => {
      if (!passwordResetTelemetryStages.includes(event.stage)) return
      const reasonCode = [
        'provider_timeout',
        'provider_network_error',
        'provider_http_error',
      ].includes(event.reasonCode ?? '')
        ? event.reasonCode
        : undefined
      const auditErrorCode = auditErrorCodes.find(
        (code) => code === event.auditErrorCode,
      )
      console.info(
        JSON.stringify({
          event: 'auth.password-reset',
          level: 'info',
          requestId: telemetryRequestId(event.requestId),
          stage: event.stage,
          ...(reasonCode ? { reasonCode } : {}),
          ...(auditErrorCode ? { auditErrorCode } : {}),
        }),
      )
    },
  }
}
