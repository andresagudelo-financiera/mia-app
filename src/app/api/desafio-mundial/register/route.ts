import { NextResponse } from 'next/server'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'
const GHL_NEW_LEAD_WEBHOOK_URL = process.env.GHL_NEW_LEAD_WEBHOOK_URL || ''

const REGISTER_USER = `
  mutation RegisterUser($name: String!, $email: String!, $phone: String, $baseCurrency: String, $password: String!, $toolName: String) {
    registerUser(name: $name, email: $email, phone: $phone, baseCurrency: $baseCurrency, password: $password, toolName: $toolName) {
      id
      name
      email
      phone
      registeredAt
    }
  }
`

const GET_USER = `
  query GetUser($email: String!) {
    user(email: $email) {
      id
      name
      email
      phone
      registeredAt
    }
  }
`

function generateInitialPassword(email: string): string {
  const base = email.split('@')[0].replace(/[^a-z0-9]/gi, '')
  const suffix = Math.random().toString(36).slice(2, 8)
  return `dm2030_${base}_${suffix}`
}

async function sendToGhl(payload: Record<string, unknown>) {
  if (!GHL_NEW_LEAD_WEBHOOK_URL) return
  try {
    await fetch(GHL_NEW_LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
  } catch {
    // fire and forget
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const name = String(body?.nombre || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    const phone = String(body?.telefono || '').trim() || null
    const pais = String(body?.pais || '').trim()
    const bandera = String(body?.bandera || '').trim()

    if (!name || !email || !email.includes('@')) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 })
    }

    const password = generateInitialPassword(email)

    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: REGISTER_USER,
        variables: { name, email, phone, baseCurrency: 'USD', password, toolName: 'desafio-mundial' },
      }),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => null)
    const userFromMutation = payload?.data?.registerUser ?? null

    // If already registered, try to fetch existing user
    let userId: string | null = userFromMutation?.id ?? null
    if (!userId && payload?.errors?.length) {
      const fetchResp = await fetch(MIA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: GET_USER, variables: { email } }),
        cache: 'no-store',
      })
      const fetchPayload = await fetchResp.json().catch(() => null)
      userId = fetchPayload?.data?.user?.id ?? null
    }

    await sendToGhl({
      miaUserId: userId,
      name,
      email,
      phone: phone || '',
      pais,
      bandera,
      simulator: 'desafio_mundial',
      toolName: 'desafio_mundial',
      source: 'desafio_mundial_signup',
      utm_source: 'desafio_mundial',
    })

    return NextResponse.json({ ok: true, userId })
  } catch (error) {
    console.error('Desafío Mundial register error:', error)
    return NextResponse.json({ ok: true, userId: null })
  }
}
