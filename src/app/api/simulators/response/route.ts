import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'

const RESPONSE_FIELDS = `
  id
  userId
  simulatorKey
  input
  result
  status
  completedAt
  createdAt
  updatedAt
`

const SIMULATOR_RESPONSE = `
  query SimulatorResponse($userId: String!, $simulatorKey: String!) {
    simulatorResponse(userId: $userId, simulatorKey: $simulatorKey) {
      ${RESPONSE_FIELDS}
    }
  }
`

const SAVE_RISK_PROFILE = `
  mutation SaveRiskProfile($userId: String!, $input: JSONObject!) {
    saveRiskProfile(userId: $userId, input: $input) {
      ${RESPONSE_FIELDS}
    }
  }
`

const SAVE_GOLDEN_NUMBER = `
  mutation SaveGoldenNumber($userId: String!, $input: JSONObject!) {
    saveGoldenNumber(userId: $userId, input: $input) {
      ${RESPONSE_FIELDS}
    }
  }
`

type GraphQLPayload<T> = {
  data?: T
  errors?: Array<{ message?: string }>
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || ''
  const simulatorKey = searchParams.get('simulatorKey') || ''

  if (!userId || !simulatorKey) {
    return NextResponse.json({ error: 'userId y simulatorKey son requeridos.' }, { status: 400 })
  }

  const payload = await proxyGraphQL<{ simulatorResponse: unknown }>(SIMULATOR_RESPONSE, { userId, simulatorKey })

  if (!payload.ok) {
    return NextResponse.json({ error: payload.error }, { status: payload.status })
  }

  return NextResponse.json({ simulatorResponse: payload.data?.simulatorResponse ?? null })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const action = String(body?.action || '')
  const userId = String(body?.userId || '')
  const input = body?.input ?? {}

  if (!userId) {
    return NextResponse.json({ error: 'userId es requerido.' }, { status: 400 })
  }

  if (action === 'saveRiskProfile') {
    const payload = await proxyGraphQL<{ saveRiskProfile: unknown }>(SAVE_RISK_PROFILE, { userId, input })
    if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: payload.status })
    return NextResponse.json({ simulatorResponse: payload.data?.saveRiskProfile })
  }

  if (action === 'saveGoldenNumber') {
    const payload = await proxyGraphQL<{ saveGoldenNumber: unknown }>(SAVE_GOLDEN_NUMBER, { userId, input })
    if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: payload.status })
    return NextResponse.json({ simulatorResponse: payload.data?.saveGoldenNumber })
  }

  return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 })
}

async function proxyGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }
> {
  try {
    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as GraphQLPayload<T> | null

    if (!response.ok || payload?.errors?.length || !payload?.data) {
      return {
        ok: false,
        status: response.ok ? 502 : response.status,
        error: payload?.errors?.[0]?.message || 'No se pudo conectar con MIA API.',
      }
    }

    return { ok: true, data: payload.data }
  } catch {
    return {
      ok: false,
      status: 503,
      error: 'MIA API no está disponible. Inicia el backend local en el puerto 4000 para guardar en la nube.',
    }
  }
}
