import { jsPDF } from 'jspdf'
import { NextRequest, NextResponse } from 'next/server'
import { MIA_USER_TOKEN_COOKIE, getBearerTokenFromAuthorizationHeader } from '@/lib/mia-user-auth-cookie'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'
const SIMULATOR_KEY = 'numero-dorado-v2'
const DISCLAIMER = 'Esta simulación es informativa y no constituye asesoría financiera ni una garantía de resultados. Los rendimientos pasados no garantizan rendimientos futuros.'

const MY_GOLDEN_NUMBER_V2_SNAPSHOT = `
  query MyGoldenNumberV2Snapshot { myGoldenNumberV2Snapshot }
`

type JsonRecord = Record<string, any>

type Campaign = {
  title: string
  ctaLabel: string
  ctaUrl: string
  prizes: Array<{ title: string; description: string }>
}

function campaignConfig(): Campaign {
  let prizes: Array<{ title: string; description: string }> = []
  try {
    const parsed = JSON.parse(process.env.NUMERO_DORADO_PRIZES_JSON || '[]')
    if (Array.isArray(parsed)) prizes = parsed.map((item) => typeof item === 'string' ? { title: item, description: '' } : { title: String(item?.title || ''), description: String(item?.description || '') }).filter((item) => item.title)
  } catch {
    // A malformed optional campaign setting must not block a user's report.
  }

  return {
    title: process.env.NUMERO_DORADO_CLASS_TITLE || 'Clase gratuita: construye tu plan hacia la libertad financiera',
    ctaLabel: process.env.NUMERO_DORADO_CLASS_CTA || 'Reserva tu lugar en la clase',
    ctaUrl: process.env.NUMERO_DORADO_CLASS_URL || '',
    prizes,
  }
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? value as JsonRecord : {}
}

function formatMoney(value: unknown, currency: string) {
  const numeric = Number(value) || 0
  return new Intl.NumberFormat(currency === 'COP' ? 'es-CO' : 'en-US', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(numeric)
}

function recommendation(result: JsonRecord) {
  const input = asRecord(result.input)
  const answers = asRecord(input.answers || input)
  const source = asRecord(result.recommendation)
  const destination = String(source.destination || answers.destino || answers.destination || '')
  const experience = String(source.experience || answers.experiencia || answers.experience || '')
  const debt = String(answers.deuda || answers.debt || '')
  const capital = Number(answers.capital || 0)
  const projected = Number(asRecord(result.results).projectedCapital || 0)
  const target = Number(asRecord(result.results).futureCapital || 0)
  if (debt.includes('apretando') || debt.includes('muy endeudado')) return 'Empieza por ordenar la deuda que te está quitando aire. Liberar ese flujo es la forma más directa de abrir espacio para tu aporte mensual.'
  if (destination.includes('No me queda nada') || destination.includes('yéndose')) {
    return 'Empieza por separar un aporte automático pequeño al inicio de cada mes. La consistencia vale más que buscar la inversión perfecta.'
  }
  if (experience === 'Nunca' || experience.includes('no me fue bien')) {
    return 'Antes de aumentar el riesgo, construye una estrategia simple y entiende qué objetivo cumple cada inversión.'
  }
  if (destination.includes('banco') || destination.includes('CDT')) {
    return 'Revisa si tu estrategia protege el poder adquisitivo y define qué parte de tu dinero puede trabajar con un horizonte mayor.'
  }
  if (experience.includes('menos de dos') || experience.includes('más de dos')) return 'Ya tienes hábito de inversión. El siguiente paso es darle estructura: objetivo, plazo y una estrategia que no dependa de improvisar.'
  if (capital > 0 && target > 0 && projected / target >= .7) return 'Tu plan ya tiene una base importante. El foco ahora es sostenerlo sin romper el proceso y revisar el avance de forma periódica.'
  return 'Tu siguiente paso es revisar aportes, diversificación y horizonte para que tu estrategia acompañe la meta que definiste.'
}

function portrait(result: JsonRecord) {
  const input = asRecord(result.input)
  const a = asRecord(input.answers || input)
  const name = String(a.nombre || a.name || 'Esta persona')
  const age = String(a.edad || a.age || '')
  const occupation = String(a.ocupacion || a.occupation || ''); const sector = String(a.sector || '')
  const dependents = String(a.dependientes || a.dependents || ''); const goal = String(a.objetivo || a.goal || '')
  return `${name}${age ? ` tiene ${age} años` : ''}${occupation ? ` y hoy se desempeña como ${occupation.toLowerCase()}` : ''}${sector ? ` en ${sector}` : ''}. ${dependents ? `Comparte esta meta con ${dependents} dependiente(s) económico(s). ` : ''}${goal ? `Su prioridad es: ${goal}. ` : ''}Este plan toma sus respuestas como punto de partida para convertir una intención en decisiones concretas.`
}

function createPdf(result: JsonRecord): Uint8Array {
  const document = asRecord(result.pdfDocument)
  const results = asRecord(result.results)
  const diagnosis = asRecord(result.diagnosis)
  const calculation = asRecord(result.calculation)
  const assumptions = asRecord(result.assumptions)
  const levers = Array.isArray(document.levers) ? document.levers : Array.isArray(result.levers) ? result.levers : []
  const campaign = campaignConfig()
  const currency = String(document.currency || asRecord(result.input).currency || 'COP')
  const name = String(document.personName || 'Tu')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 48
  let y = 54

  const footer = () => {
    doc.setDrawColor(220, 211, 185)
    doc.line(margin, height - 40, width - margin, height - 40)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 93, 75)
    doc.text('Número Dorado - reporte personalizado', margin, height - 24)
    doc.text(`Generado el ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date())}`, width - margin, height - 24, { align: 'right' })
  }
  const page = () => { footer(); doc.addPage(); y = 54 }
  const heading = (text: string) => {
    if (y > height - 120) page()
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(28, 25, 19)
    doc.text(text, margin, y); y += 24
  }
  const paragraph = (text: string, size = 10, color: [number, number, number] = [75, 69, 56]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, width - margin * 2)
    if (y + lines.length * (size + 4) > height - 58) page()
    doc.text(lines, margin, y); y += lines.length * (size + 4) + 10
  }
  const metric = (label: string, value: string, x: number) => {
    doc.setFillColor(251, 247, 233); doc.roundedRect(x, y, 242, 72, 9, 9, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(113, 99, 55); doc.text(label, x + 14, y + 21)
    doc.setFontSize(17); doc.setTextColor(28, 25, 19); doc.text(value, x + 14, y + 49)
  }

  doc.setFillColor(23, 21, 18); doc.rect(0, 0, width, 132, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(224, 180, 52)
  doc.text('NÚMERO DORADO', margin, 44)
  doc.setFontSize(26); doc.setTextColor(255, 255, 255)
  doc.text(`${name}, este es tu plan.`, margin, 82)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(239, 232, 213)
  doc.text('Una fotografía de tu meta y de las palancas que puedes mover.', margin, 108)
  y = 170

  heading('Tu meta financiera')
  metric('Dinero necesario hoy', formatMoney(document.summary?.presentCapital ?? results.presentCapital, currency), margin)
  metric('Tu Número Dorado', formatMoney(document.summary?.futureCapital ?? results.futureCapital, currency), margin + 254)
  y += 94
  paragraph(`Este resultado usa un gasto mensual de ${formatMoney(calculation.monthlyExpense, currency)}, una meta a ${calculation.targetYears || 0} años y una inflación anual del ${Math.round((Number(assumptions.inflationRate) || 0.04) * 100)}%.`)

  heading('Tu retrato')
  paragraph(portrait(result))

  heading('Diagnóstico de tu plan')
  doc.setFillColor(240, 247, 242); doc.roundedRect(margin, y, width - margin * 2, 62, 9, 9, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(28, 88, 58); doc.text(String(diagnosis.title || 'Revisa tus supuestos.'), margin + 14, y + 22)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(46, 80, 62)
  const diagnosticLines = doc.splitTextToSize(String(diagnosis.message || ''), width - margin * 2 - 28)
  doc.text(diagnosticLines, margin + 14, y + 42); y += 78
  paragraph(`Patrimonio proyectado al final del plazo: ${formatMoney(document.summary?.projectedCapital ?? results.projectedCapital, currency)}. Brecha estimada: ${formatMoney(results.gap, currency)}.`)

  heading('Tres palancas. Nada más.')
  levers.slice(0, 3).forEach((lever: JsonRecord, index: number) => {
    const title = String(lever.title || '')
    const details = [
      'Define un aporte sostenible y automatízalo.',
      'Busca una estrategia coherente con tu horizonte y tolerancia al riesgo.',
      'Sostén el plan y revisa el progreso de forma periódica.',
    ][index]
    paragraph(`${String(index + 1).padStart(2, '0')} - ${title}. ${details}`, 10)
  })

  heading('Tu recomendación priorizada')
  paragraph(recommendation(result))
  if (y > height - 170) page()
  doc.setFillColor(228, 98, 43); doc.roundedRect(margin, y, width - margin * 2, 80, 9, 9, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255)
  doc.text(campaign.title, margin + 16, y + 25, { maxWidth: width - margin * 2 - 32 })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(campaign.ctaLabel, margin + 16, y + 49)
  if (campaign.ctaUrl) { doc.setFontSize(8); doc.text(campaign.ctaUrl, margin + 16, y + 65) }
  y += 96

  if (campaign.prizes.length) {
    heading('Premios de la campaña')
    campaign.prizes.forEach((prize) => paragraph(`- ${prize.title}${prize.description ? `: ${prize.description}` : ''}`, 10))
  }
  heading('Importante')
  paragraph(String(document.disclaimer || DISCLAIMER), 8, [100, 93, 75])
  footer()

  return new Uint8Array(doc.output('arraybuffer'))
}

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

    const pdf = createPdf(asRecord(simulatorResponse.result))
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
