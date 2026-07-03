'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function UtmTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!searchParams) return

    const utmSource = searchParams.get('utm_source')
    const utmMedium = searchParams.get('utm_medium')
    const utmCampaign = searchParams.get('utm_campaign')
    const utmContent = searchParams.get('utm_content')
    const utmTerm = searchParams.get('utm_term')

    // Si detectamos al menos utm_source o utm_campaign, los guardamos (o sobreescribimos los viejos)
    if (utmSource || utmCampaign) {
      if (utmSource) localStorage.setItem('mia_utm_source', utmSource)
      if (utmMedium) localStorage.setItem('mia_utm_medium', utmMedium)
      if (utmCampaign) localStorage.setItem('mia_utm_campaign', utmCampaign)
      if (utmContent) localStorage.setItem('mia_utm_content', utmContent)
      if (utmTerm) localStorage.setItem('mia_utm_term', utmTerm)
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
