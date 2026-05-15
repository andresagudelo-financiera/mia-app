'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, MessageCircle, ShieldCheck } from 'lucide-react'
import UserRegistrationModal from '@/components/auth/UserRegistrationModal'
import { simulatorsApi } from '@/services/api/simulators.api'
import { useUserStore } from '@/stores/user.store'
import { pushEvent, trackMetaEvent } from '@/lib/analytics'

const QUESTIONS = [
  {
    key: 'q1',
    title: '¿Cuál es tu horizonte de inversión?',
    options: [
      { value: 'under1', label: 'Menos de 1 año' },
      { value: '1-5', label: 'Entre 1 y 5 años' },
      { value: '5-10', label: 'Más de 5 años' },
    ],
  },
  {
    key: 'q2',
    title: 'Si el mercado cae 20%, ¿qué harías?',
    options: [
      { value: 'low', label: 'Me preocuparía y vendería rápido' },
      { value: 'medium', label: 'Mantendría la calma y esperaría' },
      { value: 'high', label: 'Compraría más aprovechando la caída' },
    ],
  },
  {
    key: 'q3',
    title: '¿Qué tan cómodo estás con productos que fluctúan?',
    options: [
      { value: 'low', label: 'Muy incómodo, prefiero estabilidad' },
      { value: 'medium', label: 'Cómodo si tengo información clara' },
      { value: 'high', label: 'Me gusta asumir riesgo calculado' },
    ],
  },
  {
    key: 'q4',
    title: '¿Cuánto tiempo dedicas a investigar inversiones?',
    options: [
      { value: 'low', label: 'Poco, prefiero que alguien me guíe' },
      { value: 'medium', label: 'Algunas horas para estar informado' },
      { value: 'high', label: 'Bastante, quiero entender detalles' },
    ],
  },
  {
    key: 'q5',
    title: 'Si una inversión cae 30%, ¿cómo reaccionas?',
    options: [
      { value: 'low', label: 'Vendo para evitar más pérdidas' },
      { value: 'medium', label: 'Mantengo la estrategia' },
      { value: 'high', label: 'Compro más si la tesis sigue vigente' },
    ],
  },
]

type Answers = Record<string, string>

export default function PerfilRiesgoSimulator() {
  const { isRegistered, profile, refreshProfile } = useUserStore()
  const [answers, setAnswers] = useState<Answers>({})
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPrevious, setLoadingPrevious] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const complete = useMemo(() => QUESTIONS.every(question => answers[question.key]), [answers])

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

          <div className="space-y-5">
            {QUESTIONS.map((question, index) => (
              <div key={question.key} className="rounded-2xl border border-mia-border bg-mia-surface/30 p-4">
                <h2 className="mb-4 font-heading text-lg font-bold"><span className="text-mf-coral">{index + 1}.</span> {question.title}</h2>
                <div className="grid gap-3 md:grid-cols-3">
                  {question.options.map(option => {
                    const selected = answers[question.key] === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAnswers(current => ({ ...current, [question.key]: option.value }))}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition ${selected ? 'border-mf-coral bg-mf-coral/15 text-mia-cream' : 'border-mia-border bg-mia-card/60 text-neutral hover:border-mf-coral/50 hover:text-mia-cream'}`}
                      >
                        <span className="flex items-center gap-2">
                          {selected && <CheckCircle2 className="h-4 w-4 text-mf-coral" />}
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="mt-4 rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>}

          <button onClick={save} disabled={loading || !complete} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-mf px-6 py-4 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90 disabled:opacity-50 md:w-auto">
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            Calcular y guardar perfil
          </button>

          {result && (
            <div className="mt-8 rounded-3xl border border-mf-coral/30 bg-mf-coral/10 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-mf-coral">Resultado</p>
              <h3 className="mt-2 font-heading text-3xl font-bold">{result.level?.label} · {result.scoreLabel}</h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral">{result.level?.description}</p>
            </div>
          )}
        </section>

        <a
          href="https://wa.me/573205389740?text=Hola%20Moneyflow%2C%20quiero%20analizar%20mi%20perfil%20de%20riesgo%20con%20un%20Money%20Strategist."
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 left-4 right-4 z-50 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-mf px-5 py-4 text-sm font-bold text-white shadow-2xl shadow-mf-coral/30 transition hover:opacity-90 sm:left-auto sm:right-6 sm:w-auto sm:px-6"
        >
          <MessageCircle className="h-5 w-5" />
          Agendar con Money Strategist
        </a>
      </div>
    </main>
  )
}
