import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { miaAdminGraphQL } from '@/lib/mia-admin-client'

export const dynamic = 'force-dynamic'

const STAFF_PANEL_ROLES = new Set(['admin', 'coach', 'money_strategist'])

type AdminGraphQLBody = {
  query?: string
  variables?: Record<string, unknown>
}

function isAdminTokenExpired(expiresAt?: unknown) {
  if (!expiresAt) return false
  const expiresAtMs = new Date(String(expiresAt)).getTime()
  return Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (isAdminTokenExpired(token?.adminTokenExpiresAt)) {
    return NextResponse.json({ errors: [{ message: 'Token admin expirado.', code: 'ADMIN_TOKEN_EXPIRED' }] }, { status: 401 })
  }

  if (!token || !STAFF_PANEL_ROLES.has(String(token.role || '')) || token.isActive !== true || !token.adminToken) {
    return NextResponse.json({ errors: [{ message: 'No autorizado', code: 'UNAUTHORIZED' }] }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as AdminGraphQLBody | null

  if (!body?.query) {
    return NextResponse.json({ errors: [{ message: 'Query GraphQL requerida' }] }, { status: 400 })
  }

  try {
    const data = await miaAdminGraphQL(body.query, body.variables, String(token.adminToken))
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error consultando MIA API'
    const isExpired = message.toLowerCase().includes('token admin expirado') || message.toLowerCase().includes('token expirado')

    return NextResponse.json(
      { errors: [{ message, code: isExpired ? 'ADMIN_TOKEN_EXPIRED' : 'MIA_API_ERROR' }] },
      { status: isExpired ? 401 : 502 },
    )
  }
}
