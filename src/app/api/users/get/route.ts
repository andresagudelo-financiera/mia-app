import { NextResponse } from 'next/server'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = String(searchParams.get('email') || '').trim().toLowerCase()
  if (!email || !email.includes('@')) return NextResponse.json({ user: null, error: 'Email inválido.' }, { status: 400 })

  try {
    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: GET_USER, variables: { email } }),
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.errors?.length) {
      return NextResponse.json(
        { user: null, error: payload?.errors?.[0]?.message || 'No se pudo consultar el usuario.' },
        { status: response.ok ? 502 : response.status },
      )
    }
    return NextResponse.json({ user: payload?.data?.user ?? null })
  } catch (error) {
    console.error('Get user failed:', error)
    return NextResponse.json({ user: null, error: 'No se pudo consultar el usuario.' }, { status: 500 })
  }
}
