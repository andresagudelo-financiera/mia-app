import { NextResponse } from 'next/server'

const N8N_LEAD_WEBHOOK_URL = process.env.N8N_LEAD_WEBHOOK_URL || process.env.MIA_N8N_LEAD_WEBHOOK_URL || ''

function toPlainText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
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

  return {
    utm_source: pick('utm_source', 'utmSource') || 'desafio_mundial',
    utm_medium: pick('utm_medium', 'utmMedium'),
    utm_campaign: pick('utm_campaign', 'utmCampaign'),
    utm_content: pick('utm_content', 'utmContent'),
    utm_term: pick('utm_term', 'utmTerm'),
    utm_id: pick('utm_id', 'utmId'),
    gclid: pick('gclid'),
    fbclid: pick('fbclid'),
    ttclid: pick('ttclid'),
    msclkid: pick('msclkid'),
    referrer: toPlainText(body?.referrer ?? attribution?.referrer ?? request.headers.get('referer')),
    landing_page: toPlainText(body?.landing_page ?? body?.landingPage ?? attribution?.landingPage ?? referer),
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const email = String(body?.email || '').trim().toLowerCase()
    const nombre = String(body?.nombre || '').trim()
    const fecha = String(body?.fecha || '').trim()
    const userId = body?.userId ? String(body.userId) : undefined
    const monto = body?.monto ? Number(body.monto) : undefined
    const moneda = body?.moneda ? String(body.moneda) : undefined
    const attribution = collectLeadAttribution(body, request)

    if (!fecha) {
      return NextResponse.json({ error: 'Fecha requerida.' }, { status: 400 })
    }

    if (N8N_LEAD_WEBHOOK_URL && email) {
      fetch(N8N_LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          miaUserId: userId,
          name: nombre,
          email,
          simulator: 'desafio_mundial',
          toolName: 'desafio_mundial',
          source: 'desafio_mundial_checkin',
          checkInFecha: fecha,
          monto,
          moneda,
          ...attribution,
        }),
        cache: 'no-store',
      }).catch(() => undefined)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Desafío Mundial aporte error:', error)
    return NextResponse.json({ ok: true })
  }
}
