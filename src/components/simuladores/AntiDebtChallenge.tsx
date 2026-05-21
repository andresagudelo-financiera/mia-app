'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarClock, CheckCircle2, Gift, Lock, Loader2, Trophy, Zap } from 'lucide-react'
import UserRegistrationModal from '@/components/auth/UserRegistrationModal'
import { pushEvent } from '@/lib/analytics'
import { challengesApi } from '@/services/api/challenges.api'
import { useUserStore } from '@/stores/user.store'
import type { Challenge } from '@/types/rentabilidad'

const challengeKey = 'reto-anti-deuda'

export default function AntiDebtChallenge() {
  const { isRegistered, profile } = useUserStore()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    let active = true
    setLoading(true)
    challengesApi.getChallenge(challengeKey, profile.id)
      .then(data => {
        if (!active) return
        setChallenge(data)
        setError(null)
        pushEvent('calculator_started', { challengeKey: data.key, progress: data.progress?.progressPercent })
      })
      .catch(err => active && setError((err as Error).message || 'No pudimos cargar el reto.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [profile?.id])

  const nextStep = useMemo(() => challenge?.steps.find(step => !step.isCompleted && step.isUnlocked), [challenge])

  if (!isRegistered || !profile?.id) {
    return <UserRegistrationModal toolName={challengeKey} contentName="reto_anti_deuda" onClose={() => undefined} />
  }

  if (!loading && (error || (challenge && challenge.status !== 'active'))) {
    const isComingSoon = challenge?.status === 'coming_soon'
    return (
      <main className="min-h-screen bg-mia-black px-4 py-10 text-mia-cream sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
          <section className="rounded-[2rem] border border-mf-orange/30 bg-mf-orange/10 p-8 text-center shadow-2xl shadow-mf-orange/5 md:p-10">
            <Lock className="mx-auto mb-4 h-10 w-10 text-mf-orange" />
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-mf-orange">{isComingSoon ? 'Próximamente' : 'Reto no disponible'}</p>
            <h1 className="font-heading text-3xl font-bold text-mia-cream md:text-5xl">{challenge?.name || 'Reto Anti-Deuda'}</h1>
            <p className="mt-4 text-sm leading-relaxed text-neutral md:text-base">
              {isComingSoon ? 'Este reto todavía no está activo. Te avisaremos cuando esté disponible.' : error || 'Este reto fue deshabilitado temporalmente por el equipo.'}
            </p>
            <Link href="/calculadoras" className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-mf px-5 py-3 text-sm font-bold text-white">
              Volver a calculadoras
            </Link>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-mia-black px-4 py-10 text-mia-cream sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-mf-coral/30 bg-gradient-to-br from-mf-coral/20 via-mia-card to-mia-black p-6 shadow-2xl shadow-mf-coral/10 md:p-10">
          <div className="absolute right-6 top-6 hidden rounded-full border border-mf-orange/30 bg-mf-orange/10 p-6 text-mf-orange md:block"><Trophy className="h-14 w-14" /></div>
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mf-coral/30 bg-mf-coral/10 px-3 py-1 text-xs font-bold text-mf-coral">
              <Zap className="h-4 w-4" /> Reto gamificado · desbloqueo por progreso y fecha
            </div>
            <h1 className="font-heading text-4xl font-bold leading-tight md:text-6xl">{challenge?.name || 'Reto Anti-Deuda'}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral md:text-lg">
              {challenge?.description || 'Completa cada nivel para desbloquear el siguiente y construir tu mapa anti-deuda.'}
            </p>
          </div>

          <div className="mt-8 max-w-3xl">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-neutral">
              <span>Progreso del reto</span>
              <span>{challenge?.progress?.completedCount || 0}/{challenge?.progress?.totalSteps || 4} niveles · {challenge?.progress?.progressPercent || 0}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-mia-black/60">
              <div className="h-full rounded-full bg-gradient-mf transition-all" style={{ width: `${challenge?.progress?.progressPercent || 0}%` }} />
            </div>
          </div>

          {nextStep && (
            <Link href={`/calculadoras/${nextStep.simulatorKey}`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-mf px-6 py-4 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90">
              Continuar con {nextStep.title}
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </section>

        {error && <div className="rounded-2xl border border-loss/30 bg-loss/10 p-4 text-sm text-loss">{error}</div>}
        {loading && <div className="rounded-2xl border border-mia-border bg-mia-card p-8 text-center text-neutral"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" /> Cargando tu reto...</div>}

        {challenge && (
          <section className="grid gap-5 md:grid-cols-2">
            {challenge.steps.map((step, index) => (
              <article key={step.id} className={`relative rounded-3xl border p-5 transition ${step.isCompleted ? 'border-gain/40 bg-gain/10' : step.isUnlocked ? 'border-mf-coral/40 bg-mia-card hover:-translate-y-1 hover:shadow-xl hover:shadow-mf-coral/10' : 'border-mia-border bg-mia-surface/40 opacity-75'}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border font-heading text-lg font-bold ${step.isCompleted ? 'border-gain/40 bg-gain/20 text-gain' : step.isUnlocked ? 'border-mf-coral/40 bg-mf-coral/10 text-mf-coral' : 'border-mia-border bg-mia-black/40 text-neutral'}`}>
                      {step.isCompleted ? <CheckCircle2 className="h-6 w-6" /> : index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral">Nivel {index + 1}</p>
                      <h2 className="font-heading text-xl font-bold text-mia-cream">{step.title}</h2>
                    </div>
                  </div>
                  {!step.isUnlocked && !step.isCompleted && <Lock className="h-5 w-5 text-neutral" />}
                </div>

                <p className="text-sm leading-relaxed text-neutral">{step.description || step.simulator?.description}</p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                  {step.isCompleted && <span className="rounded-full bg-gain/15 px-3 py-1 text-gain">Completado</span>}
                  {step.isUnlocked && !step.isCompleted && <span className="rounded-full bg-mf-coral/15 px-3 py-1 text-mf-coral">Disponible</span>}
                  {!step.isUnlocked && <span className="rounded-full bg-mia-black/50 px-3 py-1 text-neutral">Bloqueado</span>}
                  {step.availableAt && <span className="inline-flex items-center gap-1 rounded-full bg-mf-orange/10 px-3 py-1 text-mf-orange"><CalendarClock className="h-3 w-3" /> {formatDate(step.availableAt)}</span>}
                </div>

                {!step.isUnlocked && !step.isCompleted && step.lockedReason && <p className="mt-4 rounded-2xl border border-mia-border bg-mia-black/30 p-3 text-sm text-neutral">{step.lockedReason}</p>}

                {step.isUnlocked || step.isCompleted ? (
                  <Link href={`/calculadoras/${step.simulatorKey}`} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-mf-coral/40 px-4 py-3 text-sm font-bold text-mf-coral transition hover:bg-mf-coral/10">
                    {step.isCompleted ? 'Ver / recalcular' : 'Empezar nivel'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </article>
            ))}
          </section>
        )}

        {challenge?.progress?.status === 'completed' && (
          <section className="rounded-3xl border border-gain/40 bg-gain/10 p-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gain/15 px-3 py-1 text-xs font-bold text-gain"><Gift className="h-4 w-4" /> Reto completado</div>
            <h2 className="font-heading text-3xl font-bold">Desbloqueaste tu Mapa Anti-Deuda</h2>
            <p className="mt-3 max-w-2xl text-neutral">Ya tienes diagnóstico, inventario, plan y escenario optimizado. El siguiente paso es revisarlo con un Money Strategist.</p>
          </section>
        )}
      </div>
    </main>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value))
}
