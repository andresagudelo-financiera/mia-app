import { NextResponse } from 'next/server'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'
const GHL_NEW_LEAD_WEBHOOK_URL = process.env.GHL_NEW_LEAD_WEBHOOK_URL || 'https://services.leadconnectorhq.com/hooks/vEh7JAwgMFnBubxjOxId/webhook-trigger/c1bb7b96-3a2c-43fb-bca2-d46dd897edd7'

function normalizeSimulatorForGhl(toolName: string) {
  return String(toolName || 'rentabilidad').trim().toLowerCase().replace(/-/g, '_')
}

function splitFullName(name: string) {
  const normalizedName = String(name || '').trim().replace(/\s+/g, ' ')
  const [firstName = '', ...lastNameParts] = normalizedName.split(' ')

  return {
    fullName: normalizedName,
    firstName,
    lastName: lastNameParts.join(' '),
  }
}

function toPlainText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const objectValue = record.value ?? record.name ?? record.label ?? record.text ?? record.id
    if (objectValue !== undefined && objectValue !== value) {
      return toPlainText(objectValue, fallback)
    }
  }
  return fallback
}

type GhlUtmInput = {
  utmSource?: unknown
  utmMedium?: unknown
  utmCampaign?: unknown
  utmContent?: unknown
  utmTerm?: unknown
}

async function sendNewLeadToGhl(input: {
  id?: string
  name?: string | null
  email: string
  phone?: string | null
  toolName: string
} & GhlUtmInput) {
  if (!GHL_NEW_LEAD_WEBHOOK_URL) return { attempted: false, ok: false, reason: 'missing_webhook_url' }

  const nameParts = splitFullName(input.name || '')
  const simulator = normalizeSimulatorForGhl(input.toolName)
  const payload = {
    miaUserId: input.id,
    name: nameParts.fullName,
    fullName: nameParts.fullName,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email: input.email,
    phone: input.phone || '',
    simulator,
    toolName: simulator,
    utm_source: toPlainText(input.utmSource, 'direct'),
    utm_medium: toPlainText(input.utmMedium),
    utm_campaign: toPlainText(input.utmCampaign),
    utm_content: toPlainText(input.utmContent),
    utm_term: toPlainText(input.utmTerm),
    source: 'mia_registration',
  }

  try {
    const response = await fetch(GHL_NEW_LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })

    const responseText = await response.text().catch(() => '')
    const result = {
      attempted: true,
      ok: response.ok,
      status: response.status,
      simulator: payload.simulator,
      utm_source: payload.utm_source,
      utm_campaign: payload.utm_campaign,
      response: responseText.slice(0, 500),
    }

    if (!response.ok) {
      console.error('GHL new lead webhook returned non-OK:', result)
    } else {
      console.info('GHL new lead webhook sent:', { attempted: true, ok: true, status: response.status, email: input.email, fullName: payload.fullName, simulator: payload.simulator })
    }

    return result
  } catch (error) {
    const result = {
      attempted: true,
      ok: false,
      status: null,
      simulator: payload.simulator,
      error: error instanceof Error ? error.message : 'unknown_error',
    }
    console.error('GHL new lead webhook failed:', result)
    return result
  }
}

const REGISTER_USER = `
  mutation RegisterUser($name: String!, $email: String!, $phone: String, $baseCurrency: String, $password: String!, $toolName: String) {
    registerUser(name: $name, email: $email, phone: $phone, baseCurrency: $baseCurrency, password: $password, toolName: $toolName) {
      id
      name
      email
      phone
      baseCurrency
      registeredAt
      hasCompletedOnboarding
      accesses {
        id
        toolName
        status
        accessType
        expiresAt
        usageCount
      }
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
      baseCurrency
      registeredAt
      hasCompletedOnboarding
      accesses {
        id
        toolName
        status
        accessType
        expiresAt
        usageCount
      }
    }
  }
`

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const name = toPlainText(body?.name).trim()
    const email = toPlainText(body?.email).trim().toLowerCase()
    const phone = body?.phone ? toPlainText(body.phone).trim() : null
    const baseCurrency = toPlainText(body?.baseCurrency, 'COP').trim() || 'COP'
    const password = toPlainText(body?.password)
    const toolName = toPlainText(body?.toolName, 'rentabilidad').trim().toLowerCase()
    const utmSource = body?.utm_source ?? body?.utmSource ?? null
    const utmMedium = body?.utm_medium ?? body?.utmMedium ?? null
    const utmCampaign = body?.utm_campaign ?? body?.utmCampaign ?? null
    const utmContent = body?.utm_content ?? body?.utmContent ?? null
    const utmTerm = body?.utm_term ?? body?.utmTerm ?? null

    if (!name || !email || !email.includes('@') || !password) {
      return NextResponse.json({ user: null, error: 'Datos de registro incompletos.' }, { status: 400 })
    }

    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: REGISTER_USER, variables: { name, email, phone, baseCurrency, password, toolName } }),
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok || payload?.errors?.length) {
      return NextResponse.json(
        { user: null, error: payload?.errors?.[0]?.message || 'No se pudo crear la cuenta.' },
        { status: response.ok ? 502 : response.status },
      )
    }

    let user = payload?.data?.registerUser ?? null

    if (user?.email) {
      const refreshResponse = await fetch(MIA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: GET_USER, variables: { email: user.email } }),
        cache: 'no-store',
      })
      const refreshPayload = await refreshResponse.json().catch(() => null)
      user = refreshPayload?.data?.user || user
    }

    const ghlLeadSync = user?.id && user?.email
      ? await sendNewLeadToGhl({
          id: user.id,
          name: user.name || name,
          email: user.email,
          phone: user.phone || phone,
          toolName,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
        })
      : { attempted: false, ok: false, reason: 'missing_user' }

    return NextResponse.json({ user, ghlLeadSync })
  } catch (error) {
    console.error('User registration failed:', error)
    return NextResponse.json({ user: null, error: 'No se pudo crear la cuenta.' }, { status: 500 })
  }
}
