import { NextResponse } from 'next/server'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'

const GET_USER = `
  query UserEntry($email: String!) {
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

type AccessSummary = {
  toolName: string
  status: 'active' | 'expired' | 'revoked' | 'missing'
  hasAccess: boolean
  expiresAt?: string | null
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const email = String(body?.email || '').trim().toLowerCase()
    const toolName = String(body?.toolName || 'rentabilidad').trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ exists: false, user: null, access: buildMissingAccess(toolName), error: 'Email inválido.' }, { status: 400 })
    }

    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: GET_USER, variables: { email } }),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || payload?.errors?.length) {
      return NextResponse.json(
        { exists: false, user: null, access: buildMissingAccess(toolName), error: payload?.errors?.[0]?.message || 'No se pudo validar el correo.' },
        { status: response.ok ? 502 : response.status },
      )
    }

    const user = payload?.data?.user ?? null

    return NextResponse.json({
      exists: Boolean(user),
      requiresPasswordSetup: false,
      // No exponemos datos personales solo por conocer el correo.
      // El perfil completo se entrega únicamente después de validar contraseña.
      user: null,
      access: summarizeToolAccess(user, toolName),
    })
  } catch (error) {
    console.error('User entry validation failed:', error)
    return NextResponse.json(
      { exists: false, user: null, access: buildMissingAccess('rentabilidad'), error: 'No se pudo validar el ingreso.' },
      { status: 500 },
    )
  }
}

function summarizeToolAccess(user: any, toolName: string): AccessSummary {
  if (!user) return buildMissingAccess(toolName)

  const access = (user.accesses || []).find((item: any) => String(item?.toolName || '').toLowerCase() === toolName)
  if (!access) return buildMissingAccess(toolName)

  const expiresAt = access.expiresAt ?? null
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return { toolName, status: 'expired', hasAccess: false, expiresAt }
  }

  const rawStatus = String(access.status || '').toLowerCase()
  if (rawStatus === 'enabled' || rawStatus === 'active') {
    return { toolName, status: 'active', hasAccess: true, expiresAt }
  }

  if (rawStatus === 'expired') {
    return { toolName, status: 'expired', hasAccess: false, expiresAt }
  }

  return { toolName, status: 'revoked', hasAccess: false, expiresAt }
}

function buildMissingAccess(toolName: string): AccessSummary {
  return { toolName, status: 'missing', hasAccess: false, expiresAt: null }
}
