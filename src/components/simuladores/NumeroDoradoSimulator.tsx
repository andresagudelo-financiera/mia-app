'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CalendarClock, ChevronLeft, ChevronRight, Download, Gem, Loader2, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import UserRegistrationModal from '@/components/auth/UserRegistrationModal'
import SimulatorActionBar from '@/components/simuladores/SimulatorActionBar'
import { simulatorsApi } from '@/services/api/simulators.api'
import { useUserStore } from '@/stores/user.store'
import { pushEvent, trackMetaEvent } from '@/lib/analytics'
import { SUPPORTED_CURRENCIES } from '@/lib/constants'

const FIELDS = [
  { key: 'age', label: 'Edad actual', suffix: 'años', placeholder: '35' },
  { key: 'retirementAge', label: 'Edad de retiro', suffix: 'años', placeholder: '60' },
  { key: 'lifeExpectancy', label: 'Esperanza de vida', suffix: 'años', placeholder: '85' },
  { key: 'desiredPostRetirementIncome', label: 'Ingreso anual deseado en retiro', suffix: 'money', placeholder: '120000000' },
  { key: 'otherIncomeSources', label: 'Otros ingresos anuales esperados', suffix: 'money', placeholder: '0' },
  { key: 'estimatedInflation', label: 'Inflación anual estimada', suffix: '%', placeholder: '6' },
  { key: 'expectedReturnRate', label: 'Rentabilidad esperada anual', suffix: '%', placeholder: '10' },
  { key: 'netReturn', label: 'Rentabilidad neta objetivo', suffix: '%', placeholder: '4' },
  { key: 'totalSavings', label: 'Ahorro actual para retiro', suffix: 'money', placeholder: '50000000' },
  { key: 'riskScore', label: 'Score/rentabilidad de referencia', suffix: '%', placeholder: '8' },
  { key: 'conservativeReturnRate', label: 'Rentabilidad conservadora (Domingo)', suffix: '%', placeholder: '6' },
  { key: 'methodReturnRate', label: 'Rentabilidad con metodología (Lunes)', suffix: '%', placeholder: '14' },
  { key: 'monthlyContribution', label: 'Aporte mensual adicional', suffix: 'money', placeholder: '500000' },
]

type FormState = Record<string, string>

const DEFAULTS: FormState = {
  age: '35',
  retirementAge: '60',
  lifeExpectancy: '85',
  estimatedInflation: '6',
  expectedReturnRate: '10',
  netReturn: '4',
  otherIncomeSources: '0',
  totalSavings: '0',
  desiredPostRetirementIncome: '72000000',
  riskScore: '8',
  conservativeReturnRate: '6',
  methodReturnRate: '14',
  monthlyContribution: '500000',
  currency: 'COP',
}

const LIFESTYLE_PRESETS = [
  { key: 'tranquilo', label: 'Tranquilo', monthly: 3000000, emoji: '🌱', description: 'Cubrir necesidades y vivir simple.' },
  { key: 'comodo', label: 'Cómodo', monthly: 6000000, emoji: '🏡', description: 'Buen estilo de vida sin excesos.' },
  { key: 'premium', label: 'Premium', monthly: 12000000, emoji: '✨', description: 'Viajes, salud, familia y margen.' },
]

const ASSUMPTION_PRESETS = [
  { key: 'defensivo', label: 'Defensivo', inflation: '6', returnRate: '7', emoji: '🛡️' },
  { key: 'balanceado', label: 'Balanceado', inflation: '5', returnRate: '9', emoji: '⚖️' },
  { key: 'crecimiento', label: 'Crecimiento', inflation: '4', returnRate: '11', emoji: '🚀' },
]

function formatCurrency(value: unknown, currency = 'COP') {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'

  try {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(numeric)
  } catch {
    return `${currency} ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(numeric)}`
  }
}

function formatMoneyInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return ''
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value)
}

function parseMoneyInput(value: string) {
  return Number(value.replace(/[^\d]/g, '')) || 0
}

function toPayload(form: FormState) {
  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => [
      key,
      key === 'currency' ? value || 'COP' : Number(String(value).replace(/,/g, '')) || 0,
    ]),
  )
}

export default function NumeroDoradoSimulator() {
  const { isRegistered, profile, refreshProfile } = useUserStore()
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPrevious, setLoadingPrevious] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [reportName, setReportName] = useState('')
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const selectedCurrency = form.currency || profile?.baseCurrency || 'COP'
  const monthlyTarget = Math.round((Number(form.desiredPostRetirementIncome || 0) || 0) / 12)
  const yearsToRetirement = Math.max(0, Number(form.retirementAge || 0) - Number(form.age || 0))
  const journeyComplete = Boolean(Number(form.age) && Number(form.retirementAge) && Number(form.desiredPostRetirementIncome))
  const averageInflation = 4
  const conservativeReturnRate = Number(form.conservativeReturnRate || 6)
  const methodReturnRate = Number(form.methodReturnRate || form.expectedReturnRate || 14)
  const projectionYears = Math.max(1, yearsToRetirement || 10)
  const projectedMonthlyTarget = monthlyTarget * Math.pow(1 + averageInflation / 100, projectionYears)
  const currentPassiveNeed = passiveCapitalFromMonthly(monthlyTarget, conservativeReturnRate)
  const futureMethodNeed = passiveCapitalFromMonthly(projectedMonthlyTarget, methodReturnRate)

  useEffect(() => {
    if (profile?.baseCurrency) {
      setForm(current => ({ ...current, currency: current.currency || profile.baseCurrency }))
    }
  }, [profile?.baseCurrency])

  useEffect(() => {
    if (!profile?.id) return
    let active = true
    setLoadingPrevious(true)
    simulatorsApi.getResponse(profile.id, 'numero-dorado')
      .then(response => {
        if (!active || !response) return
        const saved = (response.input as any) || response.result?.input
        if (saved) setForm(current => ({ ...current, ...Object.fromEntries(Object.entries(saved).map(([key, value]) => [key, String(value ?? '')])) }))
        if (response.result) setResult(response.result)
      })
      .catch(() => undefined)
      .finally(() => active && setLoadingPrevious(false))
    return () => { active = false }
  }, [profile?.id])

  if (!isRegistered || !profile?.id) {
    return <UserRegistrationModal toolName="numero-dorado" contentName="numero_dorado" onClose={() => undefined} />
  }

  const save = async () => {
    const payload = toPayload(form)
    if (!payload.age || !payload.retirementAge || !payload.desiredPostRetirementIncome) {
      setError('Completa edad actual, edad de retiro e ingreso anual deseado.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await simulatorsApi.saveGoldenNumber(profile.id, payload)
      setResult(response.result)
      setShowResultModal(true)
      fireGoldenConfetti()
      pushEvent('calculator_started', { golden_number: response.result?.results?.goldenNumber })
      trackMetaEvent('Lead', { content_name: 'numero_dorado' })
      void refreshProfile()
    } catch (err) {
      setError((err as Error).message || 'No pudimos guardar tu número dorado.')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (key: string, value: string | number) => {
    setForm(current => {
      const next = { ...current, [key]: String(value) }
      if (key === 'estimatedInflation' || key === 'expectedReturnRate') {
        const expected = Number(next.expectedReturnRate || 0)
        const inflation = Number(next.estimatedInflation || 0)
        next.netReturn = String(expected - inflation)
      }
      return next
    })
  }

  const updateMonthlyTarget = (monthly: number) => {
    setForm(current => ({
      ...current,
      desiredPostRetirementIncome: String(monthly * 12),
    }))
  }

  const saveCurrentSilently = async () => {
    const payload = toPayload(form)
    if (!payload.age || !payload.retirementAge || !payload.desiredPostRetirementIncome) {
      setError('Completa los datos base antes de descargar tu reporte.')
      return false
    }

    setLoading(true)
    setError(null)
    try {
      const response = await simulatorsApi.saveGoldenNumber(profile.id, payload)
      setResult(response.result)
      pushEvent('calculator_started', { calculator: 'numero-dorado', autosave: true })
      void refreshProfile()
      return true
    } catch (err) {
      setError((err as Error).message || 'No pudimos guardar tu número dorado.')
      return false
    } finally {
      setLoading(false)
    }
  }

  const downloadCurrentPdf = async () => {
    setDownloadingPdf(true)
    try {
      const saved = await saveCurrentSilently()
      if (!saved) return

      await downloadGoldenNumberSummaryPdf({
        name: reportName.trim() || 'Participante',
        currency: selectedCurrency,
        monthlyTarget,
        currentPassiveNeed,
        projectedMonthlyTarget,
        futureMethodNeed,
        conservativeReturnRate,
        methodReturnRate,
        inflation: averageInflation,
        years: projectionYears,
      })
      pushEvent('pdf_downloaded', { calculator: 'numero-dorado-simple' })
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#FBFAF4] px-4 py-8 font-roboto text-[#171717] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/calculadoras" className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E6D8B8] bg-white px-4 py-2 text-sm font-semibold text-[#5E6470] shadow-sm transition hover:border-[#E4AF24] hover:text-[#171717]">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <section className="space-y-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-mf-coral/10 px-3 py-1 text-xs font-bold text-mf-coral">
                <Gem className="h-4 w-4" /> Simulador de retiro
              </div>
              <h1 className="font-roboto text-3xl font-black tracking-[-0.04em] text-[#171717] md:text-5xl">Número Dorado</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5E6470] md:text-base">
                Estima cuánto necesitas acumular para sostener tu estilo de vida en retiro, ajustando inflación, rentabilidad y tiempo.
              </p>
            </div>
            {loadingPrevious && <span className="inline-flex items-center gap-2 text-sm text-neutral"><Loader2 className="h-4 w-4 animate-spin" /> Cargando datos...</span>}
          </div>

          <GoldenJourney
            form={form}
            selectedCurrency={selectedCurrency}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            updateField={updateField}
            updateMonthlyTarget={updateMonthlyTarget}
            monthlyTarget={monthlyTarget}
            yearsToRetirement={yearsToRetirement}
          />

          {error && <p className="mt-4 rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>}

          <div className="mt-6 grid gap-3 rounded-3xl border border-[#E6D8B8] bg-white/70 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#B7791F]">Nombre para el reporte</span>
              <input
                type="text"
                value={reportName}
                onChange={event => setReportName(event.target.value)}
                placeholder="Escribe tu nombre"
                className="w-full rounded-xl border border-[#E6D8B8] bg-white px-4 py-3 text-sm font-semibold text-[#171717] outline-none transition focus:border-[#FFB13D]"
              />
            </label>
            <button onClick={downloadCurrentPdf} disabled={downloadingPdf || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#FFB13D] bg-[#FFF4C7] px-6 py-3 font-black text-[#8A6100] shadow-sm transition hover:bg-[#FFE9A6] disabled:opacity-50 md:w-auto">
              {downloadingPdf || loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              {downloadingPdf || loading ? 'Guardando...' : 'Descargar PDF'}
            </button>
          </div>

          {result?.results && (
            <div className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
              <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/50 bg-[radial-gradient(circle_at_18%_8%,rgba(255,230,150,0.55),transparent_30%),linear-gradient(135deg,#fff8df_0%,#f7e6a4_38%,#c8942e_100%)] p-6 shadow-2xl shadow-[#D4AF37]/20 sm:p-8 dark:bg-[radial-gradient(circle_at_18%_8%,rgba(255,215,100,0.22),transparent_32%),linear-gradient(135deg,rgba(80,55,10,0.95),rgba(28,24,15,0.96)_55%,rgba(10,10,10,0.98))]">
                <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/30 blur-3xl dark:bg-[#D4AF37]/20" />
                <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                <p className="relative text-xs font-black uppercase tracking-[0.30em] text-[#7A4E00] dark:text-[#F6D56B]">Tu Número Dorado</p>
                <p className="relative mt-4 block max-w-full whitespace-nowrap font-roboto text-[clamp(1.35rem,4.25vw,2.85rem)] font-black leading-none tracking-[-0.075em] text-[#171717] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)] [font-variant-numeric:tabular-nums] dark:text-[#FFF1B8] dark:drop-shadow-none">
                  {formatCurrency(result.results.goldenNumber, selectedCurrency)}
                </p>
                <p className="relative mt-5 max-w-xl text-sm font-medium leading-relaxed text-[#5F4A16] dark:text-[#F5E7B0]/85">
                  Capital objetivo estimado para sostener tu retiro según tus supuestos de inflación, rentabilidad y tiempo.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <Metric title="Total aportado (Bolsillo)" value={formatCurrency(result.results.totalOutPocket, selectedCurrency)} />
                <Metric title="Rendimientos generados" value={formatCurrency(result.results.totalReturns, selectedCurrency)} />
                <Metric title="Ahorro mensual sugerido" value={formatCurrency(result.results.monthlySavingsWithReturn, selectedCurrency)} />
              </div>

              <div className="lg:col-span-2">
                <SimulatorActionBar
                  title="Número Dorado"
                  description="Capital objetivo estimado para sostener tu retiro según tus supuestos."
                  result={result}
                  fileBaseName="numero-dorado"
                  advisorMessage="Hola Moneyflow, quiero agendar una asesoría para analizar mi Número Dorado con un Money Strategist."
                  shareMessage="Calculé mi Número Dorado con Moneyflow para planear mi retiro."
                />
              </div>

              <SavingsProjectionChart result={result} currency={selectedCurrency} />
            </div>
          )}
        </section>

        {showResultModal && result?.results && (
          <GoldenNumberResultModal
            result={result}
            currency={selectedCurrency}
            onClose={() => setShowResultModal(false)}
          />
        )}

        <style jsx global>{`
          @keyframes golden-confetti-fall {
            0% { transform: translate3d(0, -20px, 0) rotate(0deg); opacity: 1; }
            100% { transform: translate3d(var(--x, 0), 105vh, 0) rotate(720deg); opacity: 0; }
          }
        `}</style>
      </div>
    </main>
  )
}

function fireGoldenConfetti() {
  if (typeof window === 'undefined') return

  const colors = ['#F5A623', '#D4AF37', '#FFF1B8', '#FF7A3D']
  const container = document.createElement('div')
  container.setAttribute('aria-hidden', 'true')
  container.style.position = 'fixed'
  container.style.inset = '0'
  container.style.pointerEvents = 'none'
  container.style.zIndex = '10000'
  document.body.appendChild(container)

  Array.from({ length: 80 }).forEach((_, index) => {
    const piece = document.createElement('span')
    const size = 6 + Math.random() * 7
    piece.style.position = 'absolute'
    piece.style.left = `${Math.random() * 100}%`
    piece.style.top = '-20px'
    piece.style.width = `${size}px`
    piece.style.height = `${size * 1.6}px`
    piece.style.borderRadius = '2px'
    piece.style.background = colors[index % colors.length]
    piece.style.opacity = '0.95'
    piece.style.transform = `rotate(${Math.random() * 360}deg)`
    piece.style.setProperty('--x', `${(Math.random() - 0.5) * 260}px`)
    piece.style.animation = `golden-confetti-fall ${2.6 + Math.random() * 1.8}s cubic-bezier(.16,.84,.44,1) forwards`
    piece.style.animationDelay = `${Math.random() * 0.35}s`
    container.appendChild(piece)
  })

  window.setTimeout(() => container.remove(), 5200)
}

function GoldenJourney({
  form,
  selectedCurrency,
  showAdvanced,
  setShowAdvanced,
  updateField,
  updateMonthlyTarget,
  monthlyTarget,
  yearsToRetirement,
}: {
  form: FormState
  selectedCurrency: string
  showAdvanced: boolean
  setShowAdvanced: (value: boolean) => void
  updateField: (key: string, value: string | number) => void
  updateMonthlyTarget: (monthly: number) => void
  monthlyTarget: number
  yearsToRetirement: number
}) {
  const [activeTab, setActiveTab] = useState<'golden' | 'plan'>('golden')
  const averageInflation = 4
  const averageLifeExpectancy = 85
  const conservativeReturnRate = Number(form.conservativeReturnRate || 6)
  const methodReturnRate = Number(form.methodReturnRate || form.expectedReturnRate || 14)
  const totalSavings = Number(form.totalSavings || 0)
  const monthlyContribution = Number(form.monthlyContribution || 0)
  const projectionYears = Math.max(1, yearsToRetirement || 10)
  const projectedMonthlyTarget = monthlyTarget * Math.pow(1 + averageInflation / 100, projectionYears)
  const currentPassiveNeed = passiveCapitalFromMonthly(monthlyTarget, conservativeReturnRate)
  const futureConservativeNeed = passiveCapitalFromMonthly(projectedMonthlyTarget, conservativeReturnRate)
  const futureMethodNeed = passiveCapitalFromMonthly(projectedMonthlyTarget, methodReturnRate)
  const methodReduction = Math.max(futureConservativeNeed - futureMethodNeed, 0)
  const projectedCapital = projectCapitalWithContributions(totalSavings, monthlyContribution, methodReturnRate, projectionYears)
  const planGap = Math.max(futureMethodNeed - projectedCapital, 0)
  const planSurplus = Math.max(projectedCapital - futureMethodNeed, 0)
  const reachesGoal = projectedCapital >= futureMethodNeed && futureMethodNeed > 0
  const progress = futureMethodNeed > 0 ? Math.min((projectedCapital / futureMethodNeed) * 100, 100) : 0

  const updateProjectionYears = (years: number) => {
    const currentAge = Number(form.age || 35) || 35
    updateField('age', currentAge)
    updateField('retirementAge', currentAge + years)
    updateField('estimatedInflation', averageInflation)
    updateField('lifeExpectancy', averageLifeExpectancy)
    updateField('conservativeReturnRate', conservativeReturnRate)
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-[#E6D8B8] bg-[#FFFDF8] p-3 shadow-sm">
        <div className="grid gap-2 rounded-[1.5rem] bg-[#F5EFE2] p-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveTab('golden')}
            className={`rounded-2xl px-5 py-4 text-left transition ${activeTab === 'golden' ? 'bg-white text-[#171717] shadow-sm' : 'text-[#6D6470] hover:bg-white/55'}`}
          >
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#B7791F]"><Gem className="h-4 w-4" /> Número dorado</span>
            <span className="mt-1 block text-sm font-semibold">Calcula la meta con pocas variables.</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`rounded-2xl px-5 py-4 text-left transition ${activeTab === 'plan' ? 'bg-white text-[#171717] shadow-sm' : 'text-[#6D6470] hover:bg-white/55'}`}
          >
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#B7791F]"><Sparkles className="h-4 w-4" /> Cómo alcanzarlo</span>
            <span className="mt-1 block text-sm font-semibold">Juega con aportes, capital y rentabilidad.</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {activeTab === 'golden' && (
          <div className="pt-2">
            <div className="space-y-0">
              <section className="py-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">01 · Hoy</p>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
                  <div className="space-y-5">
                    <StepHeader eyebrow="Tu vida actual" title="¿Cuánto ingreso mensual quieres cubrir?" text="Esta es la pregunta base: cuánto quieres que tu patrimonio produzca cada mes para sostener tu estilo de vida." />
                    <MoneyField label="Ingresa tu ingreso mensual objetivo" value={monthlyTarget} currency={selectedCurrency} onCurrencyChange={currency => updateField('currency', currency)} onChange={updateMonthlyTarget} />
                    <RangeField
                      label="¿Qué tasa de interés sabés obtener de tus inversiones?"
                      value={conservativeReturnRate}
                      min={1}
                      max={15}
                      suffix="%"
                      onChange={value => updateField('conservativeReturnRate', value)}
                    />
                    <p className="text-sm font-semibold text-[#5E6470]">
                      Equivalente mensual: <span className="font-black text-[#FF6B2C]">{(monthlyRateFromAnnual(conservativeReturnRate) * 100).toFixed(3)}%</span>
                    </p>
                  </div>

                  <DefinitionCard
                    eyebrow="Definición"
                    title="Ingreso mensual objetivo"
                    text="Es la cantidad de dinero que quieres recibir mensualmente desde tu patrimonio, sin depender de un salario. A partir de esta cifra nace tu número dorado."
                    metricLabel="Patrimonio necesario hoy"
                    metricValue={formatCurrency(currentPassiveNeed, selectedCurrency)}
                    note={`Con TR conservadora del ${conservativeReturnRate}% anual.`}
                  />
                </div>
              </section>

              <section className="border-t border-[#E6D8B8] py-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">02 · Futuro</p>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
                  <div className="space-y-5">
                    <StepHeader eyebrow="Tu horizonte" title="¿En cuánto tiempo quieres lograrlo?" text="Movemos solo el horizonte y la TR futura para que el usuario vea el impacto sin llenar demasiados campos." />
                    <RangeField label="Años de proyección" value={projectionYears} min={5} max={25} suffix="años" onChange={updateProjectionYears} />
                    <RangeField label="TR anual futura" value={methodReturnRate} min={4} max={24} suffix="%" onChange={value => {
                      updateField('methodReturnRate', value)
                      updateField('expectedReturnRate', value)
                      updateField('riskScore', value)
                    }} />
                    <p className="text-sm leading-relaxed text-[#5E6470]">
                      Calculamos con inflación promedio del <strong className="text-[#B7791F]">{averageInflation}% anual</strong> y vida promedio referencial de <strong>{averageLifeExpectancy} años</strong>.
                    </p>
                  </div>

                  <div className="grid gap-5">
                    <DefinitionCard
                      eyebrow="Proyección"
                      title="Costo de vida futuro"
                      text="La inflación hace que vivir igual cueste más. Este valor muestra cuánto necesitarías al mes para sostener el mismo estilo de vida."
                      metricLabel={`Gasto mensual en ${projectionYears} años`}
                      metricValue={formatCurrency(projectedMonthlyTarget, selectedCurrency)}
                      note={`Hoy partes de ${formatCurrency(monthlyTarget, selectedCurrency)} mensuales.`}
                    />
                  </div>
                </div>
                <GoldenNumberHighlightCard
                  years={projectionYears}
                  value={formatCurrency(futureMethodNeed, selectedCurrency)}
                  returnRate={methodReturnRate}
                />
              </section>
            </div>

            <BrandInflationCard
              monthlyTarget={monthlyTarget}
              projectedMonthlyTarget={projectedMonthlyTarget}
              inflation={averageInflation}
              years={projectionYears}
              currency={selectedCurrency}
            />
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="pt-2">
            <div className="space-y-0">
              <section className="py-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">01 · Punto de partida</p>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
                  <div className="space-y-5">
                    <StepHeader eyebrow="Capital inicial" title="¿Cuánto dinero ya tienes para empezar?" text="Tu capital inicial reduce la distancia hacia tu número dorado." />
                    <MoneyRangeField
                      label="Capital inicial disponible"
                      helper="Desliza o escribe cuánto tienes hoy para empezar."
                      value={totalSavings}
                      currency={selectedCurrency}
                      onCurrencyChange={currency => updateField('currency', currency)}
                      min={0}
                      max={Math.max(futureMethodNeed, totalSavings, 1000000)}
                      step={selectedCurrency === 'COP' ? 500000 : 100}
                      onChange={value => updateField('totalSavings', value)}
                    />
                  </div>

                  <DefinitionCard
                    eyebrow="Meta con método"
                    title="Tu punto de partida frente a la meta"
                    text="Este valor compara lo que ya tienes con el patrimonio objetivo calculado usando la TR del método."
                    metricLabel="Número dorado con método"
                    metricValue={formatCurrency(futureMethodNeed, selectedCurrency)}
                    note={`Con TR futura del ${methodReturnRate}% anual.`}
                  />
                </div>
              </section>

              <section className="border-t border-[#E6D8B8] py-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">02 · Agregar más dinero</p>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
                  <div className="space-y-5">
                    <StepHeader eyebrow="Aporte mensual" title="¿Cuánto puedes aportar cada mes?" text="Esta es la palanca más tangible: agregar dinero de forma recurrente acelera el camino." />
                    <MoneyRangeField
                      label="Aporte mensual adicional"
                      helper="Mueve el aporte mensual y mira cómo cambia el avance."
                      value={monthlyContribution}
                      currency={selectedCurrency}
                      onCurrencyChange={currency => updateField('currency', currency)}
                      min={0}
                      max={selectedCurrency === 'COP' ? 5000000 : 5000}
                      step={selectedCurrency === 'COP' ? 50000 : 50}
                      onChange={value => updateField('monthlyContribution', value)}
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[250000, 500000, 1000000].map(amount => (
                        <button key={amount} type="button" onClick={() => updateField('monthlyContribution', amount)} className="rounded-2xl border border-[#E6D8B8] bg-[#FFFDF8] p-4 text-left font-black text-[#171717] transition hover:-translate-y-1 hover:border-[#FFB13D]">
                          + {formatCurrency(amount, selectedCurrency)}
                          <span className="block text-xs font-semibold text-[#5E6470]">al mes</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <DefinitionCard
                    eyebrow="Impacto de aportes"
                    title="Cada aporte acerca tu meta"
                    text="Los aportes mensuales se suman al capital inicial y crecen con la rentabilidad proyectada."
                    metricLabel="Capital proyectado"
                    metricValue={formatCurrency(projectedCapital, selectedCurrency)}
                    note={`${progress.toFixed(0)}% de avance estimado.`}
                  />
                </div>
              </section>

              <section className="border-t border-[#E6D8B8] py-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">03 · Rentabilidad</p>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
                  <div className="space-y-5">
                    <StepHeader eyebrow="TR del método" title="¿Qué rentabilidad quieres simular?" text="Mueve la TR para ver cómo el conocimiento cambia la viabilidad del plan." />
                    <RangeField label="TR / rentabilidad anual con metodología" value={methodReturnRate} min={4} max={24} suffix="%" onChange={value => {
                      updateField('methodReturnRate', value)
                      updateField('expectedReturnRate', value)
                      updateField('riskScore', value)
                    }} />
                  </div>

                  <DefinitionCard
                    eyebrow="Reducción por método"
                    title="El conocimiento reduce la cifra necesaria"
                    text="Una mayor TR permite producir el mismo ingreso con menos patrimonio objetivo."
                    metricLabel="Reducción estimada"
                    metricValue={formatCurrency(methodReduction, selectedCurrency)}
                    note={`Comparado contra TR conservadora del ${conservativeReturnRate}% anual.`}
                  />
                </div>
              </section>

              <section className="border-t border-[#E6D8B8] py-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">04 · Plan de acción</p>
                <div className="max-w-3xl space-y-5">
                  <StepHeader eyebrow="Vista de logro" title="¿Qué tan cerca estás de alcanzarlo?" text="La gráfica muestra si tu capital actual y aportes proyectados llegan al número dorado." />
                  <p className="text-sm leading-relaxed text-[#5E6470]">
                    Aquí el usuario entiende que no solo necesita una cifra: necesita un sistema de aportes y rentabilidad para alcanzarla.
                  </p>
                </div>
              </section>
            </div>

            <div className="mt-5 rounded-[2rem] border border-[#E6D8B8] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">Gráfica de avance</p>
                  <h3 className="mt-1 font-roboto text-2xl font-black text-[#171717]">Camino proyectado vs número dorado</h3>
                  <p className="mt-1 text-sm text-[#5E6470]">Capital + aportes + TR del método contra la meta.</p>
                </div>
              </div>
              <LiveGoldenProjectionChart
                currency={selectedCurrency}
                target={futureMethodNeed}
                conservativeTarget={futureConservativeNeed}
                initialCapital={totalSavings}
                monthlyContribution={monthlyContribution}
                annualReturn={methodReturnRate}
                years={projectionYears}
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[2rem] border border-[#E6D8B8] bg-[#FFFDF8] p-5 shadow-sm">
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="inline-flex items-center gap-2 text-sm font-black text-[#B7791F]">
          <SlidersHorizontal className="h-4 w-4" /> {showAdvanced ? 'Ocultar modo avanzado' : 'Mostrar modo avanzado'}
        </button>

        {showAdvanced && (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="block rounded-2xl border border-[#E6D8B8] bg-white p-4">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[#5E6470]">Moneda de cálculo</span>
              <select
                value={selectedCurrency}
                onChange={event => updateField('currency', event.target.value)}
                className="w-full rounded-xl border border-[#E6D8B8] bg-[#FBFAF4] px-4 py-3 text-sm font-semibold text-[#171717] outline-none transition focus:border-[#E4AF24]"
              >
                {SUPPORTED_CURRENCIES.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </label>
            {FIELDS.map(field => (
              <label key={field.key} className="block rounded-2xl border border-[#E6D8B8] bg-white p-4">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[#5E6470]">{field.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form[field.key] ?? ''}
                    onChange={event => updateField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    disabled={field.key === 'netReturn'}
                    className={`w-full rounded-xl border border-[#E6D8B8] bg-[#FBFAF4] px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#E4AF24] ${field.key === 'netReturn' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                  <span className="min-w-10 text-xs font-semibold text-[#5E6470]">{field.suffix === 'money' ? selectedCurrency : field.suffix}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function SlideControls({ current, total, onPrev, onNext }: { current: number; total: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#E6D8B8] pt-5">
      <button type="button" disabled={current === 0} onClick={onPrev} className="inline-flex items-center gap-2 rounded-xl border border-[#E6D8B8] bg-white px-4 py-3 text-sm font-bold text-[#5E6470] transition hover:border-[#E4AF24] disabled:cursor-not-allowed disabled:opacity-40">
        <ChevronLeft className="h-4 w-4" /> Atrás
      </button>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, index) => (
          <span key={index} className={`h-2 rounded-full transition-all ${index === current ? 'w-8 bg-[#E4AF24]' : 'w-2 bg-[#E6D8B8]'}`} />
        ))}
      </div>
      <button type="button" disabled={current === total - 1} onClick={onNext} className="inline-flex items-center gap-2 rounded-xl border border-[#E4AF24] bg-[#FFF4C7] px-4 py-3 text-sm font-black text-[#8A6100] transition hover:bg-[#FFECA3] disabled:cursor-not-allowed disabled:opacity-40">
        Siguiente <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function InflationProjectionChart({ monthlyTarget, inflation, years, currency }: { monthlyTarget: number; inflation: number; years: number; currency: string }) {
  const data = Array.from({ length: years + 1 }).map((_, year) => ({
    year,
    monthly: monthlyTarget * Math.pow(1 + inflation / 100, year),
  }))
  const maxValue = Math.max(...data.map(point => point.monthly), 1)

  return (
    <div className="mt-5 h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 18, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="inflationGolden" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFB13D" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#FF6B2C" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(138,97,0,0.16)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: '#5E6470', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#E6D8B8' }} tickFormatter={(value) => `Año ${value}`} />
          <YAxis tick={{ fill: '#5E6470', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#E6D8B8' }} width={70} domain={[0, maxValue * 1.12]} tickFormatter={(value) => compactCurrency(Number(value), currency)} />
          <Tooltip
            cursor={{ stroke: '#FF6B2C', strokeWidth: 1 }}
            contentStyle={{ background: '#FFFFFF', border: '1px solid #E6D8B8', borderRadius: 14, color: '#171717', boxShadow: '0 18px 40px rgba(23,23,23,0.12)' }}
            formatter={(value: unknown) => [formatCurrency(value, currency), 'Gasto mensual']}
            labelFormatter={(label) => `Año ${label}`}
          />
          <Area type="monotone" dataKey="monthly" stroke="#FF6B2C" strokeWidth={3} fill="url(#inflationGolden)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}


function DarkMoneyField({ label, value, currency, onChange }: { label: string; value: number; currency: string; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[#A8B4C6]">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 focus-within:border-[#F6C21A]/70">
        <span className="text-sm font-semibold text-[#A8B4C6]">{currency}</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={value || ''}
          onChange={event => onChange(Number(event.target.value || 0))}
          className="w-full bg-transparent font-roboto text-2xl font-black text-white outline-none placeholder:text-white/30"
        />
      </div>
    </label>
  )
}

function DarkRangeField({ label, value, min, max, suffix, helper, step = 1, onChange }: { label: string; value: number; min: number; max: number; suffix: string; helper?: string; step?: number; onChange: (value: number) => void }) {
  const safeValue = Number.isFinite(value) && value > 0 ? value : min
  return (
    <label className="block">
      <div className="mb-2 flex items-end justify-between gap-3">
        <span className="text-sm leading-snug text-[#A8B4C6]">{label}</span>
        <span className="whitespace-nowrap font-roboto text-base font-black text-[#F6C21A]">{safeValue}{suffix === '%' ? '%' : ` ${suffix}`}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onChange={event => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#2A3443] accent-[#F6C21A]"
      />
      {helper && <p className="mt-2 text-xs text-[#A8B4C6]">{helper.replace(':', ': ')} </p>}
    </label>
  )
}

function DarkResultCard({ label, value, text }: { label: string; value: string; text: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-[#F6C21A]/35 bg-[#171C20]/88 p-6 shadow-lg shadow-[#F6C21A]/5 md:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#F6C21A]/10 blur-3xl" />
      <div className="relative flex h-full min-h-[250px] flex-col justify-center">
        <p className="text-base text-[#A8B4C6]">{label}</p>
        <p className="mt-3 break-words font-roboto text-4xl font-black leading-none tracking-[-0.055em] text-[#F6C21A] md:text-5xl">{value}</p>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-[#A8B4C6]">{text}</p>
      </div>
    </div>
  )
}

function DarkInfoCard({ label, value, text }: { label: string; value: string; text: string }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-6 md:p-7">
      <p className="text-base text-[#A8B4C6]">{label}</p>
      <p className="mt-3 font-roboto text-3xl font-black tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-3 text-sm leading-relaxed text-[#A8B4C6]">{text}</p>
    </div>
  )
}



function MonthlyIncomeSlider({ value, currency, onChange }: { value: number; currency: string; onChange: (value: number) => void }) {
  const min = 1000000
  const max = 30000000
  const step = 500000
  const safeValue = Math.min(Math.max(value || min, min), max)
  return (
    <label className="block rounded-2xl border border-[#E6D8B8] bg-[#FFFDF8] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-[#5E6470]">Desliza tu ingreso mensual objetivo</span>
        <span className="rounded-full bg-[#FFF4C7] px-3 py-1 text-sm font-black text-[#8A6100]">{formatCurrency(value, currency)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onChange={event => onChange(Number(event.target.value))}
        className="w-full accent-[#FF6B2C]"
      />
      <div className="mt-2 flex justify-between text-[11px] font-semibold text-[#8A6100]/65">
        <span>{formatCurrency(min, currency)}</span>
        <span>{formatCurrency(max, currency)}</span>
      </div>
    </label>
  )
}

function DefinitionCard({ eyebrow, title, text, metricLabel, metricValue, note }: { eyebrow: string; title: string; text: string; metricLabel: string; metricValue: string; note: string }) {
  return (
    <div className="flex h-full min-h-[360px] flex-col justify-center rounded-[1.75rem] border border-[#E6D8B8] bg-[linear-gradient(135deg,#FFFDF8_0%,#FFF6DD_100%)] p-6">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#B7791F]">{eyebrow}</p>
      <h3 className="mt-3 font-roboto text-2xl font-black leading-tight tracking-[-0.035em] text-[#171717]">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[#5E6470]">{text}</p>
      <div className="mt-6 rounded-2xl border border-[#FFB13D]/45 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A6100]/75">{metricLabel}</p>
        <p className="mt-2 break-words font-roboto text-3xl font-black leading-none tracking-[-0.055em] text-[#171717]">{metricValue}</p>
        <p className="mt-3 text-xs font-semibold text-[#B7791F]">{note}</p>
      </div>
    </div>
  )
}

function GoldenNumberHighlightCard({ years, value, returnRate }: { years: number; value: string; returnRate: number }) {
  return (
    <div className="relative mt-6 overflow-hidden rounded-[2rem] border border-[#F2B84B] bg-[radial-gradient(circle_at_100%_0%,rgba(255,177,61,0.35),transparent_34%),linear-gradient(135deg,#FFFFFF_0%,#FFF6DD_56%,#FFE4B8_100%)] p-6 shadow-xl shadow-[#D4AF37]/10 md:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#FFB13D]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-[#FF6B2C]/10 blur-3xl" />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#B7791F]">Resultado · Número dorado</p>
          <h3 className="mt-3 font-roboto text-2xl font-black leading-tight tracking-[-0.04em] text-[#171717] md:text-3xl">Tu meta financiera proyectada</h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5E6470]">
            Este es el patrimonio objetivo que necesitarías construir para sostener tu estilo de vida futuro con ingresos pasivos.
          </p>
        </div>
        <div className="lg:text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.20em] text-[#8A6100]/75">Patrimonio necesario en {years} años</p>
          <p className="mt-2 break-words font-roboto text-[clamp(2.6rem,7vw,5.25rem)] font-black leading-none tracking-[-0.075em] text-[#171717]">
            {value}
          </p>
          <p className="mt-3 text-sm font-black text-[#B7791F]">Con TR futura del {returnRate}% anual.</p>
        </div>
      </div>
    </div>
  )
}

function GoldenMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E6D8B8] bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8A6100]/65">{label}</p>
      <p className="mt-0.5 font-roboto text-sm font-black text-[#171717]">{value}</p>
    </div>
  )
}

function BrandInflationCard({
  monthlyTarget,
  projectedMonthlyTarget,
  inflation,
  years,
  currency,
}: {
  monthlyTarget: number
  projectedMonthlyTarget: number
  inflation: number
  years: number
  currency: string
}) {
  return (
    <div className="mt-5 relative overflow-hidden rounded-[2rem] border border-[#E6D8B8] bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF7E7_58%,#FFE8C5_100%)] p-5 text-[#171717] shadow-xl shadow-[#D4AF37]/10 md:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#FFB13D]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#FF6B2C]/12 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(135deg,rgba(212,175,55,.14)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#B7791F]">Key visual · Proyección</p>
          <img src="/logo-mf-negro.png" alt="Moneyflow" className="h-7 w-auto opacity-80" />
        </div>
        <h3 className="font-roboto text-2xl font-black leading-tight tracking-[-0.035em] md:text-3xl">
          Cómo la <span className="text-[#FF6B2C]">inflación</span> mueve tu meta
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#5E6470]">
          Mira cómo el mismo estilo de vida puede costar más en {years} años si la inflación promedio se mantiene en {inflation}% anual.
        </p>
        <InflationProjectionChart monthlyTarget={monthlyTarget} inflation={inflation} years={years} currency={currency} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#E6D8B8] bg-white/80 p-4 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8A6100]/65">Hoy</p>
            <p className="mt-1 font-roboto text-2xl font-black text-[#171717]">{formatCurrency(monthlyTarget, currency)}</p>
          </div>
          <div className="rounded-2xl border border-[#FFB13D]/50 bg-[#FFF4C7] p-4 shadow-lg shadow-[#D4AF37]/10 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B7791F]">Futuro</p>
            <p className="mt-1 font-roboto text-2xl font-black text-[#FF6B2C]">{formatCurrency(projectedMonthlyTarget, currency)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BigNumberCard({ eyebrow, value, text, positive = false }: { eyebrow: string; value: string; text: string; positive?: boolean }) {
  return (
    <div className={`flex min-h-[220px] flex-col justify-center rounded-[2rem] border p-6 ${positive ? 'border-emerald-300 bg-emerald-50' : 'border-[#E4AF24]/45 bg-[#FFF8DD]'}`}>
      <p className={`text-xs font-black uppercase tracking-[0.24em] ${positive ? 'text-emerald-700' : 'text-[#B7791F]'}`}>{eyebrow}</p>
      <p className="mt-4 break-words font-roboto text-3xl font-black leading-none tracking-[-0.055em] text-[#171717] md:text-4xl">{value}</p>
      <p className="mt-4 text-sm leading-relaxed text-[#5E6470]">{text}</p>
    </div>
  )
}

function buildLiveProjectionData({
  initialCapital,
  monthlyContribution,
  annualReturn,
  years,
}: {
  initialCapital: number
  monthlyContribution: number
  annualReturn: number
  years: number
}) {
  const months = Math.max(12, Math.round(years * 12))
  const monthlyRate = monthlyRateFromAnnual(annualReturn)
  let balance = Math.max(initialCapital, 0)
  const points: Array<{ year: number; capital: number }> = [{ year: 0, capital: balance }]

  for (let month = 1; month <= months; month += 1) {
    balance = (balance + Math.max(monthlyContribution, 0)) * (1 + monthlyRate)
    if (month % 12 === 0 || month === months) {
      points.push({ year: Math.round(month / 12), capital: balance })
    }
  }

  return points
}

function LiveGoldenProjectionChart({
  currency,
  target,
  conservativeTarget,
  initialCapital,
  monthlyContribution,
  annualReturn,
  years,
}: {
  currency: string
  target: number
  conservativeTarget: number
  initialCapital: number
  monthlyContribution: number
  annualReturn: number
  years: number
}) {
  const data = buildLiveProjectionData({ initialCapital, monthlyContribution, annualReturn, years })
  const maxValue = Math.max(target, conservativeTarget, ...data.map(point => point.capital), 1)

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 24, right: 18, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="liveGoldenCapital" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(82,72,45,0.16)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: '#5E6470', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `Año ${value}`} />
          <YAxis tick={{ fill: '#5E6470', fontSize: 11 }} tickLine={false} axisLine={false} width={72} domain={[0, maxValue * 1.12]} tickFormatter={(value) => compactCurrency(Number(value), currency)} />
          <Tooltip
            cursor={{ stroke: '#D4AF37', strokeWidth: 1 }}
            contentStyle={{ background: '#FFFFFF', border: '1px solid #E6D8B8', borderRadius: 14, color: '#171717', boxShadow: '0 18px 40px rgba(23,23,23,0.12)' }}
            formatter={(value: unknown) => [formatCurrency(value, currency), 'Capital proyectado']}
            labelFormatter={(label) => `Año ${label}`}
          />
          {conservativeTarget > 0 && <ReferenceLine y={conservativeTarget} stroke="#FF7A3D" strokeDasharray="5 5" label={{ value: 'Sin método', fill: '#D9572B', fontSize: 11, position: 'insideTopRight' }} />}
          {target > 0 && <ReferenceLine y={target} stroke="#B7791F" strokeDasharray="4 4" label={{ value: 'Con método', fill: '#8A6100', fontSize: 11, position: 'insideTopRight' }} />}
          <Area type="monotone" dataKey="capital" stroke="#B7791F" strokeWidth={3} fill="url(#liveGoldenCapital)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}


function StepHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">{eyebrow}</p>
      <h3 className="mt-2 max-w-2xl font-roboto text-2xl font-black leading-tight tracking-[-0.035em] text-[#171717] md:text-3xl">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5E6470]">{text}</p>
    </div>
  )
}

function GoldenSignal({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  const isLong = value.length > 11;
  return (
    <div className={`rounded-2xl border border-[#E6D8B8] bg-white p-3 shadow-sm ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8A6100]/75">{label}</p>
      <p className={`mt-1 break-words font-roboto font-black tracking-[-0.04em] text-[#171717] ${isLong ? 'text-sm md:text-base' : 'text-lg'}`}>{value}</p>
    </div>
  )
}

function RangeField({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  const safeValue = Number.isFinite(value) && value > 0 ? value : min
  return (
    <label className="block rounded-2xl border border-[#E6D8B8] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-[#5E6470]">{label}</span>
        <span className="rounded-full bg-[#FFF4C7] px-3 py-1 text-sm font-black text-[#8A6100]">{safeValue} {suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={safeValue}
        onChange={event => onChange(Number(event.target.value))}
        className="w-full accent-[#D4AF37]"
      />
    </label>
  )
}

function MoneyField({
  label,
  value,
  currency,
  onCurrencyChange,
  onChange,
}: {
  label: string
  value: number
  currency: string
  onCurrencyChange: (currency: string) => void
  onChange: (value: number) => void
}) {
  return (
    <label className="block rounded-2xl border border-[#E6D8B8] bg-white p-5">
      <span className="mb-2 block text-sm font-bold text-[#5E6470]">{label}</span>
      <div className="flex items-stretch overflow-hidden rounded-2xl border border-[#E6D8B8] bg-[#FBFAF4] transition focus-within:border-[#E4AF24] focus-within:ring-2 focus-within:ring-[#FFB13D]/20">
        <select
          aria-label="Moneda"
          value={currency}
          onChange={event => onCurrencyChange(event.target.value)}
          className="w-[104px] border-r border-[#E6D8B8] bg-[#FFF4C7] px-4 text-sm font-black text-[#8A6100] outline-none"
        >
          {SUPPORTED_CURRENCIES.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <input
          type="text"
          inputMode="numeric"
          value={formatMoneyInput(value)}
          onChange={event => onChange(parseMoneyInput(event.target.value))}
          placeholder="0"
          className="w-full bg-transparent px-5 py-4 font-roboto text-2xl font-black tracking-[-0.035em] text-[#171717] outline-none placeholder:text-[#C7BDA8] md:text-3xl"
        />
      </div>
    </label>
  )
}

function MoneyRangeField({
  label,
  helper,
  value,
  currency,
  onCurrencyChange,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  helper: string
  value: number
  currency: string
  onCurrencyChange: (currency: string) => void
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  const safeMax = Math.max(max, min + step)
  const safeValue = Math.min(Math.max(Number.isFinite(value) ? value : min, min), safeMax)

  return (
    <label className="block rounded-2xl border border-[#E6D8B8] bg-white p-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <span>
          <span className="block text-sm font-bold text-[#5E6470]">{label}</span>
          <span className="mt-1 block text-xs font-medium text-[#7A7480]">{helper}</span>
        </span>
        <span className="rounded-full bg-[#FFF4C7] px-3 py-1 text-sm font-black text-[#8A6100]">{formatCurrency(safeValue, currency)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={safeMax}
        step={step}
        value={safeValue}
        onChange={event => onChange(Number(event.target.value))}
        className="w-full accent-[#FF6B2C]"
      />
      <div className="mt-2 flex justify-between text-[11px] font-semibold text-[#8A6100]/65">
        <span>{formatCurrency(min, currency)}</span>
        <span>{formatCurrency(safeMax, currency)}</span>
      </div>
      <div className="mt-3 flex items-stretch overflow-hidden rounded-2xl border border-[#E6D8B8] bg-[#FBFAF4] transition focus-within:border-[#E4AF24] focus-within:ring-2 focus-within:ring-[#FFB13D]/20">
        <select
          aria-label="Moneda"
          value={currency}
          onChange={event => onCurrencyChange(event.target.value)}
          className="w-[104px] border-r border-[#E6D8B8] bg-[#FFF4C7] px-4 text-sm font-black text-[#8A6100] outline-none"
        >
          {SUPPORTED_CURRENCIES.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <input
          type="text"
          inputMode="numeric"
          value={formatMoneyInput(value)}
          onChange={event => onChange(parseMoneyInput(event.target.value))}
          placeholder="0"
          className="w-full bg-transparent px-5 py-4 font-roboto text-2xl font-black tracking-[-0.035em] text-[#171717] outline-none placeholder:text-[#C7BDA8] md:text-3xl"
        />
      </div>
    </label>
  )
}

function monthlyRateFromAnnual(annualRate: number) {
  return annualRate > 0 ? Math.pow(1 + annualRate / 100, 1 / 12) - 1 : 0
}

function passiveCapitalFromMonthly(monthlyIncome: number, annualRate: number) {
  const monthlyRate = monthlyRateFromAnnual(annualRate)
  return monthlyRate > 0 ? monthlyIncome / monthlyRate : 0
}

function projectCapitalWithContributions(initialCapital: number, monthlyContribution: number, annualRate: number, years: number) {
  const monthlyRate = monthlyRateFromAnnual(annualRate)
  const months = Math.max(0, Math.round(years * 12))
  let balance = Math.max(initialCapital, 0)
  for (let month = 0; month < months; month += 1) {
    balance = (balance + Math.max(monthlyContribution, 0)) * (1 + monthlyRate)
  }
  return balance
}

function estimateGoldenPreview(form: FormState) {
  const annualIncome = Number(form.desiredPostRetirementIncome || 0)
  const otherIncome = Number(form.otherIncomeSources || 0)
  const netReturn = Math.max(Number(form.netReturn || 4), 1) / 100
  const inflation = Math.max(Number(form.estimatedInflation || 0), 0) / 100
  const years = Math.max(0, Number(form.retirementAge || 0) - Number(form.age || 0))
  const futureAnnualNeed = Math.max(annualIncome - otherIncome, 0) * Math.pow(1 + inflation, years)
  return futureAnnualNeed / netReturn
}

function GoldenNumberResultModal({ result, currency, onClose }: { result: any; currency: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-mia-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-[#D4AF37]/50 bg-mia-card shadow-2xl shadow-[#D4AF37]/20 animate-in zoom-in-95 duration-300">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-black/10 text-[#5F4A16] transition hover:bg-black/20 dark:text-[#FFF1B8]"
          aria-label="Cerrar resultado"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_8%,rgba(255,230,150,0.62),transparent_30%),linear-gradient(135deg,#fff8df_0%,#f7e6a4_40%,#c8942e_100%)] p-8 sm:p-10 dark:bg-[radial-gradient(circle_at_18%_8%,rgba(255,215,100,0.22),transparent_32%),linear-gradient(135deg,rgba(80,55,10,0.95),rgba(28,24,15,0.96)_55%,rgba(10,10,10,0.98))]">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/30 blur-3xl dark:bg-[#D4AF37]/20" />
          <p className="relative text-xs font-black uppercase tracking-[0.32em] text-[#7A4E00] dark:text-[#F6D56B]">Resultado calculado</p>
          <h2 className="relative mt-3 font-roboto text-3xl font-black text-[#171717] dark:text-[#FFF1B8] sm:text-5xl">Tu Número Dorado</h2>
          <p className="relative mt-5 whitespace-nowrap font-roboto text-[clamp(2rem,7vw,5rem)] font-black leading-none tracking-[-0.075em] text-[#171717] [font-variant-numeric:tabular-nums] dark:text-[#FFF1B8]">
            {formatCurrency(result.results.goldenNumber, currency)}
          </p>
          <p className="relative mt-5 max-w-2xl text-sm font-medium leading-relaxed text-[#5F4A16] dark:text-[#F5E7B0]/85 sm:text-base">
            Este es el capital objetivo estimado para sostener tu retiro bajo los supuestos que ingresaste.
          </p>
        </div>

        <div className="grid gap-3 bg-mia-card p-5 sm:grid-cols-3 sm:p-6">
          <Metric title="Total aportado (Bolsillo)" value={formatCurrency(result.results.totalOutPocket, currency)} />
          <Metric title="Rendimientos generados" value={formatCurrency(result.results.totalReturns, currency)} />
          <Metric title="Ahorro mensual sugerido" value={formatCurrency(result.results.monthlySavingsWithReturn, currency)} />
        </div>

        <div className="flex flex-col gap-3 border-t border-mia-border bg-mia-card p-5 sm:flex-row sm:justify-end sm:p-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-mf px-6 py-3 text-sm font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90"
          >
            Ver mi análisis completo
          </button>
        </div>
      </div>
    </div>
  )
}

type ProjectionPoint = {
  age: number
  balance: number
  outOfPocket: number
  returns: number
  phase: 'acumulación' | 'retiro'
}

function buildSavingsProjection(result: any): ProjectionPoint[] {
  const input = result?.input || {}
  const results = result?.results || {}
  const age = Math.max(0, Math.floor(Number(input.age || 0)))
  const retirementAge = Math.max(age + 1, Math.floor(Number(input.retirementAge || age + 1)))
  const lifeExpectancy = Math.max(retirementAge + 1, Math.floor(Number(input.lifeExpectancy || retirementAge + 1)))
  const expectedReturn = Math.max(Number(input.expectedReturnRate || 0) / 100, 0)
  const inflation = Math.max(Number(input.estimatedInflation || 0) / 100, 0)
  const initialSavings = Math.max(Number(input.totalSavings || 0), 0)
  const baseAnnualSaving = Math.max(Number(results.firstYearSavingsWithReturn || 0), 0)
  const desiredIncome = Math.max(Number(input.desiredPostRetirementIncome || 0) - Number(input.otherIncomeSources || 0), 0)
  const points: ProjectionPoint[] = []
  let balance = initialSavings
  let outOfPocket = initialSavings

  for (let currentAge = age; currentAge <= lifeExpectancy; currentAge += 1) {
    const yearIndex = currentAge - age
    points.push({
      age: currentAge,
      balance: Math.max(balance, 0),
      outOfPocket: Math.max(Math.min(outOfPocket, balance), 0),
      returns: Math.max(balance - Math.min(outOfPocket, balance), 0),
      phase: currentAge < retirementAge ? 'acumulación' : 'retiro',
    })

    if (currentAge < retirementAge) {
      const annualSaving = baseAnnualSaving * Math.pow(1 + inflation, yearIndex)
      balance = balance * (1 + expectedReturn) + annualSaving
      outOfPocket += annualSaving
    } else {
      const retirementYear = currentAge - retirementAge
      const annualWithdrawal = desiredIncome * Math.pow(1 + inflation, retirementAge - age + retirementYear)
      balance = balance * (1 + expectedReturn) - annualWithdrawal
    }
  }

  return points
}

function compactCurrency(value: number, currency: string) {
  if (!Number.isFinite(value)) return '—'
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  } catch {
    return `${currency} ${new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`
  }
}

function SavingsProjectionChart({ result, currency }: { result: any; currency: string }) {
  const data = buildSavingsProjection(result)
  const retirementAge = Number(result?.input?.retirementAge || 0)
  const maxBalance = Math.max(...data.map(point => point.balance), 0)

  if (data.length < 2 || maxBalance <= 0) return null

  return (
    <div className="rounded-3xl border border-mia-border bg-mia-surface/25 p-5 lg:col-span-2">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-mf-coral">Proyección</p>
          <h3 className="mt-1 font-roboto text-2xl font-bold text-mia-cream">Ahorro acumulado por edad</h3>
          <p className="mt-1 text-sm text-neutral">
            Barras: capital proyectado. Línea punteada: retiro a los {retirementAge} años.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-neutral">
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#D4AF37]" /> Aportado (Bolsillo)</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#F5A623]" /> Rendimientos</span>
          <span className="inline-flex items-center gap-2"><span className="h-5 border-l border-dashed border-[#D4AF37]" /> Retiro</span>
        </div>
      </div>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 30, right: 22, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.22)" vertical={false} />
            <XAxis
              dataKey="age"
              tick={{ fill: 'currentColor', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(120,120,120,0.35)' }}
              interval="preserveStartEnd"
              label={{ value: 'Edad', position: 'insideBottom', offset: -10, fill: 'currentColor', fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: 'currentColor', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => compactCurrency(Number(value), currency)}
              width={72}
            />
            <Tooltip
              cursor={{ fill: 'rgba(245,166,35,0.12)' }}
              contentStyle={{
                background: 'rgba(20,20,20,0.92)',
                border: '1px solid rgba(212,175,55,0.35)',
                borderRadius: 14,
                color: '#fff',
              }}
              formatter={(value: unknown, name: string) => [formatCurrency(value, currency), name]}
              labelFormatter={(label) => `Edad: ${label} años`}
            />
            {retirementAge > 0 && (
              <ReferenceLine
                x={retirementAge}
                stroke="#D4AF37"
                strokeDasharray="4 4"
                label={{ value: `Retiro ${retirementAge}`, position: 'insideTopRight', fill: '#B8860B', fontSize: 12, fontWeight: 700 }}
              />
            )}
            <Bar dataKey="outOfPocket" name="Dinero aportado (Bolsillo)" stackId="a" fill="#D4AF37" />
            <Bar dataKey="returns" name="Rendimientos generados" stackId="a" fill="#F5A623" radius={[6, 6, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


async function downloadGoldenNumberSummaryPdf({
  name,
  currency,
  monthlyTarget,
  currentPassiveNeed,
  projectedMonthlyTarget,
  futureMethodNeed,
  conservativeReturnRate,
  methodReturnRate,
  inflation,
  years,
}: {
  name: string
  currency: string
  monthlyTarget: number
  currentPassiveNeed: number
  projectedMonthlyTarget: number
  futureMethodNeed: number
  conservativeReturnRate: number
  methodReturnRate: number
  inflation: number
  years: number
}) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 42
  let y = 48

  const text = (value: string, x: number, lineY: number, options?: { size?: number; bold?: boolean; color?: [number, number, number]; maxWidth?: number }) => {
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal')
    doc.setFontSize(options?.size || 10)
    const [r, g, b] = options?.color || [35, 35, 35]
    doc.setTextColor(r, g, b)
    doc.text(value, x, lineY, { maxWidth: options?.maxWidth })
  }

  const row = (label: string, value: string) => {
    doc.setFillColor(255, 253, 248)
    doc.roundedRect(margin, y - 14, pageWidth - margin * 2, 34, 8, 8, 'F')
    doc.setDrawColor(230, 216, 184)
    doc.roundedRect(margin, y - 14, pageWidth - margin * 2, 34, 8, 8, 'S')
    text(label, margin + 14, y + 7, { size: 9, bold: true, color: [138, 97, 0] })
    text(value, margin + 250, y + 7, { size: 10, bold: true, color: [23, 23, 23] })
    y += 44
  }

  doc.setFillColor(255, 247, 231)
  doc.rect(0, 0, pageWidth, 150, 'F')
  doc.setDrawColor(255, 177, 61)
  doc.setLineWidth(1)
  doc.line(0, 150, pageWidth, 150)

  text('Moneyflow · Número Dorado', margin, y, { size: 12, bold: true, color: [183, 121, 31] })
  y += 28
  text(`Reporte para ${name}`, margin, y, { size: 22, bold: true, color: [23, 23, 23] })
  y += 34
  text(formatCurrency(futureMethodNeed, currency), margin, y, { size: 34, bold: true, color: [255, 107, 44] })
  y += 24
  text('Tu número dorado proyectado según los datos actuales de la calculadora.', margin, y, { size: 10, color: [94, 100, 112], maxWidth: pageWidth - margin * 2 })

  y = 190
  text('Resumen principal', margin, y, { size: 15, bold: true, color: [23, 23, 23] })
  y += 26
  row('Moneda', currency)
  row('Ingreso mensual objetivo', formatCurrency(monthlyTarget, currency))
  row('Patrimonio necesario hoy', formatCurrency(currentPassiveNeed, currency))
  row(`Gasto mensual en ${years} años`, formatCurrency(projectedMonthlyTarget, currency))
  row(`Número dorado en ${years} años`, formatCurrency(futureMethodNeed, currency))

  y += 8
  text('Supuestos usados', margin, y, { size: 15, bold: true, color: [23, 23, 23] })
  y += 26
  row('Inflación promedio', `${inflation}% anual`)
  row('TR conservadora actual', `${conservativeReturnRate}% anual`)
  row('TR futura / metodología', `${methodReturnRate}% anual`)
  row('Horizonte', `${years} años`)

  y += 10
  doc.setFillColor(255, 244, 199)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 76, 12, 12, 'F')
  text('Lectura rápida', margin + 18, y + 24, { size: 11, bold: true, color: [138, 97, 0] })
  text('Este reporte te muestra cuánto capital necesitarías construir y cómo la inflación cambia tu meta mensual futura.', margin + 18, y + 46, { size: 10, color: [95, 74, 22], maxWidth: pageWidth - margin * 2 - 36 })

  const safeName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'participante'
  doc.save(`numero-dorado-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`)
}

async function downloadGoldenNumberPdf(result: any, currency: string) {
  const { default: jsPDF } = await import('jspdf')
  const input = result?.input || {}
  const results = result?.results || {}
  const assumptions = result?.assumptions || {}
  const projection = buildSavingsProjection(result)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 42
  let y = 48

  const addText = (text: string, x: number, lineY: number, options?: { size?: number; bold?: boolean; color?: [number, number, number]; maxWidth?: number }) => {
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal')
    doc.setFontSize(options?.size || 10)
    const [r, g, b] = options?.color || [35, 35, 35]
    doc.setTextColor(r, g, b)
    doc.text(text, x, lineY, { maxWidth: options?.maxWidth })
  }

  const addSectionTitle = (title: string) => {
    y += 18
    addText(title, margin, y, { size: 13, bold: true, color: [122, 78, 0] })
    y += 12
    doc.setDrawColor(212, 175, 55)
    doc.line(margin, y, pageWidth - margin, y)
    y += 20
  }

  doc.setFillColor(255, 248, 223)
  doc.rect(0, 0, pageWidth, 126, 'F')
  doc.setDrawColor(212, 175, 55)
  doc.setLineWidth(1)
  doc.line(0, 126, pageWidth, 126)

  addText('Moneyflow · Número Dorado', margin, y, { size: 11, bold: true, color: [122, 78, 0] })
  y += 32
  addText(formatCurrency(results.goldenNumber, currency), margin, y, { size: 30, bold: true, color: [32, 21, 6] })
  y += 26
  addText('Capital objetivo estimado para sostener tu retiro según tus supuestos.', margin, y, { size: 10, color: [95, 74, 22], maxWidth: pageWidth - margin * 2 })
  y = 156

  addSectionTitle('Resultados principales')
  const rows = [
    ['Número Dorado', formatCurrency(results.goldenNumber, currency)],
    ['Total aportado (Bolsillo)', formatCurrency(results.totalOutPocket, currency)],
    ['Rendimientos generados', formatCurrency(results.totalReturns, currency)],
    ['Ahorro mensual sugerido', formatCurrency(results.monthlySavingsWithReturn, currency)],
    ['Ahorro anual sugerido', formatCurrency(results.firstYearSavingsWithReturn, currency)],
  ]

  rows.forEach(([label, value]) => {
    addText(label, margin, y, { size: 10, bold: true, color: [80, 80, 80] })
    addText(value, margin + 230, y, { size: 10, color: [25, 25, 25] })
    y += 20
  })

  addSectionTitle('Supuestos usados')
  const assumptionsRows = [
    ['Moneda', currency],
    ['Edad actual', input.age],
    ['Edad de retiro', input.retirementAge],
    ['Esperanza de vida', input.lifeExpectancy],
    ['Ingreso anual deseado', formatCurrency(input.desiredPostRetirementIncome, currency)],
    ['Otros ingresos anuales', formatCurrency(input.otherIncomeSources, currency)],
    ['Ahorro actual', formatCurrency(input.totalSavings, currency)],
    ['Inflación estimada', `${input.estimatedInflation || 0}%`],
    ['Rentabilidad esperada', `${input.expectedReturnRate || 0}%`],
    ['Años hasta retiro', assumptions.yearsToRetirement],
  ]

  assumptionsRows.forEach(([label, value]) => {
    addText(String(label), margin, y, { size: 9, bold: true, color: [80, 80, 80] })
    addText(String(value ?? '—'), margin + 230, y, { size: 9, color: [25, 25, 25] })
    y += 17
  })

  if (projection.length) {
    doc.addPage()
    y = 48
    addText('Proyección de ahorro acumulado', margin, y, { size: 16, bold: true, color: [122, 78, 0] })
    y += 28
    addText('Tabla año a año calculada con tus aportes, rentabilidad, inflación y retiros estimados.', margin, y, { size: 10, color: [80, 80, 80], maxWidth: pageWidth - margin * 2 })
    y += 28
    addText('Edad', margin, y, { size: 9, bold: true })
    addText('Ahorro acumulado', margin + 90, y, { size: 9, bold: true })
    addText('Etapa', margin + 270, y, { size: 9, bold: true })
    y += 12
    doc.setDrawColor(212, 175, 55)
    doc.line(margin, y, pageWidth - margin, y)
    y += 18

    projection.forEach((point) => {
      if (y > 730) {
        doc.addPage()
        y = 48
      }
      addText(String(point.age), margin, y, { size: 8 })
      addText(formatCurrency(point.balance, currency), margin + 90, y, { size: 8 })
      addText(point.phase, margin + 270, y, { size: 8 })
      y += 14
    })
  }

  doc.save(`numero-dorado-${new Date().toISOString().slice(0, 10)}.pdf`)
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-mia-border bg-mia-surface/30 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-neutral">{title}</p>
      <p className="mt-2 font-roboto text-2xl font-bold text-mia-cream">{value}</p>
    </div>
  )
}
