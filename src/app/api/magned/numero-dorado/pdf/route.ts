import { NextRequest, NextResponse } from 'next/server'
import { createGoldenNumberV2Pdf } from '@/lib/numero-dorado-pdf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAGNED_PDF_API_URL = process.env.MAGNED_PDF_API_URL || ((process.env.MAGNED_API_URL || process.env.MIA_API_URL?.replace(/\/graphql$/, '') + '/magned/numero-dorado') + '/pdf')

export async function POST(request: NextRequest) {
  const requestedPlan = await request.json().catch(() => null)
  const token = request.cookies.get('mia_magned_session')?.value
  if (!token) return NextResponse.json({ error: 'No pudimos recuperar tu simulación. Recarga la página e inténtalo de nuevo.' }, { status: 401 })

  try {
    const response = await fetch(MAGNED_PDF_API_URL, { method: 'POST', headers: { 'x-lead-magnet-token': token }, cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.ok) return NextResponse.json({ error: payload?.error || 'No pudimos generar tu PDF.' }, { status: response.status || 502 })

    // `pdfData` is a summary. Keep the accompanying saved session so the PDF
    // generator uses the same user inputs and plan settings as the modal.
    if (!payload.pdfData && !payload.result && !payload.session?.input && !payload.session?.calculation) {
      return NextResponse.json({ error: 'Completa la simulación antes de descargar tu PDF.' }, { status: 422 })
    }
    const pdf = createGoldenNumberV2Pdf({ ...(payload as Record<string, any>), plan: requestedPlan?.plan })
    const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer
    return new NextResponse(body, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="numero-dorado.pdf"', 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'No pudimos generar tu PDF.' }, { status: 503 })
  }
}
