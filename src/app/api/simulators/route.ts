import { NextResponse } from 'next/server'
import { DEFAULT_PUBLIC_SIMULATORS } from '@/lib/simulator-catalog'

export const dynamic = 'force-dynamic'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'

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
  try {
    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: PUBLIC_SIMULATORS }),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || payload?.errors?.length) {
      return NextResponse.json({ simulators: DEFAULT_PUBLIC_SIMULATORS, source: 'fallback' })
    }

    return NextResponse.json({ simulators: payload?.data?.simulators || DEFAULT_PUBLIC_SIMULATORS, source: 'api' })
  } catch {
    return NextResponse.json({ simulators: DEFAULT_PUBLIC_SIMULATORS, source: 'fallback' })
  }
}
