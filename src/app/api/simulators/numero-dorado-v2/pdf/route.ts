import { NextRequest, NextResponse } from 'next/server'
import { MIA_USER_TOKEN_COOKIE, getBearerTokenFromAuthorizationHeader } from '@/lib/mia-user-auth-cookie'
import { createGoldenNumberV2Pdf } from '@/lib/numero-dorado-pdf'


export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'
const MY_GOLDEN_NUMBER_V2_SNAPSHOT = `query MyGoldenNumberV2Snapshot { myGoldenNumberV2Snapshot }`

function getMiaUserToken(request: NextRequest) {
  return request.cookies.get(MIA_USER_TOKEN_COOKIE)?.value || getBearerTokenFromAuthorizationHeader(request.headers.get('authorization'))
}

export async function POST(request: NextRequest) {
  const token = getMiaUserToken(request)
  if (!token) return NextResponse.json({ error: 'Debes iniciar sesión para descargar tu PDF.' }, { status: 401 })

  try {
    const response = await fetch(MIA_API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, cache: 'no-store',
      body: JSON.stringify({ query: MY_GOLDEN_NUMBER_V2_SNAPSHOT, variables: {} }),
    })
    const payload = await response.json().catch(() => null)
    const simulatorResponse = payload?.data?.myGoldenNumberV2Snapshot
    if (!response.ok || payload?.errors?.length) return NextResponse.json({ error: payload?.errors?.[0]?.message || 'No se pudo consultar tu simulación.' }, { status: response.ok ? 502 : response.status })
    if (!simulatorResponse?.result) return NextResponse.json({ error: 'Completa la calculadora antes de descargar tu PDF.' }, { status: 422 })

    const pdf = createGoldenNumberV2Pdf(simulatorResponse.result as Record<string, any>)
    const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="numero-dorado.pdf"',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Número Dorado PDF failed:', error)
    return NextResponse.json({ error: 'No se pudo generar tu PDF.' }, { status: 500 })
  }
}
