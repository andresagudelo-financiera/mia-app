import { NextResponse } from 'next/server'
import { DEFAULT_PUBLIC_SIMULATORS } from '@/lib/simulator-catalog'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
}

const PUBLIC_SIMULATORS = `
  query PublicSimulators {
    simulators {
      id
      key
      name
      description
      status
      accessType
      demoDays
      updatedAt
    }
  }
`

export async function GET() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: PUBLIC_SIMULATORS }),
      cache: 'no-store',
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || payload?.errors?.length) {
      return NextResponse.json({ simulators: DEFAULT_PUBLIC_SIMULATORS, source: 'fallback' }, { headers: NO_STORE_HEADERS })
    }

    return NextResponse.json({ simulators: payload?.data?.simulators || DEFAULT_PUBLIC_SIMULATORS, source: 'api' }, { headers: NO_STORE_HEADERS })
  } catch {
    return NextResponse.json({ simulators: DEFAULT_PUBLIC_SIMULATORS, source: 'fallback' }, { headers: NO_STORE_HEADERS })
  } finally {
    clearTimeout(timeout)
  }
}
