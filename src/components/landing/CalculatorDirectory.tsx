'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Calculator, CheckCircle2, LockKeyhole, Trophy, Zap } from 'lucide-react'
import CalculatorCards from '@/components/landing/CalculatorCards'
import { challengesApi } from '@/services/api/challenges.api'
import type { Challenge } from '@/types/rentabilidad'

const tabs = [
  { key: 'simulators', label: 'Simuladores', icon: Calculator },
  { key: 'challenges', label: 'Retos', icon: Trophy },
]

export default function CalculatorDirectory() {
  const [activeTab, setActiveTab] = useState<'simulators' | 'challenges'>('simulators')

  return (
    <section className="space-y-8">
      <div className="mx-auto flex max-w-xl rounded-2xl border border-mia-border bg-mia-card/70 p-1.5">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as 'simulators' | 'challenges')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-gradient-mf text-white shadow-lg shadow-mf-coral/20' : 'text-neutral hover:bg-mia-surface hover:text-mia-cream'}`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'simulators' ? <CalculatorCards /> : <ChallengeCards />}
    </section>
  )
}

function ChallengeCards() {
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    challengesApi.getChallenge('reto-anti-deuda')
      .then(data => {
        if (!active) return
        setChallenge(data)
        setError(null)
      })
      .catch(err => {
        if (!active) return
        setChallenge(null)
        setError((err as Error).message || 'No hay retos disponibles.')
      })
      .finally(() => active && setLoading(false))

    return () => { active = false }
  }, [])

  const isActive = challenge?.status === 'active'
  const isComingSoon = challenge?.status === 'coming_soon'
  const hiddenOrDisabled = !loading && (!challenge || challenge.status === 'hidden' || challenge.status === 'disabled')

  if (loading) {
    return (
      <section className="rounded-3xl border border-mia-border bg-mia-card/60 p-8 text-center text-neutral">
        Cargando retos disponibles...
      </section>
    )
  }

  if (hiddenOrDisabled) {
    return (
      <section className="rounded-3xl border border-mia-border bg-mia-card/60 p-8 text-center">
        <LockKeyhole className="mx-auto mb-3 h-8 w-8 text-neutral" />
        <h3 className="font-heading text-2xl font-bold text-mia-cream">No hay retos disponibles por ahora</h3>
        <p className="mt-2 text-sm text-neutral">El equipo está preparando nuevas rutas. Vuelve pronto.</p>
        {error && <p className="mt-3 text-xs text-neutral/70">{error}</p>}
      </section>
    )
  }

  const CardShell = ({ children }: { children: ReactNode }) => isActive ? (
    <Link href="/retos/anti-deuda" className="group block overflow-hidden rounded-3xl border border-mf-coral/30 bg-gradient-to-br from-mf-coral/20 via-mia-card to-mia-black p-6 shadow-xl shadow-mf-coral/10 transition hover:-translate-y-1 hover:border-mf-coral/60 md:p-8">
      {children}
    </Link>
  ) : (
    <div className="group block overflow-hidden rounded-3xl border border-mia-border bg-gradient-to-br from-mia-surface/70 via-mia-card to-mia-black p-6 opacity-80 shadow-xl md:p-8">
      {children}
    </div>
  )

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <CardShell>
          <div className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${isActive ? 'border-mf-coral/30 bg-mf-coral/10 text-mf-coral' : 'border-mf-orange/30 bg-mf-orange/10 text-mf-orange'}`}>
            <Zap className="h-4 w-4" /> {isActive ? 'Reto activo' : isComingSoon ? 'Próximamente' : 'Reto bloqueado'}
          </div>
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isActive ? 'bg-mf-coral/15 text-mf-coral' : 'bg-mf-orange/10 text-mf-orange'}`}>
                <Trophy className="h-8 w-8" />
              </div>
              <h2 className="font-heading text-3xl font-bold text-mia-cream">{challenge?.name || 'Reto Anti-Deuda: De Deudor a Inversionista'}</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral md:text-base">
                {challenge?.description || 'Completa niveles, desbloquea simuladores por progreso y fecha, y construye tu mapa anti-deuda paso a paso.'}
              </p>
            </div>
            {isActive ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-mf px-5 py-3 text-sm font-bold text-white">
                Entrar al reto
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-mf-orange/30 bg-mf-orange/10 px-5 py-3 text-sm font-bold text-mf-orange">
                <LockKeyhole className="h-4 w-4" /> Próximamente
              </span>
            )}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {['Diagnóstico emocional', 'Diagnóstico financiero', 'Plan de pago', 'Optimización'].map((step, index) => (
              <div key={step} className="rounded-2xl border border-mia-border bg-mia-black/30 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-neutral">Nivel {index + 1}</p>
                <p className="mt-1 text-sm font-semibold text-mia-cream">{step}</p>
              </div>
            ))}
          </div>
        </CardShell>

        <div className="rounded-3xl border border-mia-border bg-mia-card/60 p-6 md:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gain/10 px-3 py-1 text-xs font-bold text-gain">
            <CheckCircle2 className="h-4 w-4" /> Diferencia clave
          </div>
          <h3 className="font-heading text-2xl font-bold text-mia-cream">Retos vs. Simuladores</h3>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-neutral">
            <p>
              <strong className="text-mia-cream">Simuladores:</strong> herramientas individuales que puedes usar directamente para calcular algo puntual.
            </p>
            <p>
              <strong className="text-mia-cream">Retos:</strong> rutas guiadas con pasos, progreso, desbloqueos y fechas de liberación para generar avance y continuidad.
            </p>
            <p className="flex items-start gap-2 rounded-2xl border border-mf-orange/20 bg-mf-orange/10 p-4 text-mf-orange">
              <LockKeyhole className="mt-0.5 h-4 w-4 flex-shrink-0" />
              Algunos niveles pueden estar bloqueados hasta completar el anterior o hasta una fecha definida por el equipo.
            </p>
          </div>
        </div>
      </div>

      {/* Desafío Mundial */}
      <Link href="/retos/desafio-mundial" className="group block overflow-hidden rounded-3xl border border-mf-orange/30 bg-gradient-to-br from-mf-orange/15 via-mia-card to-mia-black p-6 shadow-xl shadow-mf-orange/5 transition hover:-translate-y-1 hover:border-mf-orange/60 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <span className="text-5xl">⚽</span>
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-mf-orange/30 bg-mf-orange/10 px-3 py-1 text-xs font-bold text-mf-orange">
                <Zap className="h-4 w-4" /> Reto de ahorro · Local, sin registro al backend
              </div>
              <h2 className="font-heading text-2xl font-bold text-mia-cream md:text-3xl">Desafío Mundial 2026</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral md:text-base">
                Registra un aporte diario desde hoy hasta el FIFA World Cup 2026. Sigue tu racha, mide tu progreso y llega al torneo con más plata en el bolsillo.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-mf px-5 py-3 text-sm font-bold text-white shadow-lg shadow-mf-coral/20 md:flex-shrink-0">
            Unirme al desafío
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </section>
  )
}
