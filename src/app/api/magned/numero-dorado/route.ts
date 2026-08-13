import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Browser-facing anonymous lead-magnet proxy. The backend returns the opaque token
 * only on session creation; this route immediately moves it into an HttpOnly cookie.
 * Browser code never sees a user id, session id, or lead-magnet token.
 */
const MAGNED_API_URL = process.env.MAGNED_API_URL || process.env.MIA_API_URL?.replace(/\/graphql$/, '') + '/magned/numero-dorado' || 'http://localhost:4000/magned/numero-dorado'
const COOKIE_NAME = 'mia_magned_session'

function tokenFor(request: NextRequest) { return request.cookies.get(COOKIE_NAME)?.value || '' }
function upstreamHeaders(token?: string) { return { 'Content-Type': 'application/json', ...(token ? { 'x-lead-magnet-token': token } : {}) } }

function responseWithSession(response: Response, data: unknown) {
  const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {}
  // Token is deliberately stripped before the browser gets the JSON response.
  const token = typeof payload.token === 'string' ? payload.token : ''
  const { token: _token, ...safePayload } = payload
  // Normalize backend session responses to the tiny browser adapter contract.
  const session = safePayload.session
  const normalized = safePayload.ok === true && session ? { ...safePayload, simulatorResponse: session, result: (session as Record<string, unknown>).calculation } : safePayload
  const next = NextResponse.json(normalized, { status: response.status, headers: { 'Cache-Control': 'private, no-store' } })
  if (token) next.cookies.set({ name: COOKIE_NAME, value: token, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 90 })
  return next
}

async function callBackend(method: 'GET'|'POST', token: string, body?: unknown) {
  return fetch(MAGNED_API_URL, { method, headers: upstreamHeaders(token), ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store' })
}

/** A new browser gets an anonymous server session before receiving its snapshot. */
export async function GET(request: NextRequest) {
  try {
    let token = tokenFor(request)
    if (!token) {
      const created = await callBackend('POST', '', { action: 'create' })
      const createdData = await created.json().catch(() => null)
      if (!created.ok) return NextResponse.json({ error: createdData?.error || 'No pudimos iniciar tu simulación.' }, { status: created.status })
      token = typeof createdData?.token === 'string' ? createdData.token : ''
      const snapshot = await callBackend('GET', token)
      const snapshotData = await snapshot.json().catch(() => null)
      const next = responseWithSession(snapshot, snapshotData)
      if (token && !createdData?.token) return next
      // Preserve creation token even if the snapshot response does not repeat it.
      if (token) next.cookies.set({ name: COOKIE_NAME, value: token, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 90 })
      return next
    }
    const response = await callBackend('GET', token)
    return responseWithSession(response, await response.json().catch(() => null))
  } catch { return NextResponse.json({ error: 'El servicio de la simulación no está disponible. Inténtalo de nuevo.' }, { status: 503 }) }
}

export async function POST(request: NextRequest) {
  try {
    const token = tokenFor(request)
    if (!token) return NextResponse.json({ error: 'No pudimos iniciar tu sesión de simulación. Recarga la página e inténtalo de nuevo.' }, { status: 401 })
    const incoming = await request.json().catch(() => null) as Record<string, any> | null
    const action = String(incoming?.action || '')
    const normalized = action === 'save'
      ? { action: incoming?.status === 'completed' ? 'complete' : 'save', input: incoming?.input, currentStep: incoming?.input?.currentStep, attribution: incoming?.attribution }
      : action === 'contact'
        ? { action: 'contact', contact: incoming?.contact }
        : action === 'calculate'
          ? { action: 'calculate', input: incoming?.input, currentStep: incoming?.input?.currentStep, attribution: incoming?.attribution }
          : null
    if (!normalized) return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 })
    const response = await callBackend('POST', token, normalized)
    return responseWithSession(response, await response.json().catch(() => null))
  } catch { return NextResponse.json({ error: 'El servicio de la simulación no está disponible. Inténtalo de nuevo.' }, { status: 503 }) }
}
