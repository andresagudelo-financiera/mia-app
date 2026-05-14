'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export default function AnalyticsPageView({ gaMeasurementId }: { gaMeasurementId?: string }) {
  return (
    <Suspense fallback={null}>
      <PageViewTracker gaMeasurementId={gaMeasurementId} />
    </Suspense>
  )
}

function PageViewTracker({ gaMeasurementId }: { gaMeasurementId?: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!gaMeasurementId) return
    if (typeof window === 'undefined') return
    if (typeof window.gtag !== 'function') return

    const queryString = searchParams.toString()
    const pagePath = queryString ? `${pathname}?${queryString}` : pathname

    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
      send_to: gaMeasurementId,
    })
  }, [gaMeasurementId, pathname, searchParams])

  return null
}
