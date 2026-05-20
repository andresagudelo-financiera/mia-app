import { NextResponse } from 'next/server'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'

const SET_INITIAL_PASSWORD = `
  mutation SetInitialUserPassword($email: String!, $phone: String!, $password: String!) {
    setInitialUserPassword(email: $email, phone: $phone, password: $password) {
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

const FREE_ENTRY_TOOLS = new Set([
  'reto-anti-deuda',
  'diagnostico-emocional-deuda',
  'diagnostico-financiero-deuda',
  'plan-pago-deuda',
  'analiza-tu-deuda',
  'perfil-riesgo',
  'numero-dorado',
])

type AccessSummary = {
  toolName: string
  status: 'active' | 'expired' | 'revoked' | 'missing'
  hasAccess: boolean
  expiresAt?: string | null
}

export async function POST(request: Request) {
  let requestedToolName = 'rentabilidad'
  try {
    const body = await request.json().catch(() => null)
    const email = String(body?.email || '').trim().toLowerCase()
    const phone = String(body?.phone || '').trim()
    const password = String(body?.password || '')
    const toolName = String(body?.toolName || 'rentabilidad').trim().toLowerCase()
    requestedToolName = toolName

    if (!email || !email.includes('@')) {
      return NextResponse.json({ exists: false, user: null, access: buildMissingAccess(toolName), error: 'Email inválido.' }, { status: 400 })
    }

    if (!phone || !password) {
      return NextResponse.json({ exists: true, user: null, access: buildMissingAccess(toolName), error: 'Celular y contraseña son requeridos.' }, { status: 400 })
    }

    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SET_INITIAL_PASSWORD, variables: { email, phone, password } }),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || payload?.errors?.length) {
      const backendMessage = payload?.errors?.[0]?.message || 'No se pudo crear la contraseña.'
      const isOutdatedBackend = backendMessage.includes('Cannot query field "setInitialUserPassword"')

      return NextResponse.json(
        {
          exists: true,
          user: null,
          access: buildMissingAccess(toolName),
          error: isOutdatedBackend
            ? 'El backend todavía no tiene activo el alta de contraseña. Reinicia el MIA API y vuelve a intentar.'
            : backendMessage,
        },
        { status: response.ok ? 401 : response.status },
      )
    }

    const user = payload?.data?.setInitialUserPassword ?? null

    return NextResponse.json({
      exists: Boolean(user),
      user,
      access: summarizeToolAccess(user, toolName),
    })
  } catch (error) {
    console.error('Initial user password setup failed:', error)
    return NextResponse.json(
      { exists: false, user: null, access: buildMissingAccess(requestedToolName), error: 'No se pudo crear la contraseña.' },
      { status: 500 },
    )
  }
}

function summarizeToolAccess(user: any, toolName: string): AccessSummary {
  if (!user) return buildMissingAccess(toolName)

  const access = (user.accesses || []).find((item: any) => String(item?.toolName || '').toLowerCase() === toolName)
  if (!access) return buildDefaultAccess(toolName)

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

function buildDefaultAccess(toolName: string): AccessSummary {
  if (FREE_ENTRY_TOOLS.has(toolName)) {
    return { toolName, status: 'active', hasAccess: true, expiresAt: null }
  }

  return buildMissingAccess(toolName)
}

function buildMissingAccess(toolName: string): AccessSummary {
  return { toolName, status: 'missing', hasAccess: false, expiresAt: null }
}
