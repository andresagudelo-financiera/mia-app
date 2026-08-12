import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Prize = { title: string; description: string }

function prizesFromEnv(): Prize[] {
  try {
    const raw = JSON.parse(process.env.NUMERO_DORADO_PRIZES_JSON || '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .map((item): Prize => typeof item === 'string'
        ? { title: item.trim(), description: '' }
        : { title: String(item?.title || '').trim(), description: String(item?.description || '').trim() })
      .filter((item) => item.title)
  } catch {
    return []
  }
}

export async function GET() {
  const title = process.env.NUMERO_DORADO_CLASS_TITLE?.trim() || ''
  const ctaLabel = process.env.NUMERO_DORADO_CLASS_CTA?.trim() || ''
  const ctaUrl = process.env.NUMERO_DORADO_CLASS_URL?.trim() || ''

  return NextResponse.json({
    campaign: title && ctaUrl ? { title, ctaLabel: ctaLabel || 'Conocer el siguiente paso', ctaUrl } : null,
    prizes: prizesFromEnv(),
  }, { headers: { 'Cache-Control': 'private, max-age=300' } })
}
