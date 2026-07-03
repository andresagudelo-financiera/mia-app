'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CalendarClock, ChevronLeft, ChevronRight, Download, Gem, Loader2, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import UserRegistrationModal from '@/components/auth/UserRegistrationModal'
import SimulatorActionBar from '@/components/simuladores/SimulatorActionBar'
import { simulatorsApi } from '@/services/api/simulators.api'
import { useUserStore } from '@/stores/user.store'
import { pushEvent, trackMetaEvent } from '@/lib/analytics'
import { SUPPORTED_CURRENCIES } from '@/lib/constants'

const FIELDS = [
  { key: 'age', label: 'Edad actual', suffix: 'años', placeholder: '35' },
  { key: 'retirementAge', label: 'Edad libertad financiera', suffix: 'años', placeholder: '60' },
  { key: 'lifeExpectancy', label: 'Esperanza de vida', suffix: 'años', placeholder: '85' },
  { key: 'desiredPostRetirementIncome', label: 'Ingreso anual deseado en futuro', suffix: 'money', placeholder: '120000000' },
  { key: 'otherIncomeSources', label: 'Otros ingresos anuales esperados', suffix: 'money', placeholder: '0' },
  { key: 'estimatedInflation', label: 'Inflación anual estimada', suffix: '%', placeholder: '6' },
  { key: 'expectedReturnRate', label: 'Rentabilidad esperada anual', suffix: '%', placeholder: '10' },
  { key: 'netReturn', label: 'Rentabilidad neta objetivo', suffix: '%', placeholder: '4' },
  { key: 'totalSavings', label: 'Capital inicial disponible', suffix: 'money', placeholder: '50000000' },
  { key: 'riskScore', label: 'Score/rentabilidad de referencia', suffix: '%', placeholder: '8' },
  { key: 'conservativeReturnRate', label: 'Rentabilidad conservadora (Domingo)', suffix: '%', placeholder: '6' },
  { key: 'methodReturnRate', label: 'Rentabilidad con metodología (Lunes)', suffix: '%', placeholder: '14' },
  { key: 'monthlyContribution', label: 'Aporte mensual adicional', suffix: 'money', placeholder: '500000' },
]

const HIDDEN_ADVANCED_FIELDS = new Set(['riskScore', 'conservativeReturnRate', 'methodReturnRate'])
const LOCKED_ADVANCED_FIELDS = new Set(['desiredPostRetirementIncome', 'netReturn'])
const CONNECTED_ADVANCED_FIELDS = new Set(['totalSavings', 'monthlyContribution'])
const MIN_YEARS_USING_SAVINGS = 20

function getAdvancedFieldHint(key: string) {
  if (key === 'desiredPostRetirementIncome') return 'Se calcula con el ingreso mensual que elegiste en Número Dorado.'
  if (key === 'netReturn') return 'Se calcula automáticamente con la rentabilidad esperada menos la inflación.'
  if (CONNECTED_ADVANCED_FIELDS.has(key)) return 'Conectado con la pestaña “Cómo alcanzarlo”.'
  return ''
}

type FormState = Record<string, string>

const DEFAULTS: FormState = {
  age: '30',
  retirementAge: '40',
  lifeExpectancy: '60',
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
  monthlyContributionPhase2: '600000',
  methodReturnRatePhase1: '12',
  methodReturnRatePhase2: '14',
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

function enforceLifeExpectancyMinimum(form: FormState) {
  const next = { ...form }
  const retirementAge = Number(next.retirementAge || 0)
  const lifeExpectancy = Number(next.lifeExpectancy || 0)

  if (retirementAge > 0) {
    const minimumLifeExpectancy = retirementAge + MIN_YEARS_USING_SAVINGS
    if (!lifeExpectancy || lifeExpectancy < minimumLifeExpectancy) {
      next.lifeExpectancy = String(minimumLifeExpectancy)
    }
  }

  return next
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
  const lifeExpectancy = Math.max(Number(form.lifeExpectancy || 60), Number(form.age || 30) + projectionYears + MIN_YEARS_USING_SAVINGS)
  const yearsUsingSavings = Math.max(lifeExpectancy - (Number(form.age || 35) + projectionYears), 1)
  const projectedMonthlyTarget = monthlyTarget * Math.pow(1 + averageInflation / 100, projectionYears)
  const currentPassiveNeed = passiveCapitalFromMonthly(monthlyTarget, conservativeReturnRate)
  const futureMethodNeed = goldenCapitalForFutureLifestyle({
    monthlyIncome: monthlyTarget,
    yearsToTarget: projectionYears,
    yearsUsingSavings,
    annualReturn: methodReturnRate,
    inflation: averageInflation,
  })

  useEffect(() => {
    if (profile?.baseCurrency) {
      setForm(current => ({ ...current, currency: current.currency || profile.baseCurrency }))
    }
  }, [profile?.baseCurrency])

  useEffect(() => {
    if (selectedCurrency !== 'USD') return
    setForm(current => {
      const next = { ...current }
      let changed = false

      if (Number(current.monthlyContribution || 0) === 500000) {
        next.monthlyContribution = '250'
        changed = true
      }
      if (!current.monthlyContributionPhase2 || Number(current.monthlyContributionPhase2 || 0) === 600000) {
        next.monthlyContributionPhase2 = '200'
        changed = true
      }

      return changed ? next : current
    })
  }, [selectedCurrency])

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
      if (key === 'age') {
        const age = Number(next.age || 0)
        const retirementAge = Number(next.retirementAge || 0)
        if (age > 0 && retirementAge <= age) {
          next.retirementAge = String(age + 10)
        }
        return enforceLifeExpectancyMinimum(next)
      }
      if (key === 'retirementAge' || key === 'lifeExpectancy') {
        return enforceLifeExpectancyMinimum(next)
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

        </section>

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
  const averageLifeExpectancy = 60
  const conservativeReturnRate = Number(form.conservativeReturnRate || 6)
  const methodReturnRate = Number(form.methodReturnRate || form.expectedReturnRate || 14)
  const methodReturnRatePhase1 = Number(form.methodReturnRatePhase1 || methodReturnRate)
  const methodReturnRatePhase2 = Number(form.methodReturnRatePhase2 || methodReturnRatePhase1)
  const totalSavings = Number(form.totalSavings || 0)
  const monthlyContribution = Number(form.monthlyContribution || 0)
  const monthlyContributionPhase2 = Number(form.monthlyContributionPhase2 || monthlyContribution)
  const projectionYears = Math.max(1, yearsToRetirement || 10)
  const phaseOneYears = Math.min(5, projectionYears)
  const phaseTwoYears = Math.max(projectionYears - phaseOneYears, 0)
  const currentAge = Number(form.age || 30) || 30
  const lifeExpectancy = Math.max(Number(form.lifeExpectancy || averageLifeExpectancy), currentAge + projectionYears + MIN_YEARS_USING_SAVINGS)
  const yearsUsingSavings = Math.max(lifeExpectancy - (currentAge + projectionYears), 1)
  const projectedMonthlyTarget = monthlyTarget * Math.pow(1 + averageInflation / 100, projectionYears)
  const currentPassiveNeed = passiveCapitalFromMonthly(monthlyTarget, conservativeReturnRate)
  const futureConservativeNeed = goldenCapitalForFutureLifestyle({
    monthlyIncome: monthlyTarget,
    yearsToTarget: projectionYears,
    yearsUsingSavings,
    annualReturn: conservativeReturnRate,
    inflation: averageInflation,
  })
  const futureMethodNeed = goldenCapitalForFutureLifestyle({
    monthlyIncome: monthlyTarget,
    yearsToTarget: projectionYears,
    yearsUsingSavings,
    annualReturn: methodReturnRate,
    inflation: averageInflation,
  })
  const projectedCapital = projectCapitalWithContributionPhases({
    initialCapital: totalSavings,
    phaseOneMonthlyContribution: monthlyContribution,
    phaseOneAnnualReturn: methodReturnRatePhase1,
    phaseOneYears,
    phaseTwoMonthlyContribution: monthlyContributionPhase2,
    phaseTwoAnnualReturn: methodReturnRatePhase2,
    phaseTwoYears,
  })
  const totalInvested = totalSavings + (monthlyContribution * phaseOneYears * 12) + (monthlyContributionPhase2 * phaseTwoYears * 12)
  const interestGenerated = Math.max(projectedCapital - totalInvested, 0)
  const planGap = Math.max(futureMethodNeed - projectedCapital, 0)
  const planSurplus = Math.max(projectedCapital - futureMethodNeed, 0)
  const reachesGoal = projectedCapital >= futureMethodNeed && futureMethodNeed > 0
  const progress = futureMethodNeed > 0 ? Math.min((projectedCapital / futureMethodNeed) * 100, 100) : 0
  const extraYearsNeeded = calculateExtraYearsToReachGoal({
    target: futureMethodNeed,
    initialCapital: totalSavings,
    phaseOneMonthlyContribution: monthlyContribution,
    phaseOneAnnualReturn: methodReturnRatePhase1,
    phaseOneYears,
    phaseTwoMonthlyContribution: monthlyContributionPhase2,
    phaseTwoAnnualReturn: methodReturnRatePhase2,
    currentYears: projectionYears,
    maxExtraYears: 40,
  })
  const suggestedMonthlySavings = monthlySavingsRequiredForGoal({
    target: futureMethodNeed,
    initialCapital: totalSavings,
    annualReturn: methodReturnRate,
    years: projectionYears,
  })

  const updateProjectionYears = (years: number) => {
    const currentAge = Number(form.age || 30) || 30
    updateField('age', currentAge)
    updateField('retirementAge', currentAge + years)
    updateField('estimatedInflation', averageInflation)
    updateField('lifeExpectancy', Math.max(averageLifeExpectancy, currentAge + years + MIN_YEARS_USING_SAVINGS))
    updateField('conservativeReturnRate', conservativeReturnRate)
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-[#E6D8B8] bg-[#FFFDF8] p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-[#F5EFE2] p-2">
          <button
            type="button"
            onClick={() => setActiveTab('golden')}
            className={`rounded-2xl px-3 py-3 text-left transition sm:px-5 sm:py-4 ${activeTab === 'golden' ? 'bg-white text-[#171717] shadow-sm' : 'text-[#6D6470] hover:bg-white/55'}`}
          >
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#B7791F] sm:gap-2 sm:text-xs sm:tracking-[0.18em]"><Gem className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /> Número dorado</span>
            <span className="mt-1 hidden text-sm font-semibold sm:block">Calcula la meta con pocas variables.</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`rounded-2xl px-3 py-3 text-left transition sm:px-5 sm:py-4 ${activeTab === 'plan' ? 'bg-white text-[#171717] shadow-sm' : 'text-[#6D6470] hover:bg-white/55'}`}
          >
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#B7791F] sm:gap-2 sm:text-xs sm:tracking-[0.18em]"><Sparkles className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /> Cómo alcanzarlo</span>
            <span className="mt-1 hidden text-sm font-semibold sm:block">Juega con aportes, capital y rentabilidad.</span>
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
                    <StepHeader eyebrow="Tu vida actual" title="¿Cuánto ingreso mensual quieres cubrir?" text="Elige cuánto dinero te gustaría recibir cada mes para cubrir tu estilo de vida." />
                    <label className="block rounded-2xl border border-[#E6D8B8] bg-white p-5">
                      <span className="mb-2 block text-sm font-bold text-[#5E6470]">¿Cuántos años tienes?</span>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={form.age || ''}
                          onChange={event => updateField('age', event.target.value)}
                          placeholder="30"
                          className="w-full rounded-2xl border border-[#E6D8B8] bg-[#FBFAF4] px-5 py-4 font-roboto text-2xl font-black tracking-[-0.035em] text-[#171717] outline-none transition focus:border-[#E4AF24] focus:ring-2 focus:ring-[#FFB13D]/20 md:text-3xl"
                        />
                        <span className="text-sm font-black text-[#8A6100]">años</span>
                      </div>
                    </label>
                    <MoneyField label="Ingresa el monto mensual que quieres cubrir" value={monthlyTarget} currency={selectedCurrency} onCurrencyChange={currency => updateField('currency', currency)} onChange={updateMonthlyTarget} />
                    <RangeField
                      label="¿Qué rentabilidad anual quieres usar para calcular?"
                      value={conservativeReturnRate}
                      min={1}
                      max={15}
                      suffix="%"
                      onChange={value => updateField('conservativeReturnRate', value)}
                    />
                    <p className="text-sm font-semibold text-[#5E6470]">
                      Esto equivale al mes: <span className="font-black text-[#FF6B2C]">{(monthlyRateFromAnnual(conservativeReturnRate) * 100).toFixed(3)}%</span>
                    </p>
                  </div>

                  <DefinitionCard
                    eyebrow="Definición"
                    title="Dinero necesario hoy"
                    text="Esto es lo que necesitarías tener invertido hoy para producir el ingreso mensual que elegiste."
                    metricLabel="Patrimonio necesario hoy"
                    metricValue={formatCurrency(currentPassiveNeed, selectedCurrency)}
                    note={`Calculado con una rentabilidad anual del ${conservativeReturnRate}%.`}
                  />
                </div>
              </section>

              <section className="border-t border-[#E6D8B8] py-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">02 · Futuro</p>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
                  <div className="space-y-5">
                    <StepHeader eyebrow="Tu horizonte" title="¿En cuánto tiempo quieres lograrlo?" text="Elige en cuántos años quieres llegar a tu meta y prueba una rentabilidad anual estimada." />
                    <RangeField label="Años de proyección" value={projectionYears} min={5} max={40} suffix="años" onChange={updateProjectionYears} />
                    <RangeField label="Rentabilidad anual esperada" value={methodReturnRate} min={4} max={24} suffix="%" onChange={value => {
                      updateField('methodReturnRate', value)
                      updateField('expectedReturnRate', value)
                      updateField('riskScore', value)
                    }} />
                    <p className="text-sm leading-relaxed text-[#5E6470]">
                      Usamos una inflación promedio del <strong className="text-[#B7791F]">{averageInflation}% anual</strong> y calculamos al menos <strong>{MIN_YEARS_USING_SAVINGS} años</strong> de estilo de vida después de tu libertad financiera.
                    </p>
                  </div>

                  <div className="grid gap-5">
                    <DefinitionCard
                      eyebrow="Proyección"
                      title="Costo de vida futuro"
                      text="Con el tiempo, vivir igual puede costar más. Este valor estima cuánto necesitarías al mes en el futuro."
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
                <MonthlySavingsGoalCard
                  monthlySavings={suggestedMonthlySavings}
                  target={futureMethodNeed}
                  years={projectionYears}
                  annualReturn={methodReturnRate}
                  initialCapital={totalSavings}
                  currency={selectedCurrency}
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
                    text="Comparamos lo que ya tienes con la meta que necesitas alcanzar."
                    metricLabel="Número dorado con método"
                    metricValue={formatCurrency(futureMethodNeed, selectedCurrency)}
                    note={`Calculado con una rentabilidad anual del ${methodReturnRate}%.`}
                    compact
                  />
                </div>
              </section>

              <section className="border-t border-[#E6D8B8] py-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">02 · Plan por etapas</p>
                <div className="space-y-5">
                  <StepHeader eyebrow="Aportes y rentabilidad" title="Construye tu meta en dos tiempos" text="Primero defines tu etapa de arranque y después simulas cómo acelerar el plan con aportes y rentabilidad." />
                  <div className="grid gap-5 lg:grid-cols-2">
                    <PlanPhaseCard
                      title="Primeros 5 años"
                      subtitle="Tu fase de arranque y construcción de hábitos."
                      contributionLabel="Aporte mensual"
                      contributionValue={monthlyContribution}
                      contributionMax={selectedCurrency === 'COP' ? 5000000 : 5000}
                      contributionStep={selectedCurrency === 'COP' ? 50000 : 50}
                      currency={selectedCurrency}
                      onCurrencyChange={currency => updateField('currency', currency)}
                      onContributionChange={value => updateField('monthlyContribution', value)}
                      returnRate={methodReturnRatePhase1}
                      onReturnChange={value => updateField('methodReturnRatePhase1', value)}
                    />
                    <PlanPhaseCard
                      title={`Desde el año 6 hasta el año ${Math.max(projectionYears, 6)}`}
                      subtitle="Tu fase de aceleración con interés compuesto trabajando fuerte."
                      contributionLabel="Aporte mensual"
                      contributionValue={monthlyContributionPhase2}
                      contributionMax={selectedCurrency === 'COP' ? 5000000 : 5000}
                      contributionStep={selectedCurrency === 'COP' ? 50000 : 50}
                      currency={selectedCurrency}
                      onCurrencyChange={currency => updateField('currency', currency)}
                      onContributionChange={value => updateField('monthlyContributionPhase2', value)}
                      returnRate={methodReturnRatePhase2}
                      onReturnChange={value => updateField('methodReturnRatePhase2', value)}
                    />
                  </div>
                  <PlanMetricsGrid
                    currency={selectedCurrency}
                    target={futureMethodNeed}
                    projectedCapital={projectedCapital}
                    totalInvested={totalInvested}
                    interestGenerated={interestGenerated}
                  />
                </div>
              </section>

              <section className="border-t border-[#E6D8B8] py-6">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">03 · Vista de logro</p>
                <div className="max-w-3xl space-y-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">Vista de logro</p>
                    <h3 className="mt-2 max-w-2xl font-roboto text-2xl font-black leading-tight tracking-[-0.035em] text-[#171717] md:text-3xl">¿Qué tan cerca estás de alcanzarlo?</h3>
                  </div>
                  <PlanOutcomeBanner
                    reachesGoal={reachesGoal}
                    gap={planGap}
                    surplus={planSurplus}
                    years={projectionYears}
                    extraYearsNeeded={extraYearsNeeded}
                    currency={selectedCurrency}
                  />
                </div>
              </section>
            </div>

            <div className="mt-5 rounded-[2rem] border border-[#E6D8B8] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">Gráfica de avance</p>
                  <h3 className="mt-1 font-roboto text-2xl font-black text-[#171717]">Camino proyectado vs número dorado</h3>
                  <p className="mt-1 text-sm text-[#5E6470]">
                    {reachesGoal
                      ? `Tu plan alcanza la meta en ${projectionYears} años.`
                      : extraYearsNeeded
                        ? `Con este ritmo necesitarías ${extraYearsNeeded} años extra para lograrlo.`
                        : 'Con este ritmo no se alcanza dentro del horizonte máximo simulado.'}
                  </p>
                </div>
              </div>
              <LiveGoldenProjectionChart
                currency={selectedCurrency}
                target={futureMethodNeed}
                conservativeTarget={futureConservativeNeed}
                initialCapital={totalSavings}
                monthlyContribution={monthlyContribution}
                annualReturn={methodReturnRatePhase1}
                monthlyContributionPhase2={monthlyContributionPhase2}
                annualReturnPhase2={methodReturnRatePhase2}
                phaseOneYears={phaseOneYears}
                extraYearsNeeded={extraYearsNeeded}
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
            {FIELDS.filter(field => !HIDDEN_ADVANCED_FIELDS.has(field.key)).map(field => {
              const isLocked = LOCKED_ADVANCED_FIELDS.has(field.key)
              const fieldHint = getAdvancedFieldHint(field.key)

              return (
              <label key={field.key} className={`block rounded-2xl border border-[#E6D8B8] p-4 ${isLocked ? 'bg-[#F5EFE2]' : 'bg-white'}`}>
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[#5E6470]">{field.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form[field.key] ?? ''}
                    onChange={event => {
                      if (!isLocked) updateField(field.key, event.target.value)
                    }}
                    placeholder={field.placeholder}
                    disabled={isLocked}
                    aria-readonly={isLocked}
                    className={`w-full rounded-xl border border-[#E6D8B8] px-4 py-3 text-sm text-[#171717] outline-none transition focus:border-[#E4AF24] disabled:cursor-not-allowed disabled:bg-[#EFE8D8] disabled:text-[#8A8274] ${isLocked ? 'opacity-75' : 'bg-[#FBFAF4]'}`}
                  />
                  <span className="min-w-10 text-xs font-semibold text-[#5E6470]">{field.suffix === 'money' ? selectedCurrency : field.suffix}</span>
                </div>
                {fieldHint && <p className="mt-2 text-xs leading-5 text-[#8A8274]">{fieldHint}</p>}
              </label>
              )
            })}
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

function DefinitionCard({ eyebrow, title, text, metricLabel, metricValue, note, compact = false }: { eyebrow: string; title: string; text: string; metricLabel: string; metricValue: string; note: string; compact?: boolean }) {
  return (
    <div className={`flex h-full flex-col justify-center rounded-[1.75rem] border border-[#E6D8B8] bg-[linear-gradient(135deg,#FFFDF8_0%,#FFF6DD_100%)] ${compact ? 'min-h-[240px] p-5' : 'min-h-[360px] p-6'}`}>
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#B7791F]">{eyebrow}</p>
      <h3 className={`mt-3 font-roboto font-black leading-tight tracking-[-0.035em] text-[#171717] ${compact ? 'text-xl' : 'text-2xl'}`}>{title}</h3>
      <p className={`mt-3 text-sm leading-relaxed text-[#5E6470] ${compact ? 'max-w-xl' : ''}`}>{text}</p>
      <div className={`rounded-2xl border border-[#FFB13D]/45 bg-white p-4 ${compact ? 'mt-4' : 'mt-6'}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A6100]/75">{metricLabel}</p>
        <p className={`mt-2 break-words font-roboto font-black leading-none tracking-[-0.055em] text-[#171717] ${compact ? 'text-2xl' : 'text-3xl'}`}>{metricValue}</p>
        <p className="mt-3 text-xs font-semibold text-[#B7791F]">{note}</p>
      </div>
    </div>
  )
}

function PlanPhaseCard({
  title,
  subtitle,
  contributionLabel,
  contributionValue,
  contributionMax,
  contributionStep,
  currency,
  onCurrencyChange,
  onContributionChange,
  returnRate,
  onReturnChange,
}: {
  title: string
  subtitle: string
  contributionLabel: string
  contributionValue: number
  contributionMax: number
  contributionStep: number
  currency: string
  onCurrencyChange: (currency: string) => void
  onContributionChange: (value: number) => void
  returnRate: number
  onReturnChange: (value: number) => void
}) {
  const safeContribution = Number.isFinite(contributionValue) ? Math.max(contributionValue, 0) : 0

  return (
    <div className="rounded-[1.5rem] border border-[#E6D8B8] bg-white p-5 shadow-sm">
      <h3 className="font-roboto text-xl font-black tracking-[-0.03em] text-[#172033]">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-[#6B7280]">{subtitle}</p>

      <div className="mt-6 space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#6B7280]">{contributionLabel}</p>
            <p className="shrink-0 font-roboto text-base font-black text-[#E4AF24]">{formatCurrency(safeContribution, currency)}/mes</p>
          </div>
          <input type="range" min={0} max={contributionMax} step={contributionStep} value={safeContribution} onChange={event => onContributionChange(Number(event.target.value))} className="w-full accent-[#E4AF24]" />
          <div className="mt-3 flex items-stretch overflow-hidden rounded-2xl border border-[#D8DEE8] bg-[#F4F7FB]">
            <select aria-label="Moneda del aporte" value={currency} onChange={event => onCurrencyChange(event.target.value)} className="w-[92px] border-r border-[#D8DEE8] bg-[#F7FAFE] px-4 text-sm font-semibold text-[#64748B] outline-none">
              {SUPPORTED_CURRENCIES.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <input type="text" inputMode="numeric" value={formatMoneyInput(safeContribution)} onChange={event => onContributionChange(parseMoneyInput(event.target.value))} placeholder="0" className="w-full bg-transparent px-4 py-3 font-roboto text-lg font-black text-[#172033] outline-none" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#6B7280]">Rentabilidad anual</p>
            <p className="font-roboto text-base font-black text-[#E4AF24]">{returnRate.toFixed(1)}%</p>
          </div>
          <input type="range" min={4} max={24} step={0.5} value={returnRate} onChange={event => onReturnChange(Number(event.target.value))} className="w-full accent-[#E4AF24]" />
        </div>
      </div>
    </div>
  )
}

function PlanMetricsGrid({ currency, target, projectedCapital, totalInvested, interestGenerated }: { currency: string; target: number; projectedCapital: number; totalInvested: number; interestGenerated: number }) {
  const metrics = [
    { label: 'Meta', value: target, featured: false },
    { label: 'Patrimonio proyectado', value: projectedCapital, featured: true },
    { label: 'Invertido sin interés', value: totalInvested, featured: false },
    { label: 'Generado por interés', value: interestGenerated, featured: false },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map(metric => (
        <div key={metric.label} className={`rounded-2xl border p-4 ${metric.featured ? 'border-[#9DD6FF] bg-[#EFF8FF]' : 'border-[#E6D8B8] bg-white'}`}>
          <p className="text-sm font-medium text-[#6B7280]">{metric.label}</p>
          <p className="mt-1 break-words font-roboto text-xl font-black tracking-[-0.04em] text-[#172033]">{formatCurrency(metric.value, currency)}</p>
        </div>
      ))}
    </div>
  )
}

function PlanOutcomeBanner({ reachesGoal, gap, surplus, years, extraYearsNeeded, currency }: { reachesGoal: boolean; gap: number; surplus: number; years: number; extraYearsNeeded: number | null; currency: string }) {
  return (
    <div className={`rounded-2xl border p-5 text-white shadow-lg ${reachesGoal ? 'border-[#FFB13D] bg-[linear-gradient(135deg,#FF6B2C_0%,#F59E0B_100%)] shadow-[#FF6B2C]/20' : 'border-[#FF6B6B] bg-[linear-gradient(135deg,#E23B2E_0%,#FF6B2C_100%)] shadow-[#E23B2E]/20'}`}>
      <div className="flex gap-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white/85 bg-white/10 text-xl">{reachesGoal ? '✓' : '☹'}</div>
        <div>
          <p className="font-roboto text-xl font-black leading-tight md:text-2xl">
            {reachesGoal ? `Sí lo logras. Te sobrarían ${formatCurrency(surplus, currency)}` : `No lo lograste. Te faltarían ${formatCurrency(gap, currency)}`}
          </p>
          <p className="mt-2 text-sm font-medium text-white/85">
            {reachesGoal
              ? `Tu plan proyectado supera la meta en ${years} años.`
              : extraYearsNeeded
                ? `Con este ritmo necesitarías ${extraYearsNeeded} años extra. También puedes subir el aporte o mejorar la rentabilidad.`
                : `Estás por debajo de la meta. Sube el aporte mensual, mejora la rentabilidad o amplía el horizonte para llegar.`}
          </p>
        </div>
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
            Esta es la meta aproximada que necesitas construir para mantener tu estilo de vida con ingresos de tus inversiones.
          </p>
        </div>
        <div className="lg:text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.20em] text-[#8A6100]/75">Patrimonio necesario en {years} años</p>
          <p className="mt-2 break-words font-roboto text-[clamp(2.6rem,7vw,5.25rem)] font-black leading-none tracking-[-0.075em] text-[#171717]">
            {value}
          </p>
          <p className="mt-3 text-sm font-black text-[#B7791F]">Con una rentabilidad anual del {returnRate}%.</p>
        </div>
      </div>
    </div>
  )
}


function MonthlySavingsGoalCard({
  monthlySavings,
  target,
  years,
  annualReturn,
  initialCapital,
  currency,
}: {
  monthlySavings: number
  target: number
  years: number
  annualReturn: number
  initialCapital: number
  currency: string
}) {
  return (
    <div className="mt-4 relative overflow-hidden rounded-[1.9rem] border border-[#FFB13D]/70 bg-[radial-gradient(circle_at_100%_0%,rgba(255,177,61,0.28),transparent_34%),linear-gradient(135deg,#FFFFFF_0%,#FFF9EC_55%,#FFE4B8_100%)] p-5 shadow-xl shadow-[#D4AF37]/12 md:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#FF6B2C]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-[#FFB13D]/20 blur-3xl" />
      <div className="relative grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] md:items-stretch">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#B7791F]">Plan mensual sugerido</p>
          <h3 className="mt-2 font-roboto text-2xl font-black leading-tight tracking-[-0.04em] text-[#171717] md:text-3xl">Aporte para llegar a tu número dorado</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5E6470]">
            Para llegar a {formatCurrency(target, currency)} en {years} años, este es el ahorro mensual aproximado que necesitas sostener.
          </p>
          <p className="mt-3 text-xs leading-5 text-[#8A8274]">
            {initialCapital > 0
              ? `Ya descontamos tu capital inicial de ${formatCurrency(initialCapital, currency)}.`
              : `Calculado como aporte mensual constante con la rentabilidad del ${annualReturn}% que elegiste en esta pestaña.`}
          </p>
        </div>
        <div className="relative overflow-hidden rounded-[1.5rem] border border-[#FFB13D]/60 bg-white p-5 shadow-lg shadow-[#FFB13D]/10">
          <div className="absolute right-0 top-0 h-full w-24 bg-[linear-gradient(180deg,rgba(255,177,61,.24),transparent)]" />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A6100]/70">Ahorro mensual aprox.</p>
            <p className="mt-2 break-words font-roboto text-[clamp(2.45rem,6vw,4rem)] font-black leading-none tracking-[-0.07em] text-[#171717]">
              {formatCurrency(monthlySavings, currency)}
            </p>
            <div className="mt-4 rounded-xl bg-[#FFF4C7] px-3 py-2 text-xs font-black text-[#8A6100]">
              Calculado con rentabilidad anual del {annualReturn}%
            </div>
          </div>
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
  monthlyContributionPhase2,
  annualReturnPhase2,
  phaseOneYears,
  years,
}: {
  initialCapital: number
  monthlyContribution: number
  annualReturn: number
  monthlyContributionPhase2?: number
  annualReturnPhase2?: number
  phaseOneYears?: number
  years: number
}) {
  const months = Math.max(12, Math.round(years * 12))
  const phaseOneMonths = Math.max(0, Math.round((phaseOneYears ?? years) * 12))
  const phaseOneRate = monthlyRateFromAnnual(annualReturn)
  const phaseTwoRate = monthlyRateFromAnnual(annualReturnPhase2 ?? annualReturn)
  let balance = Math.max(initialCapital, 0)
  let baselineBalance = Math.max(initialCapital, 0)
  const points: Array<{ year: number; capital: number; baselineCapital: number }> = [{ year: 0, capital: balance, baselineCapital: baselineBalance }]

  for (let month = 1; month <= months; month += 1) {
    const isPhaseOne = month <= phaseOneMonths
    const contribution = isPhaseOne ? monthlyContribution : (monthlyContributionPhase2 ?? monthlyContribution)
    const monthlyRate = isPhaseOne ? phaseOneRate : phaseTwoRate
    balance = (balance + Math.max(contribution, 0)) * (1 + monthlyRate)
    baselineBalance = (baselineBalance + Math.max(monthlyContribution, 0)) * (1 + phaseOneRate)
    if (month % 12 === 0 || month === months) {
      points.push({ year: Math.round(month / 12), capital: balance, baselineCapital: baselineBalance })
    }
  }

  return points
}

function calculateExtraYearsToReachGoal({
  target,
    initialCapital,
    phaseOneMonthlyContribution,
    phaseOneAnnualReturn,
  phaseOneYears,
  phaseTwoMonthlyContribution,
  phaseTwoAnnualReturn,
  currentYears,
  maxExtraYears,
}: {
  target: number
  initialCapital: number
  phaseOneMonthlyContribution: number
  phaseOneAnnualReturn: number
  phaseOneYears: number
  phaseTwoMonthlyContribution: number
  phaseTwoAnnualReturn: number
  currentYears: number
  maxExtraYears: number
}) {
  if (!Number.isFinite(target) || target <= 0) return null

  for (let extra = 0; extra <= maxExtraYears; extra += 1) {
    const totalYears = currentYears + extra
    const projected = projectCapitalWithContributionPhases({
      initialCapital,
      phaseOneMonthlyContribution,
      phaseOneAnnualReturn,
      phaseOneYears: Math.min(phaseOneYears, totalYears),
      phaseTwoMonthlyContribution,
      phaseTwoAnnualReturn,
      phaseTwoYears: Math.max(totalYears - Math.min(phaseOneYears, totalYears), 0),
    })
    if (projected >= target) return extra
  }

  return null
}

function LiveGoldenProjectionChart({
  currency,
  target,
  conservativeTarget,
  initialCapital,
  monthlyContribution,
  annualReturn,
  monthlyContributionPhase2,
  annualReturnPhase2,
  phaseOneYears,
  extraYearsNeeded,
  years,
}: {
  currency: string
  target: number
  conservativeTarget: number
  initialCapital: number
  monthlyContribution: number
  annualReturn: number
  monthlyContributionPhase2?: number
  annualReturnPhase2?: number
  phaseOneYears?: number
  extraYearsNeeded?: number | null
  years: number
}) {
  const extendedYears = years + Math.max(extraYearsNeeded || 0, 0)
  const data = buildLiveProjectionData({ initialCapital, monthlyContribution, annualReturn, monthlyContributionPhase2, annualReturnPhase2, phaseOneYears, years: extendedYears })
  const maxValue = Math.max(target, conservativeTarget, ...data.map(point => Math.max(point.capital, point.baselineCapital)), 1)
  const achievementYear = data.find(point => point.capital >= target)?.year
  const hasExtraTime = Boolean(extraYearsNeeded && extraYearsNeeded > 0 && achievementYear && achievementYear > years)

  return (
    <div className="relative h-[420px] w-full">
      <div className="absolute left-3 right-3 top-1 z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-full border border-[#E6D8B8] bg-white/90 px-3 py-2 text-[11px] font-bold text-[#5E6470] shadow-sm backdrop-blur">
          Horizonte original: <span className="text-[#171717]">{years} años</span>
          {hasExtraTime && <> · Extra: <span className="text-[#E23B2E]">{extraYearsNeeded} años</span> · Logro: <span className="text-[#15803D]">año {achievementYear}</span></>}
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-full border border-[#E6D8B8] bg-white/90 px-3 py-2 text-[11px] font-bold text-[#5E6470] shadow-sm backdrop-blur">
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded-full bg-[#94A3B8]" /> Cómo sería</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 rounded-full bg-[#C77800]" /> Con plan</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 70, right: 28, left: 0, bottom: 18 }}>
          <defs>
            <linearGradient id="liveGoldenCapital" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF8A00" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#FF8A00" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 6" stroke="rgba(82,72,45,0.14)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: '#5E6470', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => `Año ${value}`} />
          <YAxis tick={{ fill: '#5E6470', fontSize: 11 }} tickLine={false} axisLine={false} width={72} domain={[0, maxValue * 1.12]} tickFormatter={(value) => compactCurrency(Number(value), currency)} />
          <Tooltip
            cursor={{ stroke: '#FF8A00', strokeWidth: 1 }}
            contentStyle={{ background: '#FFFFFF', border: '1px solid #E6D8B8', borderRadius: 14, color: '#171717', boxShadow: '0 18px 40px rgba(23,23,23,0.12)' }}
            formatter={(value: unknown, name: unknown) => [
              formatCurrency(value, currency),
              name === 'baselineCapital' ? 'Cómo sería' : 'Con plan',
            ]}
            labelFormatter={(label) => `Año ${label}`}
          />
          <ReferenceLine x={years} stroke="#E23B2E" strokeDasharray="5 5" label={{ value: `Meta ${years} años`, fill: '#E23B2E', fontSize: 11, position: 'top' }} />
          {hasExtraTime && <ReferenceArea x1={years} x2={achievementYear} fill="#EF4444" fillOpacity={0.08} label={{ value: `${extraYearsNeeded} años extra`, fill: '#E23B2E', fontSize: 12, position: 'insideTop' }} />}
          {conservativeTarget > 0 && <ReferenceLine y={conservativeTarget} stroke="#FF7A3D" strokeDasharray="5 5" label={{ value: 'Sin método', fill: '#D9572B', fontSize: 11, position: 'insideTopRight' }} />}
          {target > 0 && <ReferenceLine y={target} stroke="#FF8A00" strokeDasharray="8 5" label={{ value: 'Meta', fill: '#FF6B2C', fontSize: 12, fontWeight: 700, position: 'insideTopRight' }} />}
          {achievementYear !== undefined && <ReferenceLine x={achievementYear} stroke="#16A34A" strokeDasharray="4 5" label={{ value: `Logro año ${achievementYear}`, fill: '#15803D', fontSize: 11, position: 'top' }} />}
          <Line type="monotone" dataKey="baselineCapital" stroke="#94A3B8" strokeWidth={2.5} strokeDasharray="7 6" dot={false} activeDot={false} />
          <Area type="monotone" dataKey="capital" stroke="#C77800" strokeWidth={4} fill="url(#liveGoldenCapital)" />
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
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="min-w-0 flex-1 text-sm font-bold leading-snug text-[#5E6470]">{label}</span>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-[#FFF4C7] px-3 py-1 text-center text-sm font-black leading-none text-[#8A6100]">
          {safeValue} {suffix}
        </span>
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

function goldenCapitalForFutureLifestyle({
  monthlyIncome,
  yearsToTarget,
  yearsUsingSavings,
  annualReturn,
  inflation,
}: {
  monthlyIncome: number
  yearsToTarget: number
  yearsUsingSavings: number
  annualReturn: number
  inflation: number
}) {
  const annualIncome = Math.max(monthlyIncome * 12, 0)
  const inflationFactor = 1 + Math.max(inflation, 0) / 100
  const returnFactor = 1 + Math.max(annualReturn, 0) / 100
  const netReturnRate = Math.max((annualReturn - inflation) / 100, 0.0001)
  const safeYearsToTarget = Math.max(yearsToTarget, 0)
  const safeYearsUsingSavings = Math.max(yearsUsingSavings, 1)
  const futureAnnualNeed = annualIncome * Math.pow(inflationFactor, safeYearsToTarget + 1)
  const lifestyleDurationFactor = 1 - Math.pow(inflationFactor, safeYearsUsingSavings) / Math.pow(returnFactor, safeYearsUsingSavings)

  if (!Number.isFinite(lifestyleDurationFactor) || lifestyleDurationFactor <= 0) {
    return passiveCapitalFromMonthly(annualIncome / 12, annualReturn)
  }

  return futureAnnualNeed / netReturnRate * lifestyleDurationFactor
}


function monthlySavingsRequiredForGoal({
  target,
  initialCapital,
  annualReturn,
  years,
}: {
  target: number
  initialCapital: number
  annualReturn: number
  years: number
}) {
  const safeTarget = Math.max(target, 0)
  const safeInitialCapital = Math.max(initialCapital, 0)
  const months = Math.max(1, Math.round(years * 12))
  const monthlyRate = monthlyRateFromAnnual(annualReturn)
  const futureValueOfInitialCapital = safeInitialCapital * Math.pow(1 + monthlyRate, months)
  const remainingGoal = Math.max(safeTarget - futureValueOfInitialCapital, 0)

  if (remainingGoal <= 0) return 0
  if (monthlyRate <= 0) return remainingGoal / months

  const annuityDueFactor = ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate)
  return remainingGoal / annuityDueFactor
}

function projectCapitalWithContributionPhases({
  initialCapital,
  phaseOneMonthlyContribution,
  phaseOneAnnualReturn,
  phaseOneYears,
  phaseTwoMonthlyContribution,
  phaseTwoAnnualReturn,
  phaseTwoYears,
}: {
  initialCapital: number
  phaseOneMonthlyContribution: number
  phaseOneAnnualReturn: number
  phaseOneYears: number
  phaseTwoMonthlyContribution: number
  phaseTwoAnnualReturn: number
  phaseTwoYears: number
}) {
  let balance = Math.max(initialCapital, 0)
  const phases = [
    {
      months: Math.max(0, Math.round(phaseOneYears * 12)),
      contribution: Math.max(phaseOneMonthlyContribution, 0),
      monthlyRate: monthlyRateFromAnnual(phaseOneAnnualReturn),
    },
    {
      months: Math.max(0, Math.round(phaseTwoYears * 12)),
      contribution: Math.max(phaseTwoMonthlyContribution, 0),
      monthlyRate: monthlyRateFromAnnual(phaseTwoAnnualReturn),
    },
  ]

  phases.forEach(phase => {
    for (let month = 0; month < phase.months; month += 1) {
      balance = (balance + phase.contribution) * (1 + phase.monthlyRate)
    }
  })

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

  const chartData = Array.from({ length: Math.max(years, 1) + 1 }, (_, year) => ({
    year,
    value: monthlyTarget * Math.pow(1 + inflation / 100, year),
  }))
  const chartMax = Math.max(projectedMonthlyTarget, monthlyTarget, 1) * 1.15
  const chartX = margin + 26
  const chartY = 218
  const chartW = pageWidth - margin * 2 - 52
  const chartH = 248
  const chartBaseY = chartY + chartH
  const valueToY = (value: number) => chartBaseY - Math.min(value / chartMax, 1) * chartH
  const yearToX = (year: number) => chartX + (year / Math.max(years, 1)) * chartW

  doc.addPage()
  y = 48
  doc.setFillColor(255, 250, 240)
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F')
  doc.setFillColor(255, 244, 214)
  doc.roundedRect(margin, 42, pageWidth - margin * 2, 666, 22, 22, 'F')
  doc.setDrawColor(255, 177, 61)
  doc.roundedRect(margin, 42, pageWidth - margin * 2, 666, 22, 22, 'S')

  text('KEY VISUAL · PROYECCIÓN', margin + 22, y + 12, { size: 9, bold: true, color: [183, 121, 31] })
  text('Moneyflow', pageWidth - margin - 116, y + 12, { size: 18, bold: true, color: [23, 23, 23] })
  y += 52
  text('Cómo la inflación mueve tu meta', margin + 22, y, { size: 22, bold: true, color: [23, 23, 23] })
  y += 24
  text(`Mira cómo el mismo estilo de vida puede costar más en ${years} años si la inflación promedio se mantiene en ${inflation}% anual.`, margin + 22, y, { size: 10, color: [94, 100, 112], maxWidth: pageWidth - margin * 2 - 44 })

  ;[0, 0.5, 1].forEach((ratio) => {
    const gridY = chartBaseY - chartH * ratio
    doc.setDrawColor(232, 218, 188)
    ;(doc as any).setLineDashPattern([3, 4], 0)
    doc.line(chartX, gridY, chartX + chartW, gridY)
    ;(doc as any).setLineDashPattern([], 0)
    text(formatCurrency(chartMax * ratio, currency), margin + 16, gridY + 3, { size: 7, color: [94, 100, 112] })
  })

  doc.setDrawColor(160, 168, 181)
  doc.line(chartX, chartY, chartX, chartBaseY)
  doc.line(chartX, chartBaseY, chartX + chartW, chartBaseY)

  chartData.forEach((point) => {
    const x = yearToX(point.year)
    const topY = valueToY(point.value)
    doc.setDrawColor(255, 203, 134)
    doc.setLineWidth(Math.max(chartW / (chartData.length * 1.4), 2))
    doc.line(x, chartBaseY, x, topY)
  })

  doc.setDrawColor(255, 107, 44)
  doc.setLineWidth(2)
  chartData.forEach((point, index) => {
    if (index === 0) return
    const previous = chartData[index - 1]
    doc.line(yearToX(previous.year), valueToY(previous.value), yearToX(point.year), valueToY(point.value))
  })

  const labelEvery = Math.max(1, Math.ceil(years / 8))
  chartData.forEach((point) => {
    if (point.year % labelEvery !== 0 && point.year !== years) return
    text(`Año ${point.year}`, yearToX(point.year) - 10, chartBaseY + 18, { size: 7, color: [94, 100, 112] })
  })

  const cardY = chartBaseY + 54
  const cardW = (pageWidth - margin * 2 - 66) / 2
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(margin + 22, cardY, cardW, 70, 10, 10, 'F')
  doc.setDrawColor(230, 216, 184)
  doc.roundedRect(margin + 22, cardY, cardW, 70, 10, 10, 'S')
  text('HOY', margin + 38, cardY + 24, { size: 9, bold: true, color: [138, 97, 0] })
  text(formatCurrency(monthlyTarget, currency), margin + 38, cardY + 50, { size: 18, bold: true, color: [23, 23, 23] })

  doc.setFillColor(255, 244, 199)
  doc.roundedRect(margin + 44 + cardW, cardY, cardW, 70, 10, 10, 'F')
  doc.setDrawColor(255, 177, 61)
  doc.roundedRect(margin + 44 + cardW, cardY, cardW, 70, 10, 10, 'S')
  text('FUTURO', margin + 60 + cardW, cardY + 24, { size: 9, bold: true, color: [138, 97, 0] })
  text(formatCurrency(projectedMonthlyTarget, currency), margin + 60 + cardW, cardY + 50, { size: 18, bold: true, color: [255, 107, 44] })

  text(`Tu número dorado proyectado: ${formatCurrency(futureMethodNeed, currency)}`, margin + 22, cardY + 112, { size: 12, bold: true, color: [23, 23, 23], maxWidth: pageWidth - margin * 2 - 44 })
  text(`Calculado con una rentabilidad anual del ${methodReturnRate}%.`, margin + 22, cardY + 132, { size: 9, color: [183, 121, 31], maxWidth: pageWidth - margin * 2 - 44 })

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
