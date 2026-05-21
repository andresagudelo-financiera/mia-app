'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Compass, Flame, Gem, Loader2, Shield, ShieldCheck, Sparkles, Target, TrendingUp } from 'lucide-react'
import UserRegistrationModal from '@/components/auth/UserRegistrationModal'
import SimulatorActionBar from '@/components/simuladores/SimulatorActionBar'
import { simulatorsApi } from '@/services/api/simulators.api'
import { useUserStore } from '@/stores/user.store'
import { pushEvent, trackMetaEvent } from '@/lib/analytics'

const QUESTIONS = [
  {
    key: 'q1',
    title: '¿Cuál es tu horizonte de inversión?',
    category: 'Tiempo',
    insight: 'Tu horizonte define cuánto movimiento puedes tolerar sin abandonar la estrategia.',
    options: [
      { value: 'under1', label: 'Menos de 1 año', emoji: '🛟', tone: 'Defensivo', description: 'Necesito estabilidad y liquidez pronto.' },
      { value: '1-5', label: 'Entre 1 y 5 años', emoji: '🧭', tone: 'Balanceado', description: 'Puedo esperar, pero quiero control.' },
      { value: '5-10', label: 'Más de 5 años', emoji: '🚀', tone: 'Crecimiento', description: 'Puedo pensar en largo plazo.' },
    ],
  },
  {
    key: 'q2',
    title: 'Si el mercado cae 20%, ¿qué harías?',
    category: 'Reacción',
    insight: 'La verdadera tolerancia aparece cuando el mercado se mueve en contra.',
    options: [
      { value: 'low', label: 'Me preocuparía y vendería rápido', emoji: '😰', tone: 'Protección', description: 'Prefiero cortar pérdidas.' },
      { value: 'medium', label: 'Mantendría la calma y esperaría', emoji: '😐', tone: 'Disciplina', description: 'Pauso antes de decidir.' },
      { value: 'high', label: 'Compraría más aprovechando la caída', emoji: '🔥', tone: 'Oportunidad', description: 'Veo valor cuando otros se asustan.' },
    ],
  },
  {
    key: 'q3',
    title: '¿Qué tan cómodo estás con productos que fluctúan?',
    category: 'Volatilidad',
    insight: 'No todas las inversiones se sienten igual, incluso si prometen buena rentabilidad.',
    options: [
      { value: 'low', label: 'Muy incómodo, prefiero estabilidad', emoji: '🛡️', tone: 'Estabilidad', description: 'Dormir tranquilo es prioridad.' },
      { value: 'medium', label: 'Cómodo si tengo información clara', emoji: '📊', tone: 'Claridad', description: 'Acepto movimiento si entiendo por qué.' },
      { value: 'high', label: 'Me gusta asumir riesgo calculado', emoji: '⚡', tone: 'Convicción', description: 'Acepto variación por mejor potencial.' },
    ],
  },
  {
    key: 'q4',
    title: '¿Cuánto tiempo dedicas a investigar inversiones?',
    category: 'Conocimiento',
    insight: 'Más investigación puede aumentar confianza, pero también puede producir sobreanálisis.',
    options: [
      { value: 'low', label: 'Poco, prefiero que alguien me guíe', emoji: '🤝', tone: 'Acompañado', description: 'Quiero guía y simpleza.' },
      { value: 'medium', label: 'Algunas horas para estar informado', emoji: '🧠', tone: 'Curioso', description: 'Me informo antes de avanzar.' },
      { value: 'high', label: 'Bastante, quiero entender detalles', emoji: '🔎', tone: 'Analítico', description: 'Me gusta profundizar.' },
    ],
  },
  {
    key: 'q5',
    title: 'Si una inversión cae 30%, ¿cómo reaccionas?',
    category: 'Pérdida',
    insight: 'Esta respuesta muestra si tu estrategia aguanta estrés real.',
    options: [
      { value: 'low', label: 'Vendo para evitar más pérdidas', emoji: '🚪', tone: 'Salida rápida', description: 'Prefiero proteger capital.' },
      { value: 'medium', label: 'Mantengo la estrategia', emoji: '⚖️', tone: 'Estrategia', description: 'Respeto el plan original.' },
      { value: 'high', label: 'Compro más si la tesis sigue vigente', emoji: '💎', tone: 'Alta convicción', description: 'Aumento si sigo creyendo.' },
    ],
  },
]

const RISK_VALUE_META: Record<string, { icon: any; color: string; bg: string; border: string; label: string; points: number }> = {
  under1: { icon: Shield, color: 'text-gain', bg: 'bg-gain/10', border: 'border-gain/30', label: 'Conservador', points: 1 },
  '1-5': { icon: Compass, color: 'text-mf-orange', bg: 'bg-mf-orange/10', border: 'border-mf-orange/30', label: 'Balanceado', points: 2 },
  '5-10': { icon: TrendingUp, color: 'text-mf-coral', bg: 'bg-mf-coral/10', border: 'border-mf-coral/30', label: 'Crecimiento', points: 3 },
  low: { icon: Shield, color: 'text-gain', bg: 'bg-gain/10', border: 'border-gain/30', label: 'Bajo', points: 1 },
  medium: { icon: Target, color: 'text-mf-orange', bg: 'bg-mf-orange/10', border: 'border-mf-orange/30', label: 'Medio', points: 2 },
  high: { icon: Flame, color: 'text-mf-coral', bg: 'bg-mf-coral/10', border: 'border-mf-coral/30', label: 'Alto', points: 3 },
}

type Answers = Record<string, string>

export default function PerfilRiesgoSimulator() {
  const { isRegistered, profile, refreshProfile } = useUserStore()
  const [answers, setAnswers] = useState<Answers>({})
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPrevious, setLoadingPrevious] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const complete = useMemo(() => QUESTIONS.every(question => answers[question.key]), [answers])
  const answeredCount = useMemo(() => QUESTIONS.filter(question => answers[question.key]).length, [answers])
  const progress = Math.round((answeredCount / QUESTIONS.length) * 100)
  const riskPoints = useMemo(() => QUESTIONS.reduce((sum, question) => sum + (RISK_VALUE_META[answers[question.key]]?.points || 0), 0), [answers])
  const preview = getRiskPreview(riskPoints, answeredCount)
  const activeQuestion = QUESTIONS[activeIndex]

  useEffect(() => {
    if (!profile?.id) return
    let active = true
    setLoadingPrevious(true)
    simulatorsApi.getResponse(profile.id, 'perfil-riesgo')
      .then(response => {
        if (!active || !response) return
        const savedAnswers = (response.input as any)?.answers || response.result?.answers
        if (savedAnswers) setAnswers(Object.fromEntries(Object.entries(savedAnswers).filter(([, value]) => Boolean(value))) as Answers)
        if (response.result) setResult(response.result)
      })
      .catch(() => undefined)
      .finally(() => active && setLoadingPrevious(false))
    return () => { active = false }
  }, [profile?.id])

  if (!isRegistered || !profile?.id) {
    return <UserRegistrationModal toolName="perfil-riesgo" contentName="perfil_riesgo" onClose={() => undefined} />
  }

  const save = async () => {
    if (!complete) {
      setError('Responde todas las preguntas para calcular tu perfil.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await simulatorsApi.saveRiskProfile(profile.id, { answers })
      setResult(response.result)
      pushEvent('calculator_started', { score: response.result?.score, level: response.result?.level?.key })
      trackMetaEvent('Lead', { content_name: 'perfil_riesgo' })
      void refreshProfile()
    } catch (err) {
      setError((err as Error).message || 'No pudimos guardar tu perfil de riesgo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-mia-black px-4 py-8 text-mia-cream sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/calculadoras" className="mb-6 inline-flex items-center gap-2 rounded-full border border-mia-border bg-mia-surface/60 px-4 py-2 text-sm font-semibold text-neutral transition hover:border-mf-coral/60 hover:text-mia-cream">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <section className="glass rounded-3xl border border-mia-border p-6 shadow-2xl shadow-mf-coral/5 md:p-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-mf-coral/10 px-3 py-1 text-xs font-bold text-mf-coral">
                <ShieldCheck className="h-4 w-4" /> Simulador validado
              </div>
              <h1 className="font-heading text-3xl font-bold md:text-5xl">Perfil de Riesgo</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral md:text-base">
                Responde 5 preguntas para entender tu tolerancia al riesgo. Guardaremos el resultado en tu perfil para que un Money Strategist pueda guiarte mejor.
              </p>
            </div>
            {loadingPrevious && <span className="inline-flex items-center gap-2 text-sm text-neutral"><Loader2 className="h-4 w-4 animate-spin" /> Cargando respuestas...</span>}
          </div>

          <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-5">
              <div className="relative overflow-hidden rounded-[2rem] border border-mf-coral/20 bg-gradient-to-br from-mf-coral/15 via-mia-card to-mia-black p-5">
                <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-mf-coral/20 blur-3xl" />
                <div className="relative">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mf-coral/30 bg-mf-coral/10 px-3 py-1 text-xs font-bold text-mf-coral">
                    <Sparkles className="h-4 w-4" /> Radar de riesgo en vivo
                  </div>
                  <h2 className="font-heading text-3xl font-bold">{preview.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-neutral">{preview.description}</p>

                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-neutral">
                      <span>Progreso</span>
                      <span>{answeredCount}/{QUESTIONS.length} · {progress}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-mia-black/60">
                      <div className="h-full rounded-full bg-gradient-mf transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <RiskSignal label="Puntaje estimado" value={answeredCount ? `${riskPoints}/${QUESTIONS.length * 3}` : '—'} />
                    <RiskSignal label="Próximo paso" value={complete ? 'Calcular perfil' : `${QUESTIONS.length - answeredCount} preguntas`} />
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-mia-border bg-mia-surface/30 p-5">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-neutral">Mapa de respuestas</p>
                <div className="space-y-3">
                  {QUESTIONS.map((question, index) => {
                    const value = answers[question.key]
                    const meta = RISK_VALUE_META[value]
                    const Icon = meta?.icon || Target
                    const isActive = index === activeIndex
                    return (
                      <button
                        key={question.key}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:border-mf-coral/40 ${isActive ? 'border-mf-coral bg-mf-coral/10' : 'border-mia-border bg-mia-black/30'}`}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${meta ? `${meta.border} ${meta.bg} ${meta.color}` : 'border-mia-border bg-mia-card text-neutral'}`}>
                          {value ? <Icon className="h-5 w-5" /> : index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-mia-cream">{question.category}</p>
                          <p className="truncate text-xs text-neutral">{value ? meta?.label : 'Pendiente'}</p>
                        </div>
                        {value && <CheckCircle2 className="h-4 w-4 text-gain" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <article className="rounded-[2rem] border border-mia-border bg-mia-black/40 p-5 shadow-2xl shadow-mf-coral/5 md:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-mf-coral">
                    Pregunta {activeIndex + 1} de {QUESTIONS.length} · {activeQuestion.category}
                  </p>
                  <h2 className="mt-3 font-heading text-3xl font-bold leading-tight">{activeQuestion.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-neutral">{activeQuestion.insight}</p>
                </div>
                <div className="hidden rounded-2xl border border-mf-coral/30 bg-mf-coral/10 p-4 text-mf-coral sm:block">
                  <ShieldCheck className="h-7 w-7" />
                </div>
              </div>

              <div className="grid gap-3">
                {activeQuestion.options.map(option => {
                  const selected = answers[activeQuestion.key] === option.value
                  const meta = RISK_VALUE_META[option.value]
                  const Icon = meta.icon
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setAnswers(current => ({ ...current, [activeQuestion.key]: option.value }))
                        if (activeIndex < QUESTIONS.length - 1) window.setTimeout(() => setActiveIndex(activeIndex + 1), 140)
                      }}
                      className={`group rounded-2xl border p-4 text-left transition hover:-translate-y-1 ${selected ? `${meta.border} ${meta.bg} shadow-lg shadow-mf-coral/10` : 'border-mia-border bg-mia-card/60 hover:border-mf-coral/50'}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-2xl ${selected ? `${meta.border} ${meta.bg}` : 'border-mia-border bg-mia-black/40'}`}>
                          {option.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${selected ? meta.color : 'text-neutral'}`} />
                            <span className={`text-xs font-bold uppercase tracking-wide ${selected ? meta.color : 'text-neutral'}`}>{option.tone}</span>
                          </div>
                          <h3 className="font-heading text-lg font-bold text-mia-cream">{option.label}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-neutral">{option.description}</p>
                        </div>
                        {selected && <CheckCircle2 className="h-5 w-5 text-mf-coral" />}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button type="button" disabled={activeIndex === 0} onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))} className="inline-flex items-center gap-2 rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-sm font-bold text-neutral transition hover:border-mf-coral/40 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" /> Atrás
                </button>
                <button type="button" disabled={activeIndex >= QUESTIONS.length - 1} onClick={() => setActiveIndex(Math.min(QUESTIONS.length - 1, activeIndex + 1))} className="inline-flex items-center gap-2 rounded-xl border border-mf-coral/40 bg-mf-coral/10 px-4 py-3 text-sm font-bold text-mf-coral transition hover:bg-mf-coral/15 disabled:cursor-not-allowed disabled:opacity-40">
                  Siguiente <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          </section>

          {error && <p className="mt-4 rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>}

          <button onClick={save} disabled={loading || !complete} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-mf px-6 py-4 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90 disabled:opacity-50 md:w-auto">
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {complete ? 'Calcular y guardar perfil' : `Responde ${QUESTIONS.length - answeredCount} preguntas más`}
          </button>

          {result && (
            <div className="mt-8 rounded-3xl border border-mf-coral/30 bg-mf-coral/10 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-mf-coral">Resultado</p>
              <h3 className="mt-2 font-heading text-3xl font-bold">{result.level?.label} · {result.scoreLabel}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral">{result.level?.description}</p>
            </div>
          )}

          <SimulatorActionBar
            title="Perfil de Riesgo"
            description="Resultado de tolerancia al riesgo para orientar decisiones de inversión."
            result={result}
            fileBaseName="perfil-riesgo"
            advisorMessage="Hola Moneyflow, quiero agendar una asesoría para analizar mi perfil de riesgo con un Money Strategist."
            shareMessage="Calculé mi perfil de riesgo con Moneyflow para tomar mejores decisiones de inversión."
          />
        </section>
      </div>
    </main>
  )
}

function RiskSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-mia-border bg-mia-black/35 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral">{label}</p>
      <p className="mt-1 font-heading text-lg font-bold text-mia-cream">{value}</p>
    </div>
  )
}

function getRiskPreview(points: number, answeredCount: number) {
  if (!answeredCount) {
    return {
      title: 'Descubre tu brújula de inversión',
      description: 'A medida que respondas, iremos mostrando una lectura preliminar de tu tolerancia al riesgo.',
    }
  }

  const average = points / answeredCount
  if (average < 1.7) {
    return {
      title: 'Perfil preliminar: protector',
      description: 'Tu radar apunta a estabilidad, liquidez y decisiones acompañadas. Ideal para construir confianza antes de asumir más volatilidad.',
    }
  }
  if (average < 2.35) {
    return {
      title: 'Perfil preliminar: balanceado',
      description: 'Buscas crecer, pero necesitas claridad y estructura. Puedes tolerar movimiento si entiendes el plan.',
    }
  }
  return {
    title: 'Perfil preliminar: crecimiento',
    description: 'Tu brújula apunta a mayor convicción y oportunidad. Puedes asumir riesgo calculado con horizonte y tesis clara.',
  }
}
