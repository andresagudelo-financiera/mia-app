import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { miaAdminGraphQL } from '@/lib/mia-admin-client'

export const dynamic = 'force-dynamic'

type AdminGraphQLBody = {
  query?: string
  variables?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (token?.role !== 'admin' || token.isActive !== true || !token.adminToken) {
    return NextResponse.json({ errors: [{ message: 'No autorizado' }] }, { status: 401 })
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
    return NextResponse.json({ errors: [{ message }] }, { status: 502 })
  }
}
