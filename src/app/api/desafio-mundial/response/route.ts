import { NextRequest, NextResponse } from 'next/server'
import { MIA_USER_TOKEN_COOKIE, getBearerTokenFromAuthorizationHeader } from '@/lib/mia-user-auth-cookie'

export const dynamic = 'force-dynamic'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'

const REGISTER_PARTICIPANT = `
  mutation RegisterWorldCupChallenge($userId: String!, $displayName: String!, $country: String!, $phone: String) {
    registerWorldCupChallenge(userId: $userId, displayName: $displayName, country: $country, phone: $phone) {
      id
      userId
      displayName
      country
      phone
      createdAt
    }
  }
`

const LOG_SAVING = `
  mutation LogWorldCupSaving($userId: String!, $amount: Float!, $date: String!, $currency: String) {
    logWorldCupSaving(userId: $userId, amount: $amount, date: $date, currency: $currency) {
      id
      amount
      currency
      date
      createdAt
    }
  }
`

const DELETE_SAVING = `
  mutation DeleteWorldCupSaving($userId: String!, $id: String!) {
    deleteWorldCupSaving(userId: $userId, id: $id)
  }
`

const GET_DASHBOARD = `
  query MyWorldCupDashboard($userId: String!) {
    myWorldCupDashboard(userId: $userId) {
      participant {
        id
        userId
        displayName
        country
        phone
      }
      savings {
        id
        amount
        currency
        date
        createdAt
      }
      totalSaved
      savingsCount
      daysRemaining
      isRegistered
    }
  }
`

type GraphQLPayload<T> = {
  data?: T
  errors?: Array<{ message?: string }>
}

function getMiaUserToken(request: NextRequest) {
  return (
    request.cookies.get(MIA_USER_TOKEN_COOKIE)?.value ||
    getBearerTokenFromAuthorizationHeader(request.headers.get('authorization'))
  )
}

export async function GET(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_ENABLE_WORLD_CUP_CHALLENGE !== 'true') {
    return NextResponse.json({ error: 'El Desafío Mundial no está habilitado.' }, { status: 403 })
  }

  const token = getMiaUserToken(request)
  if (!token) {
    return NextResponse.json({ error: 'Debes iniciar sesión para consultar el Desafío Mundial.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || ''

  if (!userId) {
    return NextResponse.json({ error: 'userId es requerido.' }, { status: 400 })
  }

  const payload = await proxyGraphQL<{ myWorldCupDashboard: unknown }>(GET_DASHBOARD, { userId }, token)

  if (!payload.ok) {
    return NextResponse.json({ error: payload.error }, { status: payload.status })
  }

  return NextResponse.json({ dashboard: payload.data?.myWorldCupDashboard ?? null })
}

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_ENABLE_WORLD_CUP_CHALLENGE !== 'true') {
    return NextResponse.json({ error: 'El Desafío Mundial no está habilitado.' }, { status: 403 })
  }

  const token = getMiaUserToken(request)
  if (!token) {
    return NextResponse.json({ error: 'Debes iniciar sesión para modificar el Desafío Mundial.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const action = String(body?.action || '')
  const userId = String(body?.userId || '')

  if (!userId) {
    return NextResponse.json({ error: 'userId es requerido.' }, { status: 400 })
  }

  if (action === 'register') {
    const displayName = String(body?.displayName || '')
    const country = String(body?.country || '')
    const phone = body?.phone ? String(body.phone) : null
    
    const payload = await proxyGraphQL<{ registerWorldCupChallenge: unknown }>(REGISTER_PARTICIPANT, { userId, displayName, country, phone }, token)
    if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: payload.status })
    return NextResponse.json({ participant: payload.data?.registerWorldCupChallenge })
  }

  if (action === 'logSaving') {
    const amount = Number(body?.amount || 0)
    const date = String(body?.date || '')
    const currency = String(body?.currency || 'COP')

    const payload = await proxyGraphQL<{ logWorldCupSaving: unknown }>(LOG_SAVING, { userId, amount, date, currency }, token)
    if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: payload.status })
    return NextResponse.json({ saving: payload.data?.logWorldCupSaving })
  }

  if (action === 'deleteSaving') {
    const id = String(body?.id || '')

    const payload = await proxyGraphQL<{ deleteWorldCupSaving: boolean }>(DELETE_SAVING, { userId, id }, token)
    if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: payload.status })
    return NextResponse.json({ success: payload.data?.deleteWorldCupSaving })
  }

  return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 })
}

async function proxyGraphQL<T>(query: string, variables: Record<string, unknown>, token: string): Promise<
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }
> {
  try {
    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
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
  } catch (error) {
    return {
      ok: false,
      status: 503,
      error: 'MIA API no está disponible.',
    }
  }
}
