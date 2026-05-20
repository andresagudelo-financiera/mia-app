'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BadgeDollarSign, CheckCircle2, HeartPulse, Loader2, Plus, Route, Save, SearchCheck, Trash2 } from 'lucide-react'
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
  return (
    <div className="space-y-4">
      <p className="rounded-2xl border border-mf-coral/20 bg-mf-coral/10 p-4 text-sm text-neutral">Responde de 1 a 5: 1 = nunca / muy bajo, 5 = siempre / muy alto.</p>
      {EMOTIONAL_QUESTIONS.map((question, index) => {
        const key = `p${index + 1}`
        return (
          <div key={key} className="rounded-2xl border border-mia-border bg-mia-surface/30 p-4">
            <h2 className="mb-4 font-heading text-base font-bold"><span className="text-mf-coral">{index + 1}.</span> {question}</h2>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(value => (
                <button key={value} type="button" onClick={() => setAnswers({ ...answers, [key]: value })} className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${answers[key] === value ? 'border-mf-coral bg-mf-coral/15 text-mia-cream' : 'border-mia-border bg-mia-card/60 text-neutral hover:border-mf-coral/50'}`}>{value}</button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
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
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <NumberField label="Presupuesto mensual total para deudas" value={plan.monthlyDebtBudget} onChange={monthlyDebtBudget => setPlan({ ...plan, monthlyDebtBudget })} />
        <NumberField label="Abono extra mensual" value={plan.extraMonthly} onChange={extraMonthly => setPlan({ ...plan, extraMonthly })} />
        <label className="block text-sm font-semibold text-neutral">Método
          <select value={plan.method} onChange={event => setPlan({ ...plan, method: event.target.value })} className="mt-2 w-full rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-mia-cream outline-none focus:border-mf-coral">
            <option value="compare">Comparar y escoger mejor</option><option value="snowball">Bola de nieve</option><option value="avalanche">Avalancha</option>
          </select>
        </label>
      </div>
      <DebtEditor debts={debts} setDebts={setDebts} />
    </div>
  )
}

function DebtAnalyzerForm({ debt, setDebt, scenario, setScenario }: { debt: Debt; setDebt: (value: Debt) => void; scenario: any; setScenario: (value: any) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField label="Entidad / deuda" value={debt.creditor} onChange={creditor => setDebt({ ...debt, creditor })} />
      <TextField label="Tipo de deuda" value={debt.debtType} onChange={debtType => setDebt({ ...debt, debtType })} />
      <NumberField label="Saldo actual" value={debt.balance} onChange={balance => setDebt({ ...debt, balance })} />
      <NumberField label="Cuota mensual actual" value={debt.monthlyPayment} onChange={monthlyPayment => setDebt({ ...debt, monthlyPayment })} />
      <NumberField label="Tasa efectiva anual (%)" value={debt.annualRate} onChange={annualRate => setDebt({ ...debt, annualRate })} />
      <NumberField label="Meses restantes" value={debt.remainingMonths} onChange={remainingMonths => setDebt({ ...debt, remainingMonths })} />
      <NumberField label="Abono único adicional" value={scenario.oneTimeExtra} onChange={oneTimeExtra => setScenario({ ...scenario, oneTimeExtra })} />
      <NumberField label="Abono extra mensual" value={scenario.recurringExtra} onChange={recurringExtra => setScenario({ ...scenario, recurringExtra })} />
      <NumberField label="Nueva tasa EA (%)" value={scenario.newAnnualRate} onChange={newAnnualRate => setScenario({ ...scenario, newAnnualRate })} />
      <NumberField label="Nuevo plazo en meses" value={scenario.newTermMonths} onChange={newTermMonths => setScenario({ ...scenario, newTermMonths })} />
    </div>
  )
}

function DebtEditor({ debts, setDebts }: { debts: Debt[]; setDebts: (value: Debt[]) => void }) {
  const updateDebt = (index: number, patch: Partial<Debt>) => setDebts(debts.map((debt, currentIndex) => currentIndex === index ? { ...debt, ...patch } : debt))
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3"><h2 className="font-heading text-xl font-bold">Inventario de deudas</h2><button type="button" onClick={() => setDebts([...debts, defaultDebt(debts.length + 1)])} className="inline-flex items-center gap-2 rounded-xl border border-mf-coral/40 px-3 py-2 text-sm font-bold text-mf-coral"><Plus className="h-4 w-4" /> Agregar</button></div>
      {debts.map((debt, index) => (
        <div key={debt.id} className="rounded-2xl border border-mia-border bg-mia-surface/30 p-4">
          <div className="mb-3 flex items-center justify-between"><p className="font-bold text-mia-cream">Deuda {index + 1}</p>{debts.length > 1 && <button type="button" onClick={() => setDebts(debts.filter((_, currentIndex) => currentIndex !== index))} className="text-loss"><Trash2 className="h-4 w-4" /></button>}</div>
          <div className="grid gap-3 md:grid-cols-3">
            <TextField label="Entidad" value={debt.creditor} onChange={creditor => updateDebt(index, { creditor })} />
            <TextField label="Tipo" value={debt.debtType} onChange={debtType => updateDebt(index, { debtType })} />
            <NumberField label="Saldo" value={debt.balance} onChange={balance => updateDebt(index, { balance })} />
            <NumberField label="Cuota mensual" value={debt.monthlyPayment} onChange={monthlyPayment => updateDebt(index, { monthlyPayment })} />
            <NumberField label="Tasa EA (%)" value={debt.annualRate} onChange={annualRate => updateDebt(index, { annualRate })} />
            <NumberField label="Meses restantes" value={debt.remainingMonths} onChange={remainingMonths => updateDebt(index, { remainingMonths })} />
          </div>
        </div>
      ))}
    </div>
  )
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
