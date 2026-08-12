import { NextRequest, NextResponse } from 'next/server'
import { MIA_USER_TOKEN_COOKIE, getBearerTokenFromAuthorizationHeader } from '@/lib/mia-user-auth-cookie'

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

const MY_GOLDEN_NUMBER_V2_SNAPSHOT = `
  query MyGoldenNumberV2Snapshot {
    myGoldenNumberV2Snapshot
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

const CALCULATE_GOLDEN_NUMBER_V2 = `
  query CalculateGoldenNumberV2($input: JSONObject!) {
    calculateGoldenNumberV2(input: $input)
  }
`

const SAVE_GOLDEN_NUMBER_V2 = `
  mutation SaveGoldenNumberV2($input: JSONObject!, $status: String) {
    saveGoldenNumberV2(input: $input, status: $status) {
      ${RESPONSE_FIELDS}
    }
  }
`

const CALCULATE_ANTI_DEBT = `
  query CalculateAntiDebtSimulator($simulatorKey: String!, $input: JSONObject!) {
    calculateAntiDebtSimulator(simulatorKey: $simulatorKey, input: $input)
  }
`

const SAVE_ANTI_DEBT = `
  mutation SaveAntiDebtSimulator($userId: String!, $simulatorKey: String!, $input: JSONObject!) {
    saveAntiDebtSimulator(userId: $userId, simulatorKey: $simulatorKey, input: $input) {
      ${RESPONSE_FIELDS}
    }
  }
`

type GraphQLPayload<T> = {
  data?: T
  errors?: Array<{ message?: string }>
}

function getMiaUserToken(request: NextRequest) {
  return request.cookies.get(MIA_USER_TOKEN_COOKIE)?.value || getBearerTokenFromAuthorizationHeader(request.headers.get('authorization'))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const simulatorKey = searchParams.get('simulatorKey') || ''
  const token = getMiaUserToken(request)
  if (simulatorKey === 'numero-dorado-v2') {
    if (!token) return NextResponse.json({ error: 'Debes iniciar sesión para consultar tu Número Dorado.' }, { status: 401 })
    const payload = await proxyGraphQL<{ myGoldenNumberV2Snapshot: unknown }>(MY_GOLDEN_NUMBER_V2_SNAPSHOT, {}, token)
    if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: payload.status })
    return NextResponse.json({ simulatorResponse: payload.data?.myGoldenNumberV2Snapshot ?? null })
  }

  const userId = searchParams.get('userId') || ''
  if (!userId || !simulatorKey) return NextResponse.json({ error: 'userId y simulatorKey son requeridos.' }, { status: 400 })
  const payload = await proxyGraphQL<{ simulatorResponse: unknown }>(SIMULATOR_RESPONSE, { userId, simulatorKey })
  if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: payload.status })
  return NextResponse.json({ simulatorResponse: payload.data?.simulatorResponse ?? null })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const action = String(body?.action || '')
  const userId = String(body?.userId || '')
  const input = body?.input ?? {}
  const simulatorKey = String(body?.simulatorKey || '')
  const status = typeof body?.status === 'string' ? body.status : undefined

  if (!userId && !['calculateAntiDebtSimulator', 'calculateGoldenNumberV2', 'saveGoldenNumberV2'].includes(action)) {
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

  if (action === 'calculateGoldenNumberV2') {
    const payload = await proxyGraphQL<{ calculateGoldenNumberV2: unknown }>(CALCULATE_GOLDEN_NUMBER_V2, { input })
    if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: payload.status })
    return NextResponse.json({ result: payload.data?.calculateGoldenNumberV2 })
  }

  if (action === 'saveGoldenNumberV2') {
    const token = getMiaUserToken(request)
    if (!token) return NextResponse.json({ error: 'Debes iniciar sesión para guardar tu Número Dorado.' }, { status: 401 })
    const payload = await proxyGraphQL<{ saveGoldenNumberV2: unknown }>(SAVE_GOLDEN_NUMBER_V2, { input, status }, token)
    if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: payload.status })
    return NextResponse.json({ simulatorResponse: payload.data?.saveGoldenNumberV2 })
  }

  if (action === 'calculateAntiDebtSimulator') {
    if (!simulatorKey) return NextResponse.json({ error: 'simulatorKey es requerido.' }, { status: 400 })
    const payload = await proxyGraphQL<{ calculateAntiDebtSimulator: unknown }>(CALCULATE_ANTI_DEBT, { simulatorKey, input })
    if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: payload.status })
    return NextResponse.json({ result: payload.data?.calculateAntiDebtSimulator })
  }

  if (action === 'saveAntiDebtSimulator') {
    if (!simulatorKey) return NextResponse.json({ error: 'simulatorKey es requerido.' }, { status: 400 })
    const payload = await proxyGraphQL<{ saveAntiDebtSimulator: unknown }>(SAVE_ANTI_DEBT, { userId, simulatorKey, input })
    if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: payload.status })
    return NextResponse.json({ simulatorResponse: payload.data?.saveAntiDebtSimulator })
  }

  return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 })
}

async function proxyGraphQL<T>(query: string, variables: Record<string, unknown>, token?: string): Promise<
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }
> {
  try {
    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
