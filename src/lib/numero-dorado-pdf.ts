import { jsPDF } from 'jspdf'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { calculateGoldenNumberV2, formatHighlightedGoldenNumber, waitYearLabel, waitYearOptions, waitingCost, type GoldenNumberV2Settings } from './numero-dorado-v2'

const DISCLAIMER = 'Esta simulación es informativa y no constituye asesoría financiera ni una garantía de resultados. Los rendimientos pasados no garantizan rendimientos futuros.'

type JsonRecord = Record<string, any>

type Campaign = {
  title: string
  ctaLabel: string
  ctaUrl: string
  prizes: Array<{ title: string; description: string }>
}

/**
 * The lead-magnet PDF endpoint returns a lightweight `pdfData` summary next to
 * the saved anonymous session. The summary omits questionnaire input and the
 * editable plan settings, so use session.input for a personalised report.
 */
function reportData(raw: JsonRecord): JsonRecord {
  const session = asRecord(raw.session)
  const summary = asRecord(raw.pdfData)
  const result = asRecord(raw.result)
  const planInput = asRecord(asRecord(raw.plan).input)
  const sessionInput = asRecord(session.input)
  const resultInput = asRecord(result.input)
  const summaryInput = asRecord(summary.input)
  const input = Object.keys(planInput).length ? planInput
    : Object.keys(sessionInput).length ? sessionInput
      : Object.keys(resultInput).length ? resultInput
        : Object.keys(summaryInput).length ? summaryInput
          : asRecord(raw.input)

  return {
    ...summary,
    ...result,
    ...raw,
    input,
    calculation: asRecord(input.calculation).monthlyExpense !== undefined
      ? input.calculation
      : session.calculation || result.calculation || summary.calculation || raw.calculation,
  }
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

function activePlan(result: JsonRecord) {
  return asRecord(result.plan)
}

function settingsFromResult(result: JsonRecord): GoldenNumberV2Settings {
  // Download requests include the exact settings backing the open modal. Prefer
  // them over server aliases so the PDF cannot silently drift from the UI.
  const liveSettings = asRecord(activePlan(result).settings)
  if (Object.keys(liveSettings).length) return {
    monthlySpend: Number(liveSettings.monthlySpend || 0), years: Number(liveSettings.years || 0),
    capital: Number(liveSettings.capital || 0), targetReturn: Number(liveSettings.targetReturn || .08),
    phase1Contribution: Number(liveSettings.phase1Contribution || 0), phase1Return: Number(liveSettings.phase1Return || .08),
    phase2Contribution: Number(liveSettings.phase2Contribution || 0), phase2Return: Number(liveSettings.phase2Return || .12),
    indexPhase1: Boolean(liveSettings.indexPhase1), indexPhase2: Boolean(liveSettings.indexPhase2), age: Number(liveSettings.age || 35),
  }
  const input = asRecord(result.input)
  const answers = asRecord(input.answers || input)
  const calculation = asRecord(input.calculation || result.calculation)
  return {
    monthlySpend: Number(calculation.monthlyExpense || answers.gasto || answers.monthlySpend || 0),
    years: Number(calculation.targetYears || answers.anios || answers.years || 0),
    // The backend's canonical response uses `capital`/`phaseOneContribution`,
    // whereas the browser saver uses `initialCapital`/`phaseOneMonthlyContribution`.
    capital: Number(calculation.initialCapital ?? calculation.capital ?? answers.capital ?? 0),
    targetReturn: Number(calculation.targetGrossReturn || .08),
    phase1Contribution: Number(calculation.phaseOneMonthlyContribution ?? calculation.phaseOneContribution ?? 0),
    phase1Return: Number(calculation.phaseOneGrossReturn || .08),
    phase2Contribution: Number(calculation.phaseTwoMonthlyContribution ?? calculation.phaseTwoContribution ?? 0),
    phase2Return: Number(calculation.phaseTwoGrossReturn || .12),
    indexPhase1: Boolean(calculation.phaseOneIndexed), indexPhase2: Boolean(calculation.phaseTwoIndexed), age: Number(answers.edad || answers.age || 35),
  }
}

function calculationFromResult(result: JsonRecord, settings: GoldenNumberV2Settings) {
  const liveCalculation = asRecord(activePlan(result).calculation)
  return Number.isFinite(liveCalculation.target) && Number.isFinite(liveCalculation.projected) && Number.isFinite(liveCalculation.returns)
    ? liveCalculation
    : calculateGoldenNumberV2(settings)
}

function selectedWaitingImpact(result: JsonRecord, settings: GoldenNumberV2Settings): { waitYears: number; cost: number; planYears: number } | null {
  const liveImpact = asRecord(activePlan(result).waitImpact)
  if (Number.isFinite(liveImpact.cost) && Number.isFinite(liveImpact.waitYears)) return { waitYears: Number(liveImpact.waitYears), cost: Number(liveImpact.cost), planYears: settings.years }
  const input = asRecord(result.input)
  const answers = asRecord(input.answers || input)
  const options = waitYearOptions(settings.years)
  if (!options.length) return null
  const requested = Number(answers.esperaAnios || answers.waitYears)
  const waitYears = options.includes(requested) ? requested : options[0]
  return { waitYears, cost: waitingCost(settings, waitYears).cost, planYears: settings.years }
}

/** Uses only fields the person supplied: missing answers never become invented copy. */
function portrait(result: JsonRecord) {
  const input = asRecord(result.input)
  const a = asRecord(input.answers || input)
  const name = String(a.nombre || a.name || '').trim()
  const age = String(a.edad || a.age || '').trim()
  const occupation = String(a.ocupacion || a.occupation || '').trim()
  const sector = String(a.sector || '').trim()
  const dependents = String(a.dependientes || a.dependents || '').trim()
  const urgency = String(a.urgencia || a.urgency || '').trim()
  const horizonMonths = ({
    'Ya, este mes': '1',
    'En los próximos tres meses': '3',
    'Este año': '12',
  } as Record<string, string>)[urgency]
  return [
    [name && age ? `${name}, ${age} años` : name, occupation && sector ? `${occupation} en ${sector}` : occupation || sector, dependents ? (dependents === 'Nadie, solo yo' ? 'sin personas que dependan de ti' : `con ${dependents} persona${dependents === '1' ? '' : 's'} que depende${dependents === '1' ? '' : 'n'} de ti`) : ''].filter(Boolean).join(', '),
    a.destino || a.destination ? `A fin de mes: ${String(a.destino || a.destination)}.` : '',
    a.experiencia || a.experience ? `${String(a.experiencia || a.experience)}.` : '',
    a.deuda || a.debt ? `Deudas: ${String(a.deuda || a.debt)}.` : '',
    (a.objetivo || a.goal) && horizonMonths ? `Y quieres ${String(a.objetivo || a.goal)}, en los próximos ${horizonMonths} meses.` : '',
  ].filter(Boolean).join(' ')
}

export function createGoldenNumberV2Pdf(result: JsonRecord): Uint8Array {
  result = reportData(result)
  const document = asRecord(result.pdfDocument)
  const settings = settingsFromResult(result)
  // Reuse the live modal calculation when it is provided; fall back to the same
  // calculator only for legacy downloads without a live-plan payload.
  const calculation = calculationFromResult(result, settings)
  const campaign = campaignConfig()
  const inputAnswers = asRecord(asRecord(result.input).answers || result.input)
  const currency = String(activePlan(result).currency || document.currency || asRecord(result.input).currency || 'COP')
  const name = String(document.personName || inputAnswers.nombre || inputAnswers.name || '').trim()
  const generatedOn = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const margin = 48
  const contentWidth = width - margin * 2
  let y = 52

  const footer = () => {
    doc.setDrawColor(221, 209, 176)
    doc.line(margin, height - 38, width - margin, height - 38)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 93, 75)
    doc.text('Número Dorado - reporte personalizado', margin, height - 22)
    doc.text(`Generado el ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date())}`, width - margin, height - 22, { align: 'right' })
  }
  const page = () => { footer(); doc.addPage(); y = 52 }
  const ensure = (space: number) => { if (y + space > height - 58) page() }
  const label = (text: string, x = margin, top = y, color: [number, number, number] = [184, 144, 26]) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...color)
    doc.text(text.toUpperCase(), x, top)
  }
  const text = (value: string, x = margin, top = y, size = 10.5, maxWidth = contentWidth, color: [number, number, number] = [92, 88, 80], bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
    const lines = doc.splitTextToSize(value, maxWidth)
    doc.text(lines, x, top)
    return top + lines.length * (size + 4)
  }
  const roundedCard = (x: number, top: number, cardWidth: number, cardHeight: number, fill: [number, number, number] = [255, 255, 255], border: [number, number, number] = [227, 213, 168], lineWidth = 1) => {
    doc.setFillColor(...fill); doc.setDrawColor(...border); doc.setLineWidth(lineWidth); doc.roundedRect(x, top, cardWidth, cardHeight, 12, 12, 'FD')
  }
  const metric = (labelText: string, value: string, x: number, top: number, cardWidth: number) => {
    roundedCard(x, top, cardWidth, 70)
    label(labelText, x + 14, top + 20, [98, 91, 77])
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(28, 25, 19)
    doc.text(value, x + 14, top + 48)
  }
  const sectionTitle = (eyebrow: string, title: string) => {
    ensure(56); label(eyebrow); y += 22
    doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(28, 25, 19); doc.text(title, margin, y); y += 28
  }

  doc.setFillColor(251, 248, 239); doc.rect(0, 0, width, height, 'F')
  label('Money Flow · Tu punto de partida')
  y += 29
  doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(28, 25, 19)
  doc.text(name ? `${name}, tu plan en una hoja.` : 'Tu plan en una hoja.', margin, y)
  y += 21
  text(`Generado el ${generatedOn}`, margin, y, 10, contentWidth, [100, 96, 90])
  y += 33

  const portraitNarrative = portrait(result)
  if (portraitNarrative) {
    const portraitLines = doc.splitTextToSize(portraitNarrative, contentWidth - 32)
    const cardHeight = 41 + portraitLines.length * 14 + 16
    roundedCard(margin, y, contentWidth, cardHeight)
    label('Tu retrato', margin + 16, y + 20, [124, 106, 45])
    text(portraitNarrative, margin + 16, y + 43, 10.5, contentWidth - 32)
    y += cardHeight + 18
  }

  const goldenTop = y
  const goldenCardHeight = 164
  roundedCard(margin, goldenTop, contentWidth, goldenCardHeight, [255, 248, 221], [198, 171, 58], 1.5)
  label('Tu número dorado', margin + 18, goldenTop + 22, [133, 114, 38])
  doc.setFont('helvetica', 'bold'); doc.setFontSize(30); doc.setTextColor(28, 25, 19)
  doc.text(formatMoney(calculation.target, currency), margin + 18, goldenTop + 63)
  const goldCopy = 'Calculado para que tu dinero te alcance hasta los 85 años, pagándote un ingreso que crece con la inflación cada año.'
  text(goldCopy, margin + 18, goldenTop + 88, 10, contentWidth - 36, [28, 25, 19], true)
  text('Este es el patrimonio que reemplaza a tu pensión, sin depender de nadie.', margin + 18, goldenTop + 132, 11, contentWidth - 36, [62, 57, 48])
  y = goldenTop + goldenCardHeight + 28

  const crossoverYear = calculation.year
  const goalAge = settings.age + settings.years
  const crossoverAge = crossoverYear === null ? null : settings.age + crossoverYear
  const yearsLate = crossoverYear === null ? null : crossoverYear - settings.years
  ensure(44)
  label('Dónde estás hoy')
  y += 22
  const status = crossoverAge !== null && yearsLate !== null
    ? `Con tu ritmo actual llegas a los ${crossoverAge}, no a los ${goalAge}. Tu plan funciona: le faltan ${yearsLate} años. Eso no se arregla con más esfuerzo, se arregla moviendo palancas.`
    : `Tu meta es llegar a los ${goalAge}. Con las variables actuales aún no hay una fecha de cruce calculable.`
  y = text(status, margin, y, 11.5, contentWidth, [92, 88, 80]) + 12
  const gap = 12
  const metricWidth = (contentWidth - gap) / 2
  ensure(76)
  metric('Patrimonio proyectado', formatMoney(calculation.projected, currency), margin, y, metricWidth)
  metric('Lo ponen los rendimientos', formatMoney(calculation.returns, currency), margin + metricWidth + gap, y, metricWidth)
  y += 88

  const waitingImpact = selectedWaitingImpact(result, settings)
  if (waitingImpact) {
    ensure(218)
    doc.setDrawColor(221, 209, 176); doc.line(margin, y, width - margin, y); y += 25
    sectionTitle('Costo de esperar', 'Lo que te cuesta esperar')
    const waitCopy = `Si arrancás ${waitingImpact.waitYears} ${waitYearLabel(waitingImpact.waitYears)} después con el mismo plan, esto es lo que el interés compuesto no llega a trabajar para vos. Cada año que esperás es un año que no vuelve.`
    const waitLines = doc.splitTextToSize(waitCopy, contentWidth - 36)
    const waitHeight = 124 + waitLines.length * 14
    roundedCard(margin, y, contentWidth, waitHeight, [253, 249, 236])
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(28, 25, 19)
    doc.text(`Esperar ${waitingImpact.waitYears} ${waitYearLabel(waitingImpact.waitYears)}`, margin + 18, y + 25)
    label('Te cuesta', margin + 18, y + 53, [98, 91, 77])
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(28, 25, 19)
    doc.text(formatHighlightedGoldenNumber(waitingImpact.cost, currency), margin + 18, y + 81)
    text(`${formatMoney(waitingImpact.cost, currency)} · a los ${waitingImpact.planYears} años`, margin + 18, y + 103, 10, contentWidth - 36, [140, 118, 36], true)
    text(waitCopy, margin + 18, y + 130, 10.5, contentWidth - 36)
    y += waitHeight + 22
  }

  // The remaining modal sections start on a clean page so no card is split across pages.
  page()
  doc.setFillColor(251, 248, 239); doc.rect(0, 0, width, height, 'F')
  sectionTitle('Tus tres palancas', 'Lo que puedes mover desde hoy')
  const levers = [
    ['01', 'Cuánto aportas cada mes', `Hoy aportas ${formatMoney(settings.phase1Contribution, currency)} al mes`, 'Este aporte puede mejorar si tus finanzas personales se acomodan, en la masterclass ahondaremos en este punto.'],
    ['02', 'A qué tasa rinde tu dinero', 'Hoy rentas 8% anual', 'Con una mejor tasa llegarías más rápido a tu número dorado, pero puede que te parezca difícil de alcanzar. No te preocupes, el 7/9 Claudia va a mostrarte cómo optimizarla.'],
    ['03', 'Cuánto tiempo lo sostienes', crossoverYear !== null ? `Estás ${crossoverYear - settings.years} años por encima de tu plan de ${settings.years} años` : 'Aún no hay una fecha de llegada calculable', crossoverAge !== null ? `Llegarías a los ${crossoverAge}.` : `Al cierre de ${settings.years} años, todavía faltan ${formatMoney(Math.max(0, calculation.target - calculation.projected), currency)} para la meta.`],
  ]
  levers.forEach(([number, title, value, detail]) => {
    const detailLines = doc.splitTextToSize(detail, contentWidth - 84)
    const cardHeight = 72 + detailLines.length * 13
    ensure(cardHeight + 10)
    roundedCard(margin, y, contentWidth, cardHeight)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(184, 144, 26); doc.text(number, margin + 16, y + 28)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(28, 25, 19); doc.text(title, margin + 62, y + 24)
    text(value, margin + 62, y + 44, 10.5, contentWidth - 84, [28, 25, 19], true)
    text(detail, margin + 62, y + 62, 9.5, contentWidth - 84)
    y += cardHeight + 12
  })

  ensure(150)
  roundedCard(margin, y, contentWidth, 132, [247, 240, 213], [184, 144, 26], 1)
  label('Por dónde empezar tú', margin + 18, y + 23, [124, 106, 45])
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(28, 25, 19); doc.text('Palanca 1 · Primero, que te sobre', margin + 18, y + 47)
  text('No tiene sentido hablarte de tasas mientras lo que te queda se te escapa antes de convertirse en algo. Esta palanca no necesita que ganes más: necesita que midas en qué se te va el dinero y armes un presupuesto al revés, donde el aporte sale primero y la vida se acomoda sobre lo que queda.', margin + 18, y + 67, 9.5, contentWidth - 36, [64, 58, 44])

  page()
  doc.setFillColor(251, 248, 239); doc.rect(0, 0, width, height, 'F')
  const appointmentTop = 52
  // Mirror the modal's dark appointment card while keeping the text legible in a PDF.
  doc.setFillColor(23, 21, 18); doc.roundedRect(margin, appointmentTop, contentWidth, 132, 12, 12, 'F')
  label('Tu cita', margin + 18, appointmentTop + 24, [220, 180, 58])
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255)
  doc.text('Lunes 7 de septiembre · 7:00 p.m. Colombia', margin + 18, appointmentTop + 52)
  text('En vivo. No queda grabada.', margin + 18, appointmentTop + 75, 10, contentWidth - 36, [238, 230, 206], true)
  text('Ahí te enseño cómo mover cada una de tus tres palancas, y abro mi cartera personal en pantalla para mostrarte cómo se ve funcionando de verdad.', margin + 18, appointmentTop + 96, 9.5, contentWidth - 36, [238, 230, 206])
  y = appointmentTop + 160

  const configuredPrizes = campaign.prizes.slice(0, 2)
  const prizes = [
    { title: configuredPrizes[0]?.title || 'Un iPad con Money Flow adentro', description: configuredPrizes[0]?.description || 'Se sortea entre quienes estén conectados. Va con el acceso al programa y sesiones en vivo: la herramienta, el conocimiento y el acompañamiento, juntos.', image: campaignImage('ipad-moneyflow-v2.jpg') },
    { title: configuredPrizes[1]?.title || 'La caja fuerte dorada', description: configuredPrizes[1]?.description || 'Adentro hay algo equivalente a USD 40.000. Se abre en vivo esa noche, y ahí mismo explico cómo se gana.', image: campaignImage('caja-dorada-moneyflow-v2.jpg') },
  ]
  const prizeGap = 12
  const prizeWidth = (contentWidth - prizeGap) / 2
  const prizeHeight = 224
  prizes.forEach((prize, index) => {
    const x = margin + index * (prizeWidth + prizeGap)
    roundedCard(x, y, prizeWidth, prizeHeight)
    if (prize.image) doc.addImage(prize.image, 'JPEG', x + 1, y + 1, prizeWidth - 2, 92, undefined, 'FAST')
    else { doc.setFillColor(245, 240, 232); doc.roundedRect(x + 1, y + 1, prizeWidth - 2, 92, 10, 10, 'F') }
    const titleLines = doc.splitTextToSize(prize.title, prizeWidth - 24)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(28, 25, 19); doc.text(titleLines, x + 12, y + 112)
    text(prize.description, x + 12, y + 124 + titleLines.length * 13, 8.5, prizeWidth - 24)
  })
  y += prizeHeight + 22
  if (campaign.ctaUrl) {
    doc.setFillColor(244, 82, 58); doc.roundedRect(margin, y, contentWidth, 32, 7, 7, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255)
    doc.textWithLink(campaign.ctaLabel, width / 2, y + 21, { align: 'center', url: campaign.ctaUrl })
    y += 48
  }
  text(String(document.disclaimer || DISCLAIMER), margin, Math.min(y, height - 60), 7.5, contentWidth, [100, 93, 75])
  footer()

  return new Uint8Array(doc.output('arraybuffer'))
}
