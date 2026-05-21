'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CalendarClock, ChevronLeft, ChevronRight, Gem, Loader2, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
  { key: 'monthlyLivingCost', label: 'Gasto mensual actual', suffix: 'money', placeholder: '6000000' },
  { key: 'annualExpenses', label: 'Gastos anuales extra', suffix: 'money', placeholder: '12000000' },
  { key: 'riskScore', label: 'Score/rentabilidad de referencia', suffix: '%', placeholder: '8' },
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
  monthlyLivingCost: '6000000',
  desiredPostRetirementIncome: '72000000',
  annualExpenses: '0',
  riskScore: '8',
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
  const [activeStep, setActiveStep] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const selectedCurrency = form.currency || profile?.baseCurrency || 'COP'
  const monthlyTarget = Number(form.monthlyLivingCost || 0) || Math.round((Number(form.desiredPostRetirementIncome || 0) || 0) / 12)
  const yearsToRetirement = Math.max(0, Number(form.retirementAge || 0) - Number(form.age || 0))
  const journeyComplete = Boolean(Number(form.age) && Number(form.retirementAge) && Number(form.desiredPostRetirementIncome))

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
    setForm(current => ({ ...current, [key]: String(value) }))
  }

  const updateMonthlyTarget = (monthly: number) => {
    setForm(current => ({
      ...current,
      monthlyLivingCost: String(monthly),
      desiredPostRetirementIncome: String(monthly * 12),
    }))
  }

  return (
    <main className="min-h-screen bg-mia-black px-4 py-8 text-mia-cream sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/calculadoras" className="mb-6 inline-flex items-center gap-2 rounded-full border border-mia-border bg-mia-surface/60 px-4 py-2 text-sm font-semibold text-neutral transition hover:border-mf-coral/60 hover:text-mia-cream">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <section className="glass rounded-3xl border border-mia-border p-6 shadow-2xl shadow-mf-coral/5 md:p-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-mf-coral/10 px-3 py-1 text-xs font-bold text-mf-coral">
                <Gem className="h-4 w-4" /> Simulador de retiro
              </div>
              <h1 className="font-heading text-3xl font-bold md:text-5xl">Número Dorado</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral md:text-base">
                Estima cuánto necesitas acumular para sostener tu estilo de vida en retiro, ajustando inflación, rentabilidad y tiempo.
              </p>
            </div>
            {loadingPrevious && <span className="inline-flex items-center gap-2 text-sm text-neutral"><Loader2 className="h-4 w-4 animate-spin" /> Cargando datos...</span>}
          </div>

          <GoldenJourney
            form={form}
            selectedCurrency={selectedCurrency}
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            updateField={updateField}
            updateMonthlyTarget={updateMonthlyTarget}
            monthlyTarget={monthlyTarget}
            yearsToRetirement={yearsToRetirement}
            journeyComplete={journeyComplete}
          />

          {error && <p className="mt-4 rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>}

          <button onClick={save} disabled={loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-mf px-6 py-4 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90 disabled:opacity-50 md:w-auto">
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {journeyComplete ? 'Calcular y guardar número dorado' : 'Completa tu mapa de libertad'}
          </button>

          {result?.results && (
            <div className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
              <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/50 bg-[radial-gradient(circle_at_18%_8%,rgba(255,230,150,0.55),transparent_30%),linear-gradient(135deg,#fff8df_0%,#f7e6a4_38%,#c8942e_100%)] p-6 shadow-2xl shadow-[#D4AF37]/20 sm:p-8 dark:bg-[radial-gradient(circle_at_18%_8%,rgba(255,215,100,0.22),transparent_32%),linear-gradient(135deg,rgba(80,55,10,0.95),rgba(28,24,15,0.96)_55%,rgba(10,10,10,0.98))]">
                <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/30 blur-3xl dark:bg-[#D4AF37]/20" />
                <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                <p className="relative text-xs font-black uppercase tracking-[0.30em] text-[#7A4E00] dark:text-[#F6D56B]">Tu Número Dorado</p>
                <p className="relative mt-4 block max-w-full whitespace-nowrap font-sans text-[clamp(1.35rem,4.25vw,2.85rem)] font-black leading-none tracking-[-0.075em] text-[#201506] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)] [font-variant-numeric:tabular-nums] dark:text-[#FFF1B8] dark:drop-shadow-none">
                  {formatCurrency(result.results.goldenNumber, selectedCurrency)}
                </p>
                <p className="relative mt-5 max-w-xl text-sm font-medium leading-relaxed text-[#5F4A16] dark:text-[#F5E7B0]/85">
                  Capital objetivo estimado para sostener tu retiro según tus supuestos de inflación, rentabilidad y tiempo.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <Metric title="Meta a valor presente" value={formatCurrency(result.results.presentValueGoal, selectedCurrency)} />
                <Metric title="Faltante estimado" value={formatCurrency(result.results.fundsNeeded, selectedCurrency)} />
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
  activeStep,
  setActiveStep,
  showAdvanced,
  setShowAdvanced,
  updateField,
  updateMonthlyTarget,
  monthlyTarget,
  yearsToRetirement,
  journeyComplete,
}: {
  form: FormState
  selectedCurrency: string
  activeStep: number
  setActiveStep: (step: number) => void
  showAdvanced: boolean
  setShowAdvanced: (value: boolean) => void
  updateField: (key: string, value: string | number) => void
  updateMonthlyTarget: (monthly: number) => void
  monthlyTarget: number
  yearsToRetirement: number
  journeyComplete: boolean
}) {
  const steps = [
    { title: 'Horizonte', icon: CalendarClock },
    { title: 'Vida ideal', icon: Sparkles },
    { title: 'Supuestos', icon: SlidersHorizontal },
    { title: 'Vista previa', icon: Gem },
  ]
  const estimatedPreview = estimateGoldenPreview(form)

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-[#D4AF37]/35 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_95%_90%,rgba(245,166,35,0.20),transparent_36%),linear-gradient(135deg,#FFF9E8_0%,#F7E8B8_46%,#E8C96F_100%)] p-5 shadow-2xl shadow-[#D4AF37]/15 md:p-6">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/60 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-[#F5A623]/20 blur-3xl" />
          <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#B8860B]/30 bg-white/55 px-3 py-1 text-xs font-black text-[#7A4E00] shadow-sm shadow-[#D4AF37]/10">
              <Gem className="h-4 w-4" /> Meta de libertad financiera
            </div>
            <h2 className="font-heading text-3xl font-black leading-tight tracking-[-0.03em] text-[#201506] md:text-4xl">Construye tu número dorado en 4 pasos</h2>
            <p className="mt-3 max-w-md text-sm font-semibold leading-relaxed text-[#6B5217]">Primero defines la vida que quieres sostener. Luego ajustas tiempo, inflación y rentabilidad para calcular tu capital objetivo.</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <GoldenSignal label="Ingreso mensual objetivo" value={formatCurrency(monthlyTarget, selectedCurrency)} />
              <GoldenSignal label="Años para construirlo" value={`${yearsToRetirement || '—'} años`} />
              <GoldenSignal label="Ahorro actual" value={formatCurrency(form.totalSavings || 0, selectedCurrency)} />
              <GoldenSignal label="Preview estimado" value={formatCurrency(estimatedPreview, selectedCurrency)} />
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-mia-border bg-mia-surface/30 p-4 md:p-5">
          <div className="mb-5 grid grid-cols-4 gap-2">
            {steps.map((step, index) => {
              const Icon = step.icon
              const active = activeStep === index
              const done = index < activeStep || (journeyComplete && index <= activeStep)
              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={`rounded-2xl border p-3 text-center transition hover:-translate-y-0.5 ${active ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#F6D56B]' : done ? 'border-gain/30 bg-gain/10 text-gain' : 'border-mia-border bg-mia-black/30 text-neutral'}`}
                >
                  <Icon className="mx-auto mb-2 h-5 w-5" />
                  <span className="hidden text-xs font-bold sm:block">{step.title}</span>
                  <span className="text-xs font-bold sm:hidden">{index + 1}</span>
                </button>
              )
            })}
          </div>

          {activeStep === 0 && (
            <div className="space-y-5">
              <StepHeader eyebrow="Paso 1" title="¿Cuándo quieres activar tu libertad?" text="Ajusta tu edad actual, edad objetivo y hasta cuándo quieres proyectar tu plan." />
              <RangeField label="Edad actual" value={Number(form.age || 0)} min={18} max={75} suffix="años" onChange={value => updateField('age', value)} />
              <RangeField label="Edad objetivo" value={Number(form.retirementAge || 0)} min={25} max={85} suffix="años" onChange={value => updateField('retirementAge', value)} />
              <RangeField label="Esperanza de vida" value={Number(form.lifeExpectancy || 0)} min={70} max={105} suffix="años" onChange={value => updateField('lifeExpectancy', value)} />
            </div>
          )}

          {activeStep === 1 && (
            <div className="space-y-5">
              <StepHeader eyebrow="Paso 2" title="Define tu vida ideal mensual" text="Elige un preset o escribe cuánto dinero mensual quieres recibir para vivir tranquilo." />
              <div className="grid gap-3 sm:grid-cols-3">
                {LIFESTYLE_PRESETS.map(preset => {
                  const active = Math.abs(monthlyTarget - preset.monthly) < 1
                  return (
                    <button key={preset.key} type="button" onClick={() => updateMonthlyTarget(preset.monthly)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-1 ${active ? 'border-[#D4AF37] bg-[#D4AF37]/15' : 'border-mia-border bg-mia-black/30 hover:border-[#D4AF37]/50'}`}>
                      <span className="text-2xl">{preset.emoji}</span>
                      <h3 className="mt-2 font-heading text-lg font-bold">{preset.label}</h3>
                      <p className="mt-1 text-sm font-bold text-[#F6D56B]">{formatCurrency(preset.monthly, selectedCurrency)}/mes</p>
                      <p className="mt-2 text-xs text-neutral">{preset.description}</p>
                    </button>
                  )
                })}
              </div>
              <MoneyField label="Ingreso mensual deseado" value={monthlyTarget} currency={selectedCurrency} onChange={updateMonthlyTarget} />
              <MoneyField label="Otros ingresos anuales esperados" value={Number(form.otherIncomeSources || 0)} currency={selectedCurrency} onChange={value => updateField('otherIncomeSources', value)} />
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-5">
              <StepHeader eyebrow="Paso 3" title="Ajusta supuestos sin complicarte" text="Puedes escoger un escenario o mover los sliders. El modo avanzado sigue disponible abajo." />
              <div className="grid gap-3 sm:grid-cols-3">
                {ASSUMPTION_PRESETS.map(preset => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      updateField('estimatedInflation', preset.inflation)
                      updateField('expectedReturnRate', preset.returnRate)
                      updateField('riskScore', preset.returnRate)
                    }}
                    className="rounded-2xl border border-mia-border bg-mia-black/30 p-4 text-left transition hover:-translate-y-1 hover:border-[#D4AF37]/50"
                  >
                    <span className="text-2xl">{preset.emoji}</span>
                    <h3 className="mt-2 font-heading text-lg font-bold">{preset.label}</h3>
                    <p className="mt-1 text-xs text-neutral">Inflación {preset.inflation}% · Rentabilidad {preset.returnRate}%</p>
                  </button>
                ))}
              </div>
              <RangeField label="Inflación estimada" value={Number(form.estimatedInflation || 0)} min={0} max={15} suffix="%" onChange={value => updateField('estimatedInflation', value)} />
              <RangeField label="Rentabilidad esperada" value={Number(form.expectedReturnRate || 0)} min={0} max={20} suffix="%" onChange={value => {
                updateField('expectedReturnRate', value)
                updateField('riskScore', value)
              }} />
              <MoneyField label="Ahorro actual para retiro" value={Number(form.totalSavings || 0)} currency={selectedCurrency} onChange={value => updateField('totalSavings', value)} />
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-5">
              <StepHeader eyebrow="Paso 4" title="Vista previa de tu meta" text="Esta es una aproximación visual. El cálculo oficial se genera al guardar el simulador." />
              <div className="rounded-[2rem] border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#F6D56B]">Preview</p>
                <p className="mt-3 font-heading text-4xl font-black text-mia-cream">{formatCurrency(estimatedPreview, selectedCurrency)}</p>
                <p className="mt-3 text-sm text-neutral">Capital estimado para producir {formatCurrency(monthlyTarget, selectedCurrency)} mensuales.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <GoldenSignal label="Actual" value={formatCurrency(form.totalSavings || 0, selectedCurrency)} />
                <GoldenSignal label="Gap aprox." value={formatCurrency(Math.max(estimatedPreview - Number(form.totalSavings || 0), 0), selectedCurrency)} />
                <GoldenSignal label="Ingreso anual" value={formatCurrency(form.desiredPostRetirementIncome || 0, selectedCurrency)} />
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" disabled={activeStep === 0} onClick={() => setActiveStep(Math.max(0, activeStep - 1))} className="inline-flex items-center gap-2 rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-sm font-bold text-neutral transition hover:border-[#D4AF37]/50 disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" /> Atrás
            </button>
            <button type="button" disabled={activeStep === steps.length - 1} onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))} className="inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-4 py-3 text-sm font-bold text-[#F6D56B] transition hover:bg-[#D4AF37]/15 disabled:cursor-not-allowed disabled:opacity-40">
              Siguiente <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-mia-border bg-mia-surface/25 p-5">
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="inline-flex items-center gap-2 text-sm font-bold text-[#F6D56B]">
          <SlidersHorizontal className="h-4 w-4" /> {showAdvanced ? 'Ocultar modo avanzado' : 'Mostrar modo avanzado'}
        </button>

        {showAdvanced && (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="block rounded-2xl border border-mia-border bg-mia-black/30 p-4">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral">Moneda de cálculo</span>
              <select
                value={selectedCurrency}
                onChange={event => updateField('currency', event.target.value)}
                className="w-full rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-sm font-semibold text-mia-cream outline-none transition focus:border-mf-coral"
              >
                {SUPPORTED_CURRENCIES.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </label>
            {FIELDS.map(field => (
              <label key={field.key} className="block rounded-2xl border border-mia-border bg-mia-black/30 p-4">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral">{field.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={form[field.key] ?? ''}
                    onChange={event => updateField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-sm text-mia-cream outline-none transition focus:border-mf-coral"
                  />
                  <span className="min-w-10 text-xs font-semibold text-neutral">{field.suffix === 'money' ? selectedCurrency : field.suffix}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function StepHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#F6D56B]">{eyebrow}</p>
      <h3 className="mt-2 font-heading text-2xl font-bold text-mia-cream">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral">{text}</p>
    </div>
  )
}

function GoldenSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#B8860B]/25 bg-white/58 p-3 shadow-sm shadow-[#B8860B]/10 backdrop-blur-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7A4E00]/75">{label}</p>
      <p className="mt-1 break-words font-heading text-lg font-black tracking-[-0.02em] text-[#201506]">{value}</p>
    </div>
  )
}

function RangeField({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  const safeValue = Number.isFinite(value) && value > 0 ? value : min
  return (
    <label className="block rounded-2xl border border-mia-border bg-mia-black/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-neutral">{label}</span>
        <span className="rounded-full bg-[#D4AF37]/10 px-3 py-1 text-sm font-black text-[#F6D56B]">{safeValue} {suffix}</span>
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

function MoneyField({ label, value, currency, onChange }: { label: string; value: number; currency: string; onChange: (value: number) => void }) {
  return (
    <label className="block rounded-2xl border border-mia-border bg-mia-black/30 p-4">
      <span className="mb-2 block text-sm font-bold text-neutral">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={value || ''}
          onChange={event => onChange(Number(event.target.value || 0))}
          className="w-full rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-sm font-semibold text-mia-cream outline-none transition focus:border-[#D4AF37]"
        />
        <span className="text-xs font-bold text-neutral">{currency}</span>
      </div>
    </label>
  )
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
          <h2 className="relative mt-3 font-heading text-3xl font-black text-[#201506] dark:text-[#FFF1B8] sm:text-5xl">Tu Número Dorado</h2>
          <p className="relative mt-5 whitespace-nowrap font-sans text-[clamp(2rem,7vw,5rem)] font-black leading-none tracking-[-0.075em] text-[#201506] [font-variant-numeric:tabular-nums] dark:text-[#FFF1B8]">
            {formatCurrency(result.results.goldenNumber, currency)}
          </p>
          <p className="relative mt-5 max-w-2xl text-sm font-medium leading-relaxed text-[#5F4A16] dark:text-[#F5E7B0]/85 sm:text-base">
            Este es el capital objetivo estimado para sostener tu retiro bajo los supuestos que ingresaste.
          </p>
        </div>

        <div className="grid gap-3 bg-mia-card p-5 sm:grid-cols-3 sm:p-6">
          <Metric title="Meta a valor presente" value={formatCurrency(result.results.presentValueGoal, currency)} />
          <Metric title="Faltante estimado" value={formatCurrency(result.results.fundsNeeded, currency)} />
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

  for (let currentAge = age; currentAge <= lifeExpectancy; currentAge += 1) {
    const yearIndex = currentAge - age
    points.push({
      age: currentAge,
      balance: Math.max(balance, 0),
      phase: currentAge < retirementAge ? 'acumulación' : 'retiro',
    })

    if (currentAge < retirementAge) {
      const annualSaving = baseAnnualSaving * Math.pow(1 + inflation, yearIndex)
      balance = balance * (1 + expectedReturn) + annualSaving
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
          <h3 className="mt-1 font-heading text-2xl font-bold text-mia-cream">Ahorro acumulado por edad</h3>
          <p className="mt-1 text-sm text-neutral">
            Barras: capital proyectado. Línea punteada: retiro a los {retirementAge} años.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-neutral">
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#F5A623]" /> Ahorro acumulado</span>
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
              formatter={(value: unknown) => [formatCurrency(value, currency), 'Ahorro acumulado']}
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
            <Bar dataKey="balance" name="Ahorro acumulado" fill="#F5A623" radius={[6, 6, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
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
    ['Meta a valor presente', formatCurrency(results.presentValueGoal, currency)],
    ['Faltante estimado', formatCurrency(results.fundsNeeded, currency)],
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
      <p className="mt-2 font-heading text-2xl font-bold text-mia-cream">{value}</p>
    </div>
  )
}
