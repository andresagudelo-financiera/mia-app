import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const dynamic = 'force-dynamic'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'

type GraphQLBody = {
  query?: string
  variables?: Record<string, unknown>
}

async function callMiaApi(query: string, variables: Record<string, unknown> | undefined, token: string) {
  const response = await fetch(MIA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok || payload?.errors?.length) {
    const message = payload?.errors?.[0]?.message || `HTTP ${response.status}`
    throw new Error(message)
  }

  return payload?.data ?? {}
}

export async function POST(request: NextRequest) {
  const jwtToken = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (!jwtToken?.adminToken) {
    return NextResponse.json(
      { errors: [{ message: 'No autorizado', code: 'UNAUTHORIZED' }] },
      { status: 401 },
    )
  }

  const body = (await request.json().catch(() => null)) as GraphQLBody | null

  if (!body?.query) {
    return NextResponse.json({ errors: [{ message: 'Query GraphQL requerida' }] }, { status: 400 })
  }

  try {
    const data = await callMiaApi(body.query, body.variables, String(jwtToken.adminToken))
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error consultando MIA API'
    return NextResponse.json({ errors: [{ message }] }, { status: 502 })
  }
}
