import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'

function getMiaRestBaseUrl() {
  return MIA_API_URL.replace(/\/graphql\/?$/, '')
}

function getBearerToken(authorization?: string | null) {
  return authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : undefined
}

function assertWebhookSecret(request: NextRequest) {
  const configuredSecret = process.env.GHL_WEBHOOK_SECRET

  if (!configuredSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('GHL_WEBHOOK_SECRET is required in production.')
    }
    return
  }

  const headerSecret = request.headers.get('x-ghl-webhook-secret') || undefined
  const bearerSecret = getBearerToken(request.headers.get('authorization'))
  const receivedSecret = headerSecret || bearerSecret

  if (!receivedSecret || receivedSecret !== configuredSecret) {
    return NextResponse.json({ error: 'Webhook GHL no autorizado.' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = assertWebhookSecret(request)
  if (unauthorized instanceof NextResponse) return unauthorized

  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body JSON requerido.' }, { status: 400 })
  }

  const response = await fetch(`${getMiaRestBaseUrl()}/webhooks/ghl/lead-assignment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.GHL_WEBHOOK_SECRET ? { 'x-ghl-webhook-secret': process.env.GHL_WEBHOOK_SECRET } : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null)

  return NextResponse.json(payload || { ok: response.ok }, { status: response.status })
}
