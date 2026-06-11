import { NextResponse } from 'next/server'
import { setMiaUserAuthCookie } from '@/lib/mia-user-auth-cookie'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'

const RESET_PASSWORD = `
  mutation ResetUserPassword($email: String!, $token: String!, $password: String!) {
    resetUserPassword(email: $email, token: $token, password: $password) {
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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const email = String(body?.email || '').trim().toLowerCase()
    const token = String(body?.token || '').trim()
    const password = String(body?.password || '')

    if (!email || !email.includes('@') || !token) {
      return NextResponse.json({ ok: false, error: 'El enlace de restablecimiento no es válido.' }, { status: 400 })
    }

    if (password.length < 8 || !/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json({ ok: false, error: 'La contraseña debe tener mínimo 8 caracteres e incluir una letra y un número.' }, { status: 400 })
    }

    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: RESET_PASSWORD, variables: { email, token, password } }),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.errors?.length) {
      const message = payload?.errors?.[0]?.message || 'No se pudo restablecer la contraseña.'
      return NextResponse.json({ ok: false, error: message }, { status: response.ok ? 400 : response.status })
    }

    const user = payload?.data?.resetUserPassword ?? null
    return setMiaUserAuthCookie(NextResponse.json({ ok: true, user }), user?.authToken)
  } catch (error) {
    console.error('Reset password failed:', error)
    return NextResponse.json({ ok: false, error: 'No se pudo restablecer la contraseña.' }, { status: 500 })
  }
}
