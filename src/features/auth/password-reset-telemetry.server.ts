import { telemetryRequestId } from './telemetry-request-id'

export const passwordResetTelemetryStages = [
  'runtime_config_missing',
  'initial_audit_failed',
  'provider_request_started',
  'provider_request_failed',
  'provider_request_succeeded',
  'final_audit_failed',
  'completed',
] as const

export type PasswordResetTelemetryStage =
  (typeof passwordResetTelemetryStages)[number]

export type PasswordResetTelemetryEvent = {
  requestId: string
  stage: PasswordResetTelemetryStage
  reasonCode?:
    'provider_timeout' | 'provider_network_error' | 'provider_http_error'
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
      console.info(
        JSON.stringify({
          event: 'auth.password-reset',
          level: 'info',
          requestId: telemetryRequestId(event.requestId),
          stage: event.stage,
          ...(reasonCode ? { reasonCode } : {}),
        }),
      )
    },
  }
}
