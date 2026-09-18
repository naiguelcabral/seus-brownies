import { useEffect, useRef } from 'react'

import { getTurnstileChallengeState } from './turnstile-client'

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'error-callback': () => void
      'expired-callback': () => void
    },
  ) => string
  remove?: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let turnstileScript: Promise<TurnstileApi> | null = null

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (turnstileScript) return turnstileScript

  turnstileScript = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile)
      else reject(new Error('Turnstile indisponível'))
    }
    script.onerror = () => reject(new Error('Turnstile indisponível'))
    document.head.append(script)
  })

  return turnstileScript
}

export function TurnstileChallenge({
  onToken,
  resetKey,
  requiresChallenge,
  siteKey,
}: {
  onToken: (token: string | null) => void
  resetKey?: number
  requiresChallenge: boolean
  siteKey: string | undefined
}) {
  const container = useRef<HTMLDivElement>(null)
  const state = getTurnstileChallengeState(requiresChallenge, siteKey)

  useEffect(() => {
    if (!state.canRenderWidget || !container.current || !siteKey) return

    let disposed = false
    let widgetId: string | null = null
    onToken(null)

    void loadTurnstileScript()
      .then((turnstile) => {
        if (disposed || !container.current) return
        widgetId = turnstile.render(container.current, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          'error-callback': () => onToken(null),
          'expired-callback': () => onToken(null),
        })
      })
      .catch(() => onToken(null))

    return () => {
      disposed = true
      if (widgetId) window.turnstile?.remove?.(widgetId)
    }
  }, [onToken, resetKey, siteKey, state.canRenderWidget])

  if (!state.requiresChallenge) return null
  if (!state.canRenderWidget) {
    return (
      <p
        className="rounded-lg bg-[#fff5ed] p-3 text-sm text-[#75411f]"
        data-testid="turnstile-unavailable"
      >
        A verificação adicional não está disponível. Tente novamente mais tarde.
      </p>
    )
  }

  return <div aria-label="Verificação adicional" ref={container} />
}
