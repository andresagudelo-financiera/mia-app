import { NextResponse } from 'next/server'
import { setMiaUserAuthCookie } from '@/lib/mia-user-auth-cookie'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'
const GHL_NEW_LEAD_WEBHOOK_URL = process.env.GHL_NEW_LEAD_WEBHOOK_URL || 'https://services.leadconnectorhq.com/hooks/vEh7JAwgMFnBubxjOxId/webhook-trigger/c1bb7b96-3a2c-43fb-bca2-d46dd897edd7'

const PROGRESSIVE_USER_ENTRY = `
  mutation ProgressiveUserEntry($email: String!, $phone: String!, $name: String, $baseCurrency: String, $toolName: String) {
    progressiveUserEntry(email: $email, phone: $phone, name: $name, baseCurrency: $baseCurrency, toolName: $toolName) {
      id
      name
      email
      phone
      baseCurrency
      registeredAt
      hasCompletedOnboarding
      hasPassword
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

function normalizeSimulatorForGhl(toolName: string) {
  return String(toolName || 'rentabilidad').trim().toLowerCase().replace(/-/g, '_')
}

function toPlainText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function splitFullName(name: string) {
  const normalizedName = String(name || '').trim().replace(/\s+/g, ' ')
  const [firstName = '', ...lastNameParts] = normalizedName.split(' ')
  return { fullName: normalizedName, firstName, lastName: lastNameParts.join(' ') }
}

function getGraphQLErrorMessage(payload: any, fallback: string) {
  const error = payload?.errors?.[0]
  const originalMessage = error?.extensions?.originalError?.message

  if (Array.isArray(originalMessage)) {
    const firstMessage = originalMessage.find(Boolean)
    if (firstMessage) return String(firstMessage)
  }

  if (typeof originalMessage === 'string' && originalMessage.trim()) return originalMessage.trim()
  if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim()
  return fallback
}

async function sendNewLeadToGhl(input: {
  id?: string
  name?: string | null
  email: string
  phone?: string | null
  toolName: string
  utmSource?: unknown
  utmMedium?: unknown
  utmCampaign?: unknown
  utmContent?: unknown
  utmTerm?: unknown
}) {
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
    source: 'mia_progressive_entry',
  }

  try {
    const response = await fetch(GHL_NEW_LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
    const responseText = await response.text().catch(() => '')
    return { attempted: true, ok: response.ok, status: response.status, simulator, response: responseText.slice(0, 500) }
  } catch (error) {
    return { attempted: true, ok: false, status: null, simulator, error: error instanceof Error ? error.message : 'unknown_error' }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const email = toPlainText(body?.email).trim().toLowerCase()
    const phone = toPlainText(body?.phone).trim()
    const name = toPlainText(body?.name).trim()
    const baseCurrency = toPlainText(body?.baseCurrency, 'COP').trim() || 'COP'
    const toolName = toPlainText(body?.toolName, 'rentabilidad').trim().toLowerCase()
    const utmSource = body?.utm_source ?? body?.utmSource ?? null
    const utmMedium = body?.utm_medium ?? body?.utmMedium ?? null
    const utmCampaign = body?.utm_campaign ?? body?.utmCampaign ?? null
    const utmContent = body?.utm_content ?? body?.utmContent ?? null
    const utmTerm = body?.utm_term ?? body?.utmTerm ?? null

    if (!email || !email.includes('@') || !phone) {
      return NextResponse.json({ user: null, error: 'Ingresa correo y WhatsApp para continuar.' }, { status: 400 })
    }

    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: PROGRESSIVE_USER_ENTRY, variables: { email, phone, name, baseCurrency, toolName } }),
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok || payload?.errors?.length) {
      const message = getGraphQLErrorMessage(payload, 'No pudimos darte acceso a la calculadora.')
      return NextResponse.json({ user: null, error: message }, { status: response.ok ? 400 : response.status })
    }

    const user = payload?.data?.progressiveUserEntry ?? null
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

    return setMiaUserAuthCookie(NextResponse.json({ user, ghlLeadSync }), user?.authToken)
  } catch (error) {
    console.error('Progressive user entry failed:', error)
    return NextResponse.json({ user: null, error: 'No pudimos darte acceso a la calculadora.' }, { status: 500 })
  }
}
