'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const TRACKING_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
  'gclid',
  'fbclid',
  'ttclid',
  'msclkid',
] as const

function UtmTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!searchParams) return

    let hasTracking = false

    TRACKING_KEYS.forEach(key => {
      const value = searchParams.get(key)
      if (value) {
        localStorage.setItem(`mia_${key}`, value)
        hasTracking = true
      }
    })

    if (hasTracking) {
      localStorage.setItem('mia_landing_page', window.location.href)
      if (document.referrer) localStorage.setItem('mia_referrer', document.referrer)
    }
  }, [searchParams])

  return null
}

export default function UtmProvider() {
  return (
    <Suspense fallback={null}>
      <UtmTracker />
    </Suspense>
  )
}
