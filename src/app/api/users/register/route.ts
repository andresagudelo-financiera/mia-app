import { NextResponse } from 'next/server'
import { setMiaUserAuthCookie } from '@/lib/mia-user-auth-cookie'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'
const N8N_LEAD_WEBHOOK_URL = process.env.N8N_LEAD_WEBHOOK_URL || process.env.MIA_N8N_LEAD_WEBHOOK_URL || ''

function normalizeSimulatorForWebhook(toolName: string) {
  return String(toolName || 'rentabilidad').trim().toLowerCase().replace(/-/g, '_')
}


function collectLeadAttribution(body: any, request: Request) {
  const attribution = body?.attribution && typeof body.attribution === 'object' ? body.attribution : {}
  const referer = request.headers.get('referer') || ''
  let refererParams: URLSearchParams | null = null

  try {
    refererParams = referer ? new URL(referer).searchParams : null
  } catch {
    refererParams = null
  }

  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = body?.[key] ?? attribution?.[key] ?? refererParams?.get(key)
      const text = toPlainText(value)
      if (text) return text
    }
    return ''
  }

  const utmSource = pick('utm_source', 'utmSource') || 'direct'

  return {
    utmSource,
    utmMedium: pick('utm_medium', 'utmMedium'),
    utmCampaign: pick('utm_campaign', 'utmCampaign'),
    utmContent: pick('utm_content', 'utmContent'),
    utmTerm: pick('utm_term', 'utmTerm'),
    utmId: pick('utm_id', 'utmId'),
    gclid: pick('gclid'),
    fbclid: pick('fbclid'),
    ttclid: pick('ttclid'),
    msclkid: pick('msclkid'),
    referrer: toPlainText(body?.referrer ?? attribution?.referrer ?? request.headers.get('referer')),
    landingPage: toPlainText(body?.landing_page ?? body?.landingPage ?? attribution?.landingPage ?? referer),
  }
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

function getGraphQLErrorMessage(payload: any, fallback: string) {
  const error = payload?.errors?.[0]
  const validationErrors = error?.extensions?.validation
  const originalMessage = error?.extensions?.originalError?.message

  if (validationErrors && typeof validationErrors === 'object') {
    const firstValidation = Object.values(validationErrors).flat().find(Boolean)
    if (firstValidation) return String(firstValidation)
  }

  if (Array.isArray(originalMessage)) {
    const firstMessage = originalMessage.find(Boolean)
    if (firstMessage) return String(firstMessage)
  }

  if (typeof originalMessage === 'string' && originalMessage.trim()) {
    return originalMessage.trim()
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim()
  }

  return fallback
}

type LeadAttributionInput = {
  utmSource?: unknown
  utmMedium?: unknown
  utmCampaign?: unknown
  utmContent?: unknown
  utmTerm?: unknown
  utmId?: unknown
  gclid?: unknown
  fbclid?: unknown
  ttclid?: unknown
  msclkid?: unknown
  referrer?: unknown
  landingPage?: unknown
}

async function sendLeadToN8n(input: {
  id?: string
  name?: string | null
  email: string
  phone?: string | null
  toolName: string
} & LeadAttributionInput) {
  if (!N8N_LEAD_WEBHOOK_URL) return { attempted: false, ok: false, reason: 'missing_webhook_url' }

  const nameParts = splitFullName(input.name || '')
  const simulator = normalizeSimulatorForWebhook(input.toolName)
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
    utm_id: toPlainText(input.utmId),
    gclid: toPlainText(input.gclid),
    fbclid: toPlainText(input.fbclid),
    ttclid: toPlainText(input.ttclid),
    msclkid: toPlainText(input.msclkid),
    referrer: toPlainText(input.referrer),
    landing_page: toPlainText(input.landingPage),
    source: 'mia_registration',
  }

  try {
    const response = await fetch(N8N_LEAD_WEBHOOK_URL, {
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
      console.error('n8n lead webhook returned non-OK:', result)
    } else {
      console.info('n8n lead webhook sent:', { attempted: true, ok: true, status: response.status, email: input.email, fullName: payload.fullName, simulator: payload.simulator })
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
    console.error('n8n lead webhook failed:', result)
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
      authToken
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
    const attribution = collectLeadAttribution(body, request)

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
      const message = getGraphQLErrorMessage(payload, 'No se pudo crear la cuenta.')
      return NextResponse.json(
        { user: null, error: message },
        { status: response.ok ? 400 : response.status },
      )
    }

    let user = payload?.data?.registerUser ?? null
    const authToken = user?.authToken ?? null

    if (user?.email) {
      const refreshResponse = await fetch(MIA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: GET_USER, variables: { email: user.email } }),
        cache: 'no-store',
      })
      const refreshPayload = await refreshResponse.json().catch(() => null)
      user = refreshPayload?.data?.user ? { ...refreshPayload.data.user, authToken } : user
    }

    const n8nLeadSync = user?.id && user?.email
      ? await sendLeadToN8n({
          id: user.id,
          name: user.name || name,
          email: user.email,
          phone: user.phone || phone,
          toolName,
          ...attribution,
        })
      : { attempted: false, ok: false, reason: 'missing_user' }

    return setMiaUserAuthCookie(NextResponse.json({ user, n8nLeadSync }), user?.authToken)
  } catch (error) {
    console.error('User registration failed:', error)
    return NextResponse.json({ user: null, error: 'No se pudo crear la cuenta.' }, { status: 500 })
  }
}
