import { useEffect, useRef, useCallback } from 'react'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

// Returns true if Turnstile is configured
export function isTurnstileEnabled() {
  return !!SITE_KEY
}

let scriptLoaded = false
let scriptLoading = false
const callbacks = []

function loadTurnstileScript(onLoad) {
  if (scriptLoaded) {
    onLoad()
    return
  }
  callbacks.push(onLoad)
  if (scriptLoading) return
  scriptLoading = true

  window.__turnstileOnLoad = () => {
    scriptLoaded = true
    scriptLoading = false
    callbacks.forEach((cb) => cb())
    callbacks.length = 0
  }

  const script = document.createElement('script')
  script.src = 'https://challenges.cloudflare.com/turnstile/v1/api.js?onload=__turnstileOnLoad'
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

export default function TurnstileWidget({ onVerify, onExpire, theme = 'dark' }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return
    if (widgetIdRef.current !== null) return

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme,
      callback: (token) => {
        if (onVerify) onVerify(token)
      },
      'expired-callback': () => {
        if (onExpire) onExpire()
      },
      'error-callback': () => {
        if (onExpire) onExpire()
      },
    })
  }, [onVerify, onExpire, theme])

  useEffect(() => {
    if (!SITE_KEY) return

    if (window.turnstile) {
      renderWidget()
    } else {
      loadTurnstileScript(renderWidget)
    }

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore
        }
        widgetIdRef.current = null
      }
    }
  }, [renderWidget])

  if (!SITE_KEY) return null

  return <div ref={containerRef} className="mt-2" />
}
