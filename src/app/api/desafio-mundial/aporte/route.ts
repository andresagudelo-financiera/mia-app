import { NextResponse } from 'next/server'

const GHL_NEW_LEAD_WEBHOOK_URL = process.env.GHL_NEW_LEAD_WEBHOOK_URL || ''

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const email = String(body?.email || '').trim().toLowerCase()
    const nombre = String(body?.nombre || '').trim()
    const fecha = String(body?.fecha || '').trim()
    const userId = body?.userId ? String(body.userId) : undefined

    if (!fecha) {
      return NextResponse.json({ error: 'Fecha requerida.' }, { status: 400 })
    }

    if (GHL_NEW_LEAD_WEBHOOK_URL && email) {
      fetch(GHL_NEW_LEAD_WEBHOOK_URL, {
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
          utm_source: 'desafio_mundial',
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
