'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BadgeDollarSign, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Flame, HeartPulse, Loader2, Plus, Route, Save, SearchCheck, ShieldCheck, Sparkles, Target, Trash2, WalletCards } from 'lucide-react'
import UserRegistrationModal from '@/components/auth/UserRegistrationModal'
import SimulatorActionBar from '@/components/simuladores/SimulatorActionBar'
import { pushEvent, trackMetaEvent } from '@/lib/analytics'
import { simulatorsApi } from '@/services/api/simulators.api'
import { useUserStore } from '@/stores/user.store'

type AntiDebtKey = 'diagnostico-emocional-deuda' | 'diagnostico-financiero-deuda' | 'plan-pago-deuda' | 'analiza-tu-deuda'
type Debt = { id: string; creditor: string; debtType: string; balance: number; monthlyPayment: number; annualRate: number; remainingMonths: number }

type Props = { simulatorKey: AntiDebtKey }

const CONFIG: Record<AntiDebtKey, { title: string; subtitle: string; icon: any; color: string; contentName: string }> = {
  'diagnostico-emocional-deuda': {
    title: 'Diagnóstico emocional de deuda',
    subtitle: 'Identifica tu arquetipo, riesgo de recaída y ruta inicial para pasar de deudor a inversionista.',
    icon: HeartPulse,
    color: 'text-pink-300 bg-pink-400/10 border-pink-400/30',
    contentName: 'diagnostico_emocional_deuda',
  },
  'diagnostico-financiero-deuda': {
    title: 'Diagnóstico financiero de deuda',
    subtitle: 'Mide carga de deuda, liquidez, semáforo financiero y método recomendado de pago.',
    icon: BadgeDollarSign,
    color: 'text-gain bg-gain/10 border-gain/30',
    contentName: 'diagnostico_financiero_deuda',
  },
  'plan-pago-deuda': {
    title: 'Plan de pago de deuda',
    subtitle: 'Compara bola de nieve y avalancha, calcula fecha de libertad y ahorro en intereses.',
    icon: Route,
    color: 'text-mf-orange bg-mf-orange/10 border-mf-orange/30',
    contentName: 'plan_pago_deuda',
  },
  'analiza-tu-deuda': {
    title: 'Analiza tu deuda',
    subtitle: 'Simula abonos, tasa y plazo para saber si conviene pagar, reestructurar o invertir excedentes.',
    icon: SearchCheck,
    color: 'text-sky-300 bg-sky-400/10 border-sky-400/30',
    contentName: 'analiza_tu_deuda',
  },
}

const EMOTIONAL_QUESTIONS = [
  'Me siento sobrepasado por mis deudas.', 'Evito revisar saldos o extractos por ansiedad.', 'No tengo claro cuánto debo en total.', 'Las deudas afectan mi sueño o concentración.', 'Siento que necesito ayuda para ordenar mi situación.',
  'Pago lo más urgente aunque no sea lo más estratégico.', 'No tengo un plan escrito de salida de deuda.', 'Uso deuda para cubrir huecos de flujo mensual.', 'Uso deuda para invertir o mover dinero.', 'Me cuesta separar deuda productiva de deuda de consumo.',
  'Después de pagar, vuelvo a endeudarme.', 'Hago compras impulsivas financiadas.', 'Uso avances o nuevas tarjetas para pagar deudas.', 'He refinanciado sin cambiar hábitos.', 'Las fechas de pago me toman por sorpresa.',
  'Conozco la tasa de cada deuda.', 'Tengo un fondo mínimo para imprevistos.', 'Sé qué deuda pagar primero.', 'Negocio tasas o condiciones cuando lo necesito.', 'Mis pagos están conectados a una meta de inversión.',
]

const EMOTIONAL_GROUPS = [
  { title: 'Ansiedad y claridad', eyebrow: 'Bloque 1', color: 'text-pink-300', bg: 'bg-pink-400/10', border: 'border-pink-400/30', icon: HeartPulse },
  { title: 'Decisiones bajo presión', eyebrow: 'Bloque 2', color: 'text-mf-orange', bg: 'bg-mf-orange/10', border: 'border-mf-orange/30', icon: Target },
  { title: 'Hábitos y recaídas', eyebrow: 'Bloque 3', color: 'text-loss', bg: 'bg-loss/10', border: 'border-loss/30', icon: Flame },
  { title: 'Control e inversión', eyebrow: 'Bloque 4', color: 'text-gain', bg: 'bg-gain/10', border: 'border-gain/30', icon: ShieldCheck },
]

const EMOTIONAL_SCALE = [
  { value: 1, label: 'Nunca', emoji: '😌', hint: 'No me pasa' },
  { value: 2, label: 'Poco', emoji: '🙂', hint: 'Rara vez' },
  { value: 3, label: 'A veces', emoji: '😐', hint: 'Intermedio' },
  { value: 4, label: 'Mucho', emoji: '😟', hint: 'Me pesa' },
  { value: 5, label: 'Siempre', emoji: '🔥', hint: 'Urgente' },
]

const defaultDebt = (index = 1): Debt => ({
  id: `debt-${Date.now()}-${index}`,
  creditor: `Deuda ${index}`,
  debtType: 'consumo',
  balance: 0,
  monthlyPayment: 0,
  annualRate: 0,
  remainingMonths: 12,
})

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const percent = new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 1 })

export default function AntiDebtSimulator({ simulatorKey }: Props) {
  const { isRegistered, profile, refreshProfile } = useUserStore()
  const config = CONFIG[simulatorKey]
  const Icon = config.icon
  const [loading, setLoading] = useState(false)
  const [loadingPrevious, setLoadingPrevious] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [emotionalAnswers, setEmotionalAnswers] = useState<Record<string, number>>({})
  const [financial, setFinancial] = useState({ fixedIncome: 0, variableIncome: 0, fixedExpenses: 0, variableExpenses: 0, savings: 0, creditBureauStatus: 'no_se' })
  const [debts, setDebts] = useState<Debt[]>([defaultDebt(1)])
  const [plan, setPlan] = useState({ monthlyDebtBudget: 0, extraMonthly: 0, method: 'compare' })
  const [analysisDebt, setAnalysisDebt] = useState<Debt>(defaultDebt(1))
  const [scenario, setScenario] = useState({ oneTimeExtra: 0, recurringExtra: 0, newAnnualRate: 0, newTermMonths: 12 })

  useEffect(() => {
    if (!profile?.id) return
    let active = true
    setLoadingPrevious(true)
    simulatorsApi.getResponse(profile.id, simulatorKey)
      .then(response => {
        if (!active || !response) return
        hydrateFromSaved(response.input as any)
        if (response.result) setResult(response.result)
      })
      .catch(() => undefined)
      .finally(() => active && setLoadingPrevious(false))
    return () => { active = false }
  }, [profile?.id, simulatorKey])

  const input = useMemo(() => buildInput(), [simulatorKey, emotionalAnswers, financial, debts, plan, analysisDebt, scenario])

  if (!isRegistered || !profile?.id) {
    return <UserRegistrationModal toolName={simulatorKey} contentName={config.contentName} onClose={() => undefined} />
  }

  function hydrateFromSaved(saved: any) {
    if (!saved) return
    if (saved.answers) setEmotionalAnswers(saved.answers)
    if (saved.financial) setFinancial(current => ({ ...current, ...saved.financial }))
    if (Array.isArray(saved.debts) && saved.debts.length) setDebts(saved.debts)
    if (saved.plan) setPlan(current => ({ ...current, ...saved.plan }))
    if (saved.debt) setAnalysisDebt(saved.debt)
    if (saved.scenario) setScenario(current => ({ ...current, ...saved.scenario }))
  }

  function buildInput() {
    if (simulatorKey === 'diagnostico-emocional-deuda') return { answers: emotionalAnswers }
    if (simulatorKey === 'diagnostico-financiero-deuda') return { ...financial, debts }
    if (simulatorKey === 'plan-pago-deuda') return { debts, ...plan }
    return { debt: analysisDebt, ...scenario }
  }

  async function calculateAndSave() {
    if (!profile?.id) return
    setLoading(true)
    setError(null)
    try {
      const response = await simulatorsApi.saveAntiDebtSimulator(profile.id, simulatorKey, input)
      setResult(response.result)
      pushEvent('results_viewed', { simulatorKey, status: response.status, version: response.result?.version })
      trackMetaEvent('Lead', { content_name: config.contentName })
      void refreshProfile()
    } catch (err) {
      setError((err as Error).message || 'No pudimos calcular este simulador.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-mia-black px-4 py-8 text-mia-cream sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/calculadoras" className="mb-6 inline-flex items-center gap-2 rounded-full border border-mia-border bg-mia-surface/60 px-4 py-2 text-sm font-semibold text-neutral transition hover:border-mf-coral/60 hover:text-mia-cream">
          <ArrowLeft className="h-4 w-4" /> Volver a calculadoras
        </Link>

        <section className="glass rounded-3xl border border-mia-border p-6 shadow-2xl shadow-mf-coral/5 md:p-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${config.color}`}>
                <Icon className="h-4 w-4" /> Kit Anti-Deuda · medible v1
              </div>
              <h1 className="font-heading text-3xl font-bold md:text-5xl">{config.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral md:text-base">{config.subtitle}</p>
            </div>
            {loadingPrevious && <span className="inline-flex items-center gap-2 text-sm text-neutral"><Loader2 className="h-4 w-4 animate-spin" /> Cargando guardado...</span>}
          </div>

          {simulatorKey === 'diagnostico-emocional-deuda' && <EmotionalForm answers={emotionalAnswers} setAnswers={setEmotionalAnswers} />}
          {simulatorKey === 'diagnostico-financiero-deuda' && <FinancialForm financial={financial} setFinancial={setFinancial} debts={debts} setDebts={setDebts} />}
          {simulatorKey === 'plan-pago-deuda' && <PaymentPlanForm debts={debts} setDebts={setDebts} plan={plan} setPlan={setPlan} />}
          {simulatorKey === 'analiza-tu-deuda' && <DebtAnalyzerForm debt={analysisDebt} setDebt={setAnalysisDebt} scenario={scenario} setScenario={setScenario} />}

          {error && <p className="mt-4 rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>}

          <button onClick={calculateAndSave} disabled={loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-mf px-6 py-4 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90 disabled:opacity-50 md:w-auto">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Calcular y guardar resultado
          </button>

          {result && <ResultPanel simulatorKey={simulatorKey} result={result} />}

          <SimulatorActionBar
            title={config.title}
            description={config.subtitle}
            result={result}
            fileBaseName={simulatorKey}
            advisorMessage={`Hola Moneyflow, quiero agendar una asesoría para revisar mis resultados de ${config.title}.`}
            shareMessage={`Estoy usando ${config.title} de Moneyflow para ordenar mi ruta anti-deuda.`}
          />
        </section>
      </div>
    </main>
  )
}

function EmotionalForm({ answers, setAnswers }: { answers: Record<string, number>; setAnswers: (value: Record<string, number>) => void }) {
  const [activeIndex, setActiveIndex] = useState(() => {
    const firstMissing = EMOTIONAL_QUESTIONS.findIndex((_, index) => !answers[`p${index + 1}`])
    return firstMissing >= 0 ? firstMissing : 0
  })
  const activeKey = `p${activeIndex + 1}`
  const activeValue = answers[activeKey]
  const answeredCount = EMOTIONAL_QUESTIONS.filter((_, index) => answers[`p${index + 1}`]).length
  const progress = Math.round((answeredCount / EMOTIONAL_QUESTIONS.length) * 100)
  const groupIndex = Math.floor(activeIndex / 5)
  const group = EMOTIONAL_GROUPS[groupIndex] || EMOTIONAL_GROUPS[0]
  const GroupIcon = group.icon
  const average = answeredCount
    ? EMOTIONAL_QUESTIONS.reduce((sum, _, index) => sum + (answers[`p${index + 1}`] || 0), 0) / answeredCount
    : 0

  function answerQuestion(value: number) {
    setAnswers({ ...answers, [activeKey]: value })
    if (activeIndex < EMOTIONAL_QUESTIONS.length - 1) {
      window.setTimeout(() => setActiveIndex(activeIndex + 1), 140)
    }
  }

  function jumpToFirstMissing() {
    const firstMissing = EMOTIONAL_QUESTIONS.findIndex((_, index) => !answers[`p${index + 1}`])
    setActiveIndex(firstMissing >= 0 ? firstMissing : EMOTIONAL_QUESTIONS.length - 1)
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-pink-400/20 bg-gradient-to-br from-pink-400/10 via-mia-card/80 to-mia-black p-5 md:p-6">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-mf-coral/10 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${group.border} ${group.bg} ${group.color}`}>
              <GroupIcon className="h-4 w-4" /> {group.eyebrow} · {group.title}
            </div>
            <h2 className="font-heading text-3xl font-bold leading-tight md:text-4xl">Responde una señal a la vez</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral">
              No es un examen. Es un mapa emocional para detectar ansiedad, hábitos de recaída y qué tan lista está tu ruta anti-deuda.
            </p>

            <div className="mt-6 rounded-2xl border border-mia-border bg-mia-black/35 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-neutral">
                <span>Progreso del diagnóstico</span>
                <span>{answeredCount}/{EMOTIONAL_QUESTIONS.length} · {progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-mia-card">
                <div className="h-full rounded-full bg-gradient-mf transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniSignal label="Intensidad promedio" value={answeredCount ? `${average.toFixed(1)}/5` : '—'} />
                <MiniSignal label="Siguiente desbloqueo" value={progress >= 100 ? 'Resultado listo' : `${EMOTIONAL_QUESTIONS.length - answeredCount} señales`} />
              </div>
            </div>
          </div>

          <article className="relative rounded-[2rem] border border-mia-border bg-mia-black/45 p-5 shadow-2xl shadow-pink-400/10 md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-pink-300">Señal {activeIndex + 1} de {EMOTIONAL_QUESTIONS.length}</p>
                <h3 className="mt-3 font-heading text-2xl font-bold leading-tight text-mia-cream md:text-3xl">{EMOTIONAL_QUESTIONS[activeIndex]}</h3>
              </div>
              {activeValue && (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-pink-400/30 bg-pink-400/10 text-2xl">
                  {EMOTIONAL_SCALE.find(item => item.value === activeValue)?.emoji}
                </div>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-5">
              {EMOTIONAL_SCALE.map(option => {
                const active = activeValue === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => answerQuestion(option.value)}
                    className={`group rounded-2xl border p-3 text-center transition hover:-translate-y-1 ${active ? 'border-pink-400 bg-pink-400/15 shadow-lg shadow-pink-400/10' : 'border-mia-border bg-mia-card/60 hover:border-pink-400/50'}`}
                  >
                    <span className="block text-2xl transition group-hover:scale-110">{option.emoji}</span>
                    <span className={`mt-2 block text-sm font-bold ${active ? 'text-mia-cream' : 'text-neutral'}`}>{option.label}</span>
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral/70">{option.hint}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => answerQuestion(1)} className="rounded-xl border border-gain/30 bg-gain/10 px-4 py-3 text-sm font-bold text-gain">Estoy bien</button>
              <button type="button" onClick={() => answerQuestion(3)} className="rounded-xl border border-mf-orange/30 bg-mf-orange/10 px-4 py-3 text-sm font-bold text-mf-orange">A veces</button>
              <button type="button" onClick={() => answerQuestion(5)} className="rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm font-bold text-loss">Me urge</button>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button type="button" disabled={activeIndex === 0} onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))} className="inline-flex items-center gap-2 rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-sm font-bold text-neutral transition hover:border-pink-400/40 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" /> Atrás
              </button>
              <button type="button" onClick={jumpToFirstMissing} className="hidden rounded-xl border border-mia-border px-4 py-3 text-sm font-bold text-neutral transition hover:border-mf-coral/50 hover:text-mia-cream sm:inline-flex">
                Ir a pendiente
              </button>
              <button type="button" disabled={activeIndex >= EMOTIONAL_QUESTIONS.length - 1} onClick={() => setActiveIndex(Math.min(EMOTIONAL_QUESTIONS.length - 1, activeIndex + 1))} className="inline-flex items-center gap-2 rounded-xl border border-pink-400/40 bg-pink-400/10 px-4 py-3 text-sm font-bold text-pink-300 transition hover:bg-pink-400/15 disabled:cursor-not-allowed disabled:opacity-40">
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-[2rem] border border-mia-border bg-mia-surface/30 p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-mf-coral">Mapa de señales</p>
            <h3 className="font-heading text-2xl font-bold">Tu tablero emocional</h3>
            <p className="mt-1 text-sm text-neutral">Toca cualquier punto para editar una respuesta. Los colores altos indican más urgencia.</p>
          </div>
          {progress === 100 && (
            <div className="inline-flex items-center gap-2 rounded-full border border-gain/30 bg-gain/10 px-3 py-1 text-xs font-bold text-gain">
              <CheckCircle2 className="h-4 w-4" /> Listo para calcular
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {EMOTIONAL_GROUPS.map((item, groupPosition) => {
            const Icon = item.icon
            const start = groupPosition * 5
            const groupAnswered = EMOTIONAL_QUESTIONS.slice(start, start + 5).filter((_, offset) => answers[`p${start + offset + 1}`]).length
            return (
              <div key={item.title} className={`rounded-2xl border p-4 ${item.border} ${item.bg}`}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wide ${item.color}`}>{item.eyebrow}</p>
                    <p className="text-sm font-bold text-mia-cream">{item.title}</p>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 5 }).map((_, offset) => {
                    const questionIndex = start + offset
                    const key = `p${questionIndex + 1}`
                    const value = answers[key]
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveIndex(questionIndex)}
                        className={`h-9 rounded-xl border text-xs font-bold transition hover:scale-105 ${getEmotionalDotClass(value, activeIndex === questionIndex)}`}
                        title={EMOTIONAL_QUESTIONS[questionIndex]}
                      >
                        {value || questionIndex + 1}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 text-xs font-semibold text-neutral">{groupAnswered}/5 señales respondidas</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function MiniSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-mia-border bg-mia-card/60 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral">{label}</p>
      <p className="mt-1 font-heading text-lg font-bold text-mia-cream">{value}</p>
    </div>
  )
}

function getEmotionalDotClass(value?: number, active?: boolean) {
  const activeRing = active ? 'ring-2 ring-pink-300 ring-offset-2 ring-offset-mia-black' : ''
  if (!value) return `border-mia-border bg-mia-black/40 text-neutral ${activeRing}`
  if (value <= 2) return `border-gain/40 bg-gain/15 text-gain ${activeRing}`
  if (value === 3) return `border-mf-orange/40 bg-mf-orange/15 text-mf-orange ${activeRing}`
  return `border-loss/40 bg-loss/15 text-loss ${activeRing}`
}

function FinancialForm({ financial, setFinancial, debts, setDebts }: { financial: any; setFinancial: (value: any) => void; debts: Debt[]; setDebts: (value: Debt[]) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <NumberField label="Ingreso fijo mensual" value={financial.fixedIncome} onChange={fixedIncome => setFinancial({ ...financial, fixedIncome })} />
        <NumberField label="Ingreso variable mensual" value={financial.variableIncome} onChange={variableIncome => setFinancial({ ...financial, variableIncome })} />
        <NumberField label="Ahorros disponibles" value={financial.savings} onChange={savings => setFinancial({ ...financial, savings })} />
        <NumberField label="Gastos fijos" value={financial.fixedExpenses} onChange={fixedExpenses => setFinancial({ ...financial, fixedExpenses })} />
        <NumberField label="Gastos variables" value={financial.variableExpenses} onChange={variableExpenses => setFinancial({ ...financial, variableExpenses })} />
        <label className="block text-sm font-semibold text-neutral">Estado en centrales
          <select value={financial.creditBureauStatus} onChange={event => setFinancial({ ...financial, creditBureauStatus: event.target.value })} className="mt-2 w-full rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-mia-cream outline-none focus:border-mf-coral">
            <option value="al_dia">Al día</option><option value="reporte_negativo">Reporte negativo</option><option value="no_se">No sé</option>
          </select>
        </label>
      </div>
      <DebtEditor debts={debts} setDebts={setDebts} />
    </div>
  )
}

function PaymentPlanForm({ debts, setDebts, plan, setPlan }: { debts: Debt[]; setDebts: (value: Debt[]) => void; plan: any; setPlan: (value: any) => void }) {
  const strategyOptions = [
    { key: 'compare', title: 'Comparar por mí', icon: Sparkles, text: 'Moneyflow elige el mejor balance entre ahorro, avance y tranquilidad.' },
    { key: 'snowball', title: 'Bola de nieve', icon: ShieldCheck, text: 'Ataca primero la deuda más pequeña para ganar motivación rápido.' },
    { key: 'avalanche', title: 'Avalancha', icon: Flame, text: 'Ataca primero la tasa más alta para ahorrar más intereses.' },
  ]
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-mf-coral/20 bg-gradient-to-br from-mf-coral/10 via-mia-card/60 to-mia-black/40 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl border border-mf-coral/30 bg-mf-coral/10 p-3 text-mf-coral"><Target className="h-5 w-5" /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mf-coral">Elige tu misión</p>
            <h2 className="font-heading text-2xl font-bold">¿Qué estilo de salida quieres probar?</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {strategyOptions.map(option => {
            const Icon = option.icon
            const active = plan.method === option.key
            return (
              <button key={option.key} type="button" onClick={() => setPlan({ ...plan, method: option.key })} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-1 ${active ? 'border-mf-coral bg-mf-coral/15 shadow-lg shadow-mf-coral/10' : 'border-mia-border bg-mia-black/30 hover:border-mf-coral/40'}`}>
                <Icon className={`mb-3 h-6 w-6 ${active ? 'text-mf-coral' : 'text-neutral'}`} />
                <h3 className="font-heading text-lg font-bold text-mia-cream">{option.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-neutral">{option.text}</p>
              </button>
            )
          })}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <NumberField label="Presupuesto mensual total para deudas" value={plan.monthlyDebtBudget} onChange={monthlyDebtBudget => setPlan({ ...plan, monthlyDebtBudget })} />
        <NumberField label="Abono extra mensual" value={plan.extraMonthly} onChange={extraMonthly => setPlan({ ...plan, extraMonthly })} />
      </div>
      <DebtEditor debts={debts} setDebts={setDebts} />
    </div>
  )
}

function DebtAnalyzerForm({ debt, setDebt, scenario, setScenario }: { debt: Debt; setDebt: (value: Debt) => void; scenario: any; setScenario: (value: any) => void }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <DebtCardPreview debt={debt} index={0} isActive />
        <div className="rounded-[2rem] border border-mia-border bg-mia-surface/30 p-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-mf-coral">Modo focus</p>
          <h2 className="font-heading text-2xl font-bold">Juega con una deuda y mira el impacto</h2>
          <p className="mt-2 text-sm text-neutral">Completa los datos mínimos y prueba abonos, tasa nueva o plazo nuevo sin sentirlo como una tabla.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TextField label="Entidad / deuda" value={debt.creditor} onChange={creditor => setDebt({ ...debt, creditor })} />
            <DebtTypePicker value={debt.debtType} onChange={debtType => setDebt({ ...debt, debtType })} />
            <NumberField label="Saldo actual" value={debt.balance} onChange={balance => setDebt({ ...debt, balance })} />
            <NumberField label="Cuota mensual actual" value={debt.monthlyPayment} onChange={monthlyPayment => setDebt({ ...debt, monthlyPayment })} />
            <NumberField label="Tasa efectiva anual (%)" value={debt.annualRate} onChange={annualRate => setDebt({ ...debt, annualRate })} />
            <NumberField label="Meses restantes" value={debt.remainingMonths} onChange={remainingMonths => setDebt({ ...debt, remainingMonths })} />
          </div>
        </div>
      </section>
      <section className="rounded-[2rem] border border-mf-orange/20 bg-mf-orange/10 p-5">
        <div className="mb-4 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-mf-orange" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mf-orange">Escenario optimizado</p>
            <h3 className="font-heading text-xl font-bold">¿Qué pasaría si haces un movimiento distinto?</h3>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField label="Abono único adicional" value={scenario.oneTimeExtra} onChange={oneTimeExtra => setScenario({ ...scenario, oneTimeExtra })} />
          <NumberField label="Abono extra mensual" value={scenario.recurringExtra} onChange={recurringExtra => setScenario({ ...scenario, recurringExtra })} />
          <NumberField label="Nueva tasa EA (%)" value={scenario.newAnnualRate} onChange={newAnnualRate => setScenario({ ...scenario, newAnnualRate })} />
          <NumberField label="Nuevo plazo en meses" value={scenario.newTermMonths} onChange={newTermMonths => setScenario({ ...scenario, newTermMonths })} />
        </div>
      </section>
    </div>
  )
}

function DebtEditor({ debts, setDebts }: { debts: Debt[]; setDebts: (value: Debt[]) => void }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const safeIndex = Math.min(activeIndex, Math.max(debts.length - 1, 0))
  const activeDebt = debts[safeIndex] || defaultDebt(1)
  const updateDebt = (index: number, patch: Partial<Debt>) => setDebts(debts.map((debt, currentIndex) => currentIndex === index ? { ...debt, ...patch } : debt))

  function addDebt() {
    const nextDebts = [...debts, defaultDebt(debts.length + 1)]
    setDebts(nextDebts)
    setActiveIndex(nextDebts.length - 1)
  }

  function removeDebt(index: number) {
    const nextDebts = debts.filter((_, currentIndex) => currentIndex !== index)
    setDebts(nextDebts.length ? nextDebts : [defaultDebt(1)])
    setActiveIndex(Math.max(0, Math.min(index - 1, nextDebts.length - 1)))
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-mf-coral/20 bg-gradient-to-br from-mf-coral/10 via-mia-card/70 to-mia-black p-5">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-mf-coral/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-mf-coral/30 bg-mf-coral/10 px-3 py-1 text-xs font-bold text-mf-coral">
              <WalletCards className="h-4 w-4" /> Inventario tipo cards · {safeIndex + 1}/{debts.length}
            </div>
            <h2 className="font-heading text-2xl font-bold">Agrega tus deudas como si estuvieras armando un mazo</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral">Una deuda a la vez. Al final te mostramos cuáles queman más dinero, cuáles dan victoria rápida y cuál debería ser tu primera misión.</p>
          </div>
          <button type="button" onClick={addDebt} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf px-4 py-3 text-sm font-bold text-white shadow-lg shadow-mf-coral/20">
            <Plus className="h-4 w-4" /> Nueva deuda
          </button>
        </div>

        <div className="relative mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-3">
            <DebtCardPreview debt={activeDebt} index={safeIndex} isActive />
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled={safeIndex === 0} onClick={() => setActiveIndex(Math.max(0, safeIndex - 1))} className="inline-flex items-center justify-center gap-2 rounded-xl border border-mia-border bg-mia-black/40 px-4 py-3 text-sm font-bold text-neutral transition hover:border-mf-coral/40 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              <button type="button" disabled={safeIndex >= debts.length - 1} onClick={() => setActiveIndex(Math.min(debts.length - 1, safeIndex + 1))} className="inline-flex items-center justify-center gap-2 rounded-xl border border-mf-coral/40 bg-mf-coral/10 px-4 py-3 text-sm font-bold text-mf-coral transition hover:bg-mf-coral/15 disabled:cursor-not-allowed disabled:opacity-40">
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-mia-border bg-mia-black/35 p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-mf-coral">Completa la card</p>
                <h3 className="font-heading text-2xl font-bold">Deuda {safeIndex + 1}</h3>
              </div>
              {debts.length > 1 && (
                <button type="button" onClick={() => removeDebt(safeIndex)} className="rounded-xl border border-loss/30 bg-loss/10 p-3 text-loss transition hover:bg-loss/15" aria-label="Eliminar deuda">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Nombre o entidad" value={activeDebt.creditor} onChange={creditor => updateDebt(safeIndex, { creditor })} />
              <DebtTypePicker value={activeDebt.debtType} onChange={debtType => updateDebt(safeIndex, { debtType })} />
              <NumberField label="Saldo total" value={activeDebt.balance} onChange={balance => updateDebt(safeIndex, { balance })} />
              <NumberField label="Cuota mensual" value={activeDebt.monthlyPayment} onChange={monthlyPayment => updateDebt(safeIndex, { monthlyPayment })} />
              <NumberField label="Tasa EA (%)" value={activeDebt.annualRate} onChange={annualRate => updateDebt(safeIndex, { annualRate })} />
              <NumberField label="Meses restantes" value={activeDebt.remainingMonths} onChange={remainingMonths => updateDebt(safeIndex, { remainingMonths })} />
            </div>

            <DebtQuickActions
              debt={activeDebt}
              onPatch={patch => updateDebt(safeIndex, patch)}
            />
          </div>
        </div>
      </section>

      <DebtSwipeReview debts={debts} activeIndex={safeIndex} setActiveIndex={setActiveIndex} />
    </div>
  )
}

function DebtTypePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = [
    { key: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
    { key: 'consumo', label: 'Consumo', icon: WalletCards },
    { key: 'informal', label: 'Informal', icon: Flame },
    { key: 'hipotecario', label: 'Largo plazo', icon: ShieldCheck },
  ]
  return (
    <div>
      <p className="text-sm font-semibold text-neutral">Tipo</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map(option => {
          const Icon = option.icon
          const active = value === option.key
          return (
            <button key={option.key} type="button" onClick={() => onChange(option.key)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${active ? 'border-mf-coral bg-mf-coral/15 text-mia-cream' : 'border-mia-border bg-mia-card text-neutral hover:border-mf-coral/40'}`}>
              <Icon className="h-4 w-4" /> {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DebtQuickActions({ debt, onPatch }: { debt: Debt; onPatch: (patch: Partial<Debt>) => void }) {
  return (
    <div className="mt-5 rounded-2xl border border-mf-orange/20 bg-mf-orange/10 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-mf-orange">Atajos rápidos</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onPatch({ annualRate: Math.max(debt.annualRate, 36), debtType: 'tarjeta' })} className="rounded-full border border-mf-orange/30 px-3 py-2 text-xs font-bold text-mf-orange transition hover:bg-mf-orange/10">Es tarjeta cara</button>
        <button type="button" onClick={() => onPatch({ remainingMonths: 6 })} className="rounded-full border border-mf-orange/30 px-3 py-2 text-xs font-bold text-mf-orange transition hover:bg-mf-orange/10">Quiero salir rápido</button>
        <button type="button" onClick={() => onPatch({ monthlyPayment: Math.round((debt.balance || 0) * 0.08) })} className="rounded-full border border-mf-orange/30 px-3 py-2 text-xs font-bold text-mf-orange transition hover:bg-mf-orange/10">Cuota estimada 8%</button>
        <button type="button" onClick={() => onPatch({ annualRate: 0 })} className="rounded-full border border-mf-orange/30 px-3 py-2 text-xs font-bold text-mf-orange transition hover:bg-mf-orange/10">Sin interés</button>
      </div>
    </div>
  )
}

function DebtCardPreview({ debt, index, isActive = false }: { debt: Debt; index: number; isActive?: boolean }) {
  const risk = getDebtRisk(debt)
  const monthlyWeight = debt.balance > 0 ? Math.min(100, Math.round((debt.monthlyPayment / debt.balance) * 100)) : 0
  return (
    <article className={`relative min-h-[320px] overflow-hidden rounded-[2rem] border p-5 shadow-2xl transition ${risk.cardClass} ${isActive ? 'scale-100' : 'scale-[0.98]'}`}>
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-mf-orange/14 blur-2xl" />
      <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-mf-coral/8 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A96122]">Card #{index + 1}</p>
          <h3 className="mt-2 font-heading text-3xl font-black text-[#24150D]">{debt.creditor || `Deuda ${index + 1}`}</h3>
          <p className="mt-1 text-sm font-bold capitalize text-[#7A4B2D]">{formatDebtType(debt.debtType)}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${risk.iconClass}`}><risk.icon className="h-6 w-6" /></div>
      </div>
      <div className="relative mt-8">
        <p className="text-sm font-bold text-[#7A4B2D]">Saldo actual</p>
        <p className="font-heading text-4xl font-black text-[#24150D]">{money.format(debt.balance || 0)}</p>
      </div>
      <div className="relative mt-7 grid grid-cols-2 gap-3">
        <CardMetric label="Cuota" value={money.format(debt.monthlyPayment || 0)} />
        <CardMetric label="Tasa EA" value={`${debt.annualRate || 0}%`} />
        <CardMetric label="Meses" value={`${debt.remainingMonths || 0}`} />
        <CardMetric label="Peso" value={`${monthlyWeight}%`} />
      </div>
      <div className="relative mt-6 rounded-2xl border border-[#F2D8C2] bg-white/72 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-xs font-black text-[#7A4B2D]"><span>{risk.label}</span><span>{risk.score}/100</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-[#F4E6DA]"><div className={`h-full rounded-full ${risk.barClass}`} style={{ width: `${risk.score}%` }} /></div>
        <p className="mt-3 text-xs font-medium leading-relaxed text-[#6A5648]">{risk.message}</p>
      </div>
    </article>
  )
}

function DebtSwipeReview({ debts, activeIndex, setActiveIndex }: { debts: Debt[]; activeIndex: number; setActiveIndex: (index: number) => void }) {
  const sortedByRisk = [...debts]
    .map((debt, originalIndex) => ({ debt, originalIndex, risk: getDebtRisk(debt) }))
    .sort((a, b) => b.risk.score - a.risk.score)
  return (
    <section className="rounded-[2rem] border border-mia-border bg-mia-surface/30 p-5">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gain">Swipe review</p>
          <h2 className="font-heading text-2xl font-bold">Tu ranking anti-deuda</h2>
          <p className="mt-2 text-sm text-neutral">Toca una card para editarla. La primera suele ser tu misión más urgente.</p>
        </div>
        <div className="rounded-full border border-gain/30 bg-gain/10 px-3 py-1 text-xs font-bold text-gain">{debts.length} cards creadas</div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {sortedByRisk.map(({ debt, originalIndex, risk }, order) => (
          <button key={debt.id} type="button" onClick={() => setActiveIndex(originalIndex)} className={`group rounded-2xl border p-4 text-left transition hover:-translate-y-1 ${activeIndex === originalIndex ? 'border-mf-coral bg-mf-coral/10' : 'border-mia-border bg-mia-black/30 hover:border-mf-coral/40'}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="rounded-full bg-mia-card px-3 py-1 text-xs font-bold text-neutral">#{order + 1} prioridad</span>
              <ArrowRight className="h-4 w-4 text-mf-coral opacity-0 transition group-hover:opacity-100" />
            </div>
            <h3 className="font-heading text-lg font-bold text-mia-cream">{debt.creditor || `Deuda ${originalIndex + 1}`}</h3>
            <p className="mt-1 text-sm text-neutral">{money.format(debt.balance || 0)} · {debt.annualRate || 0}% EA</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-mia-card"><div className={`h-full rounded-full ${risk.barClass}`} style={{ width: `${risk.score}%` }} /></div>
            <p className="mt-2 text-xs font-bold text-neutral">{risk.label}</p>
          </button>
        ))}
      </div>
    </section>
  )
}

function CardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#F2D8C2] bg-white/68 p-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#A96122]/75">{label}</p>
      <p className="mt-1 text-sm font-black text-[#24150D]">{value}</p>
    </div>
  )
}

function getDebtRisk(debt: Debt) {
  const rateScore = Math.min(45, (debt.annualRate || 0) * 1.1)
  const balanceScore = Math.min(25, (debt.balance || 0) / 400000)
  const paymentPressure = debt.balance > 0 ? Math.min(20, ((debt.monthlyPayment || 0) / debt.balance) * 100) : 0
  const termScore = Math.min(10, (debt.remainingMonths || 0) / 6)
  const score = Math.max(8, Math.min(100, Math.round(rateScore + balanceScore + paymentPressure + termScore)))
  if (score >= 70) return { score, label: '🔥 Deuda crítica', message: 'Esta card está quemando más dinero. Priorízala para negociar, abonar o atacar primero.', icon: Flame, cardClass: 'border-mf-coral/40 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.92),transparent_32%),linear-gradient(135deg,#FFF9F4_0%,#FFE7D8_50%,#FFC9AA_100%)]', barClass: 'bg-mf-coral', iconClass: 'border-mf-coral/30 bg-mf-coral/10 text-mf-coral' }
  if (score >= 40) return { score, label: '⚡ Deuda controlable', message: 'Tiene presión media. Ordenarla puede liberar flujo sin comprometer todo tu mes.', icon: Target, cardClass: 'border-mf-orange/35 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.95),transparent_32%),linear-gradient(135deg,#FFFDF8_0%,#FFF0DC_52%,#FFD7A8_100%)]', barClass: 'bg-mf-orange', iconClass: 'border-mf-orange/30 bg-mf-orange/10 text-mf-orange' }
  return { score, label: '🛡️ Deuda manejable', message: 'No parece ser la más urgente. Puede servir como victoria rápida o deuda de mantenimiento.', icon: ShieldCheck, cardClass: 'border-mf-orange/25 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.98),transparent_34%),linear-gradient(135deg,#FFFFFF_0%,#FFF9EF_54%,#FFE9CC_100%)]', barClass: 'bg-[#E8A04B]', iconClass: 'border-mf-orange/25 bg-mf-orange/10 text-mf-orange' }
}

function formatDebtType(value: string) {
  const labels: Record<string, string> = { tarjeta: 'tarjeta de crédito', consumo: 'crédito de consumo', informal: 'deuda informal', hipotecario: 'deuda de largo plazo' }
  return labels[value] || value || 'deuda'
}

function ResultPanel({ simulatorKey, result }: { simulatorKey: AntiDebtKey; result: any }) {
  return (
    <div className="mt-8 rounded-3xl border border-mf-coral/30 bg-mf-coral/10 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mf-coral">Resultado guardado · {result.version}</p>
      {simulatorKey === 'diagnostico-emocional-deuda' && <div><h3 className="mt-2 font-heading text-3xl font-bold">{result.archetype?.label}</h3><p className="mt-3 text-neutral">{result.archetype?.description}</p><MetricGrid items={[['Riesgo recaída', result.relapse?.label], ['Acción 48h', result.archetype?.action48h], ['Ruta', result.archetype?.route]]} /></div>}
      {simulatorKey === 'diagnostico-financiero-deuda' && <div><h3 className="mt-2 font-heading text-3xl font-bold">Semáforo {result.semaphore?.label}</h3><p className="mt-3 text-neutral">{result.semaphore?.message}</p><MetricGrid items={[['Carga deuda', percent.format(result.indicators?.debtLoadRatio || 0)], ['Liquidez mensual', money.format(result.indicators?.monthlyLiquidity || 0)], ['Método', result.recommendedMethodLabel], ['Compra cartera', result.portfolioPurchase?.label]]} /></div>}
      {simulatorKey === 'plan-pago-deuda' && <div><h3 className="mt-2 font-heading text-3xl font-bold">Libertad en {result.totalMonths} meses</h3><MetricGrid items={[['Fecha estimada', result.freedomDate], ['Interés total', money.format(result.totalInterest || 0)], ['Ahorro intereses', money.format(result.comparison?.interestSavingsVsBaseline || 0)], ['Meses ahorrados', `${result.comparison?.monthsSavedVsBaseline || 0}`]]} /></div>}
      {simulatorKey === 'analiza-tu-deuda' && <div><h3 className="mt-2 font-heading text-3xl font-bold">Ahorro: {money.format(result.savings?.interest || 0)}</h3><p className="mt-3 text-neutral">{result.recommendation}</p><MetricGrid items={[['Meses ahorrados', `${result.savings?.months || 0}`], ['Interés actual', money.format(result.current?.totalInterest || 0)], ['Interés optimizado', money.format(result.optimized?.totalInterest || 0)], ['CDT 10% EA', result.cdtComparison?.recommendation]]} /></div>}
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-gain/30 bg-gain/10 px-3 py-1 text-xs font-bold text-gain"><CheckCircle2 className="h-4 w-4" /> Medición activa: {result.measurement?.product}</div>
    </div>
  )
}

function MetricGrid({ items }: { items: Array<[string, string]> }) {
  return <div className="mt-5 grid gap-3 md:grid-cols-2">{items.map(([label, value]) => <div key={label} className="rounded-2xl border border-mia-border bg-mia-black/30 p-4"><p className="text-xs font-bold uppercase tracking-wide text-neutral">{label}</p><p className="mt-2 text-sm font-semibold text-mia-cream">{value}</p></div>)}</div>
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block text-sm font-semibold text-neutral">{label}<input type="number" value={value || ''} onChange={event => onChange(Number(event.target.value || 0))} className="mt-2 w-full rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-mia-cream outline-none focus:border-mf-coral" /></label>
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-semibold text-neutral">{label}<input type="text" value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-mia-cream outline-none focus:border-mf-coral" /></label>
}
