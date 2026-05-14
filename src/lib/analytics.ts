import type { AnalyticsEvent } from '@/types/rentabilidad'

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
    fbq: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

export function pushEvent(event: AnalyticsEvent, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV === 'test') return
  const safeParams = sanitizeAnalyticsParams(params)
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event, ...safeParams })

  if (typeof window.gtag === 'function') {
    window.gtag('event', event, safeParams)
  }
}

export function trackMetaEvent(event: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (typeof window.fbq !== 'function') return
  window.fbq('track', event, sanitizeAnalyticsParams(params))
}

function sanitizeAnalyticsParams(params?: Record<string, unknown>): Record<string, unknown> {
  if (!params) return {}

  const blockedKeys = new Set([
    'email',
    'phone',
    'name',
    'first_name',
    'last_name',
    'full_name',
    'password',
  ])

  return Object.fromEntries(
    Object.entries(params).filter(([key]) => !blockedKeys.has(key.toLowerCase())),
  )
}
