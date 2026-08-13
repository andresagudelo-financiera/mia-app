import { jsPDF } from 'jspdf'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DISCLAIMER = 'Esta simulación es informativa y no constituye asesoría financiera ni una garantía de resultados. Los rendimientos pasados no garantizan rendimientos futuros.'

type JsonRecord = Record<string, any>

type Campaign = {
  title: string
  ctaLabel: string
  ctaUrl: string
  prizes: Array<{ title: string; description: string }>
}

function campaignConfig(): Campaign {
  // The invitation is part of the report, not an optional campaign decoration.
  // Environment values may enrich its title, CTA, and destination without removing it.
  const title = process.env.NUMERO_DORADO_CLASS_TITLE?.trim() || 'Masterclass del 7 de septiembre'
  const ctaUrl = process.env.NUMERO_DORADO_CLASS_URL?.trim() || ''
  let prizes: Array<{ title: string; description: string }> = []
  try {
    const parsed = JSON.parse(process.env.NUMERO_DORADO_PRIZES_JSON || '[]')
    if (Array.isArray(parsed)) prizes = parsed.map((item) => typeof item === 'string' ? { title: item.trim(), description: '' } : { title: String(item?.title || '').trim(), description: String(item?.description || '').trim() }).filter((item) => item.title)
  } catch {
    // Optional campaign data must not block a user's report.
  }
  return { title, ctaLabel: process.env.NUMERO_DORADO_CLASS_CTA?.trim() || 'Preparar mi plan para la masterclass', ctaUrl, prizes }
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

/** Official campaign artwork lives in public/ so it is versioned with the report.
 * The PDF route runs on Node, therefore images are embedded as data URLs instead of
 * linking to localhost/production URLs that may not exist when the file is opened. */
function campaignImage(assetName: string) {
  try {
    const image = readFileSync(join(process.cwd(), 'public', 'images', 'numero-dorado', assetName))
    return `data:image/jpeg;base64,${image.toString('base64')}`
  } catch {
    return null
  }
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

export function createGoldenNumberV2Pdf(result: JsonRecord): Uint8Array {
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

  heading('Tu punto de partida')
  paragraph(portrait(result))
  paragraph(`Partes de ${formatMoney(calculation.initialCapital, currency)} de capital inicial. Cada aporte y cada rendimiento se suman desde ese punto para acercarte a la meta.`)

  heading('Tu plan en dos tiempos')
  paragraph(`Tu proyección combina un aporte inicial de ${formatMoney(calculation.phaseOneMonthlyContribution, currency)} al mes con una fase de aceleración de ${formatMoney(calculation.phaseTwoMonthlyContribution, currency)} al mes. Al final del plazo, ${formatMoney(document.summary?.projectedCapital ?? results.projectedCapital, currency)} serían patrimonio proyectado: ${formatMoney(results.totalInvested, currency)} los pones tú y ${formatMoney(results.returns, currency)} vendrían de rendimientos estimados.`)

  heading('Diagnóstico de tu plan')
  doc.setFillColor(240, 247, 242); doc.roundedRect(margin, y, width - margin * 2, 62, 9, 9, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(28, 88, 58); doc.text(String(diagnosis.title || 'Revisa tus supuestos.'), margin + 14, y + 22)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(46, 80, 62)
  const diagnosticLines = doc.splitTextToSize(String(diagnosis.message || ''), width - margin * 2 - 28)
  doc.text(diagnosticLines, margin + 14, y + 42); y += 78
  paragraph(`Patrimonio proyectado al final del plazo: ${formatMoney(document.summary?.projectedCapital ?? results.projectedCapital, currency)}. Brecha estimada: ${formatMoney(results.gap, currency)}.`)

  // Start the explanation on a deliberate second page. Previously, the recommendation
  // could spill over by itself, producing an almost empty page before the masterclass.
  page()
  heading('Tres palancas. Nada más.')
  levers.slice(0, 3).forEach((lever: JsonRecord, index: number) => {
    const title = String(lever.title || '')
    const details = [
      'Define un aporte sostenible y automatízalo. Empieza por lo que te sobra, sin romper tu vida.',
      'Claudia Uribe te ayudará a revisar la tasa a la que rentas y a comparar alternativas con criterio, sin apostar.',
      'Sostén el plan y revisa el progreso de forma periódica. Cada aporte sostenido le da más tiempo a tu plan.',
    ][index]
    paragraph(`${String(index + 1).padStart(2, '0')} - ${title}. ${details}`, 10)
  })

  heading('Tu recomendación priorizada')
  paragraph(recommendation(result))

  // Keep every part of the campaign continuation together. This avoids a report ending with
  // the invitation on one page and the configured prize information stranded on the next.
  page()
  doc.setFillColor(23, 21, 18); doc.rect(0, 0, width, height, 'F')
  const darkText = (text: string, x: number, top: number, size: number, color: [number, number, number], options: { bold?: boolean; maxWidth?: number } = {}) => {
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, options.maxWidth || width - margin * 2)
    doc.text(lines, x, top)
    return top + lines.length * (size + 4)
  }
  let closingY = 62
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(220, 180, 58)
  doc.text('TU SIGUIENTE PASO', margin, closingY)
  closingY = darkText('Ya sabes cuánto tiene que moverse cada palanca. Falta saber cómo se mueven.', margin, closingY + 34, 24, [255, 255, 255], { bold: true, maxWidth: width - margin * 2 - 20 }) + 12
  closingY = darkText('Esta es una simulación informativa, hecha con las variables que elegiste. Descárgala y llévala a la masterclass: allí Claudia Uribe te ayudará a interpretar tu número y a mover tus tres palancas con intención.', margin, closingY, 11, [239, 232, 213], { maxWidth: width - margin * 2 - 16 }) + 18

  doc.setFillColor(46, 42, 32); doc.roundedRect(margin, closingY, width - margin * 2, 86, 10, 10, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(220, 180, 58)
  doc.text('TU CITA', margin + 18, closingY + 18)
  doc.setFontSize(15); doc.setTextColor(255, 255, 255)
  doc.text('Masterclass · 7 de septiembre', margin + 18, closingY + 39)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(239, 232, 213)
  const campaignLine = campaign.title === 'Masterclass del 7 de septiembre' ? '' : `${campaign.title}. `
  doc.text(`${campaignLine}Lleva este plan: será el punto de partida para revisar lo que puedes mover y tomar decisiones con más claridad.`, margin + 18, closingY + 58, { maxWidth: width - margin * 2 - 36 })
  closingY += 108

  // Keep the two official campaign cards in the same closing block as the invitation.
  // Generic labels are intentionally neutral if campaign text has not been configured.
  const configuredPrizes = campaign.prizes.slice(0, 2)
  const prizeCards = [
    {
      title: configuredPrizes[0]?.title || 'Experiencia Moneyflow',
      description: configuredPrizes[0]?.description || 'Conoce la experiencia durante la masterclass.',
      image: campaignImage('ipad-moneyflow-v2.jpg'),
    },
    {
      title: configuredPrizes[1]?.title || 'La caja dorada',
      description: configuredPrizes[1]?.description || 'Una sorpresa que descubrirás durante la masterclass.',
      image: campaignImage('caja-dorada-moneyflow-v2.jpg'),
    },
  ]
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255)
  doc.text('Lo que encontrarás en la masterclass', margin, closingY)
  closingY += 16

  const cardGap = 12
  const cardWidth = (width - margin * 2 - cardGap) / 2
  const imageHeight = 96
  const cardHeight = 180
  prizeCards.forEach((prize, index) => {
    const x = margin + index * (cardWidth + cardGap)
    doc.setFillColor(46, 42, 32); doc.roundedRect(x, closingY, cardWidth, cardHeight, 8, 8, 'F')
    if (prize.image) {
      // Source images have the same broad landscape ratio. Crop from the centre
      // to preserve their focal point within the campaign-card image window.
      const renderedWidth = Math.min(cardWidth - 2, imageHeight * (16 / 9))
      doc.addImage(prize.image, 'JPEG', x + (cardWidth - renderedWidth) / 2, closingY + 1, renderedWidth, imageHeight, undefined, 'FAST')
    } else {
      doc.setFillColor(68, 62, 46); doc.roundedRect(x + 1, closingY + 1, cardWidth - 2, imageHeight, 8, 8, 'F')
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(255, 255, 255)
    const titleLines = doc.splitTextToSize(prize.title, cardWidth - 28)
    doc.text(titleLines, x + 14, closingY + imageHeight + 22)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(239, 232, 213)
    const bodyLines = doc.splitTextToSize(prize.description, cardWidth - 28)
    doc.text(bodyLines, x + 14, closingY + imageHeight + 34 + titleLines.length * 12)
  })
  closingY += cardHeight + 12

  if (campaign.ctaUrl) {
    doc.setFillColor(220, 180, 58); doc.roundedRect(margin, closingY + 2, width - margin * 2, 32, 7, 7, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(23, 21, 18)
    doc.textWithLink(campaign.ctaLabel, width / 2, closingY + 22, { align: 'center', url: campaign.ctaUrl })
    closingY += 48
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(201, 193, 174)
  doc.text(doc.splitTextToSize(String(document.disclaimer || DISCLAIMER), width - margin * 2), margin, height - 58)
  doc.setDrawColor(86, 79, 62); doc.line(margin, height - 40, width - margin, height - 40)
  doc.setFontSize(8); doc.setTextColor(201, 193, 174)
  doc.text('Número Dorado - reporte personalizado', margin, height - 24)
  doc.text(`Generado el ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date())}`, width - margin, height - 24, { align: 'right' })

  return new Uint8Array(doc.output('arraybuffer'))
}
