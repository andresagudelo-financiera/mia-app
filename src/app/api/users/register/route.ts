import { NextResponse } from 'next/server'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'

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
    const name = String(body?.name || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    const phone = body?.phone ? String(body.phone).trim() : null
    const baseCurrency = String(body?.baseCurrency || 'COP').trim() || 'COP'
    const password = String(body?.password || '')
    const toolName = String(body?.toolName || 'rentabilidad').trim().toLowerCase()

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

    return NextResponse.json({ user })
  } catch (error) {
    console.error('User registration failed:', error)
    return NextResponse.json({ user: null, error: 'No se pudo crear la cuenta.' }, { status: 500 })
  }
}
