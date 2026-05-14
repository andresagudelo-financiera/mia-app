'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Lock, Calculator } from 'lucide-react'
import { adminApi } from '@/services/api/admin.api'
import type { Simulator } from '@/types/rentabilidad'

const UI_METADATA: Record<string, any> = {
  rentabilidad: {
    icon: TrendingUp,
    accentClass: 'border-mf-coral/40 hover:border-mf-coral',
    iconBg: 'bg-mf-coral/10',
    iconColor: 'text-mf-coral',
  },
  default: {
    icon: Calculator,
    accentClass: 'border-mia-border',
    iconBg: 'bg-mia-surface',
    iconColor: 'text-neutral',
  },
}

// Keep hardcoded placeholders for future tools if they aren't in the DB yet
const PLACEHOLDERS = [
  {
    key: 'interes-compuesto',
    name: 'Calculadora de Interés Compuesto',
    description: 'Simula el crecimiento de tus ahorros con aportaciones periódicas y tasa de interés.',
    status: 'coming_soon',
  },
  {
    key: 'fire',
    name: 'Calculadora FIRE',
    description: 'Calcula cuánto necesitas para alcanzar tu independencia financiera.',
    status: 'coming_soon',
  },
]

export default function CalculatorCards() {
  const [simulators, setSimulators] = useState<Simulator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminApi.listPublicSimulators()
        // Merge with placeholders for tools not yet in DB
        const all = [...data]
        PLACEHOLDERS.forEach(p => {
          if (!all.find(s => s.slug === p.key)) {
            all.push({
              id: p.key,
              slug: p.key,
              name: p.name,
              description: p.description,
              status: p.status as any,
              accessType: 'free',
            })
          }
        })
        setSimulators(all)
      } catch (error) {
        console.error('Error loading simulators:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-mf-coral"></div>
        <p className="mt-4 text-neutral">Cargando herramientas...</p>
      </div>
    )
  }

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-4">
          Herramientas <span className="gradient-mf-text">disponibles</span>
        </h2>
        <p className="text-lg text-neutral max-w-xl mx-auto">
          Lead magnets financieros diseñados para darte claridad inmediata sobre tu dinero.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {simulators.map((sim) => {
          const ui = UI_METADATA[sim.slug] || UI_METADATA.default
          const Icon = ui.icon
          const isActive = sim.status === 'active'
          const isComingSoon = sim.status === 'coming_soon' || sim.status === 'disabled'
          const href = sim.slug === 'rentabilidad' ? '/calculadoras/rentabilidad' : '#'

          return (
            <div
              key={sim.id}
              className={`relative glass rounded-2xl p-8 border ${ui.accentClass} transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${isActive ? 'hover:-translate-y-1 hover:shadow-xl hover:shadow-mf-coral/10' : 'opacity-60'}`}
            >
              {isComingSoon && (
                <span className="absolute top-4 right-4 text-xs font-semibold text-neutral bg-mia-surface px-2 py-1 rounded-full">
                  Próximamente
                </span>
              )}

              <div className={`inline-flex p-3 rounded-xl ${ui.iconBg} mb-6`}>
                <Icon className={`w-6 h-6 ${ui.iconColor}`} />
              </div>

              <h3 className={`text-xl font-heading font-semibold mb-3 ${isActive ? 'text-mia-cream' : 'text-neutral'}`}>
                {sim.name}
              </h3>
              <p className="text-neutral leading-relaxed text-sm mb-6">{sim.description}</p>

              {isActive ? (
                <Link
                  href={href}
                  className="inline-flex items-center gap-2 bg-gradient-mf text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Usar gratis
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center gap-2 bg-mia-surface text-neutral text-sm font-bold px-5 py-2.5 rounded-lg cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  Próximamente
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
