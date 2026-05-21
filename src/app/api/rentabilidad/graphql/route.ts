import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
}

type GraphQLBody = {
  query?: string
  variables?: Record<string, unknown>
  operationName?: string
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as GraphQLBody | null

  if (!body?.query) {
    return NextResponse.json({ errors: [{ message: 'Query GraphQL requerida.' }] }, { status: 400, headers: NO_STORE_HEADERS })
  }

  try {
    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      next: { revalidate: 0 },
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        payload || { errors: [{ message: `MIA API respondió ${response.status}` }] },
        { status: response.status, headers: NO_STORE_HEADERS },
      )
    }

    return NextResponse.json(payload, { headers: NO_STORE_HEADERS })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo conectar con MIA API.'
    return NextResponse.json(
      { errors: [{ message: `MIA API no disponible: ${message}` }] },
      { status: 502, headers: NO_STORE_HEADERS },
    )
  }
}
