import { NextResponse } from 'next/server'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'

const REQUEST_PASSWORD_RESET = `
  mutation RequestUserPasswordReset($email: String!) {
    requestUserPasswordReset(email: $email)
  }
`

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const email = String(body?.email || '').trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Email inválido.' }, { status: 400 })
    }

    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: REQUEST_PASSWORD_RESET, variables: { email } }),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.errors?.length) {
      const message = payload?.errors?.[0]?.message || 'No se pudo enviar el correo de restablecimiento.'
      return NextResponse.json({ ok: false, error: message }, { status: response.ok ? 400 : response.status })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Request password reset failed:', error)
    return NextResponse.json({ ok: false, error: 'No se pudo enviar el correo de restablecimiento.' }, { status: 500 })
  }
}
