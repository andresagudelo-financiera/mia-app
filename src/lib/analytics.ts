import type { AnalyticsEvent } from '@/types/rentabilidad'

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
    fbq: (...args: unknown[]) => void
  }
}

export function pushEvent(event: AnalyticsEvent, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV === 'test') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event, ...params })
}

export function trackMetaEvent(event: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (typeof window.fbq !== 'function') return
  window.fbq('track', event, params)
}
