// Exchange Rate API Route — Proxy with 1h memory cache
import { NextResponse } from 'next/server'

interface CacheEntry {
  rates: Record<string, number>
  ts: number
}

let cache: CacheEntry | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json({
        rates: cache.rates,
        updatedAt: new Date(cache.ts).toISOString(),
        cached: true,
      })
    }

    // Fetch from ExchangeRate-API
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
      next: { revalidate: 0 },
    })
    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`)
    }

    const data = await response.json()

    if (data.result !== 'success' || !data.rates) {
      throw new Error('Invalid API response')
    }

    // Update cache
    cache = { rates: data.rates, ts: Date.now() }

    return NextResponse.json({
      rates: cache.rates,
      updatedAt: new Date(cache.ts).toISOString(),
      cached: false,
    })
  } catch {
    return NextResponse.json(
      { error: 'exchange_rate_unavailable' },
      { status: 503 }
    )
  }
}
