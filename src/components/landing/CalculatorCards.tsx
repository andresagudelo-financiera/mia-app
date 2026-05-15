'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Lock, Calculator, ShieldCheck, Gem } from 'lucide-react'
import { adminApi } from '@/services/api/admin.api'
import { mergeSimulatorCatalog } from '@/lib/simulator-catalog'
import type { Simulator } from '@/types/rentabilidad'

const UI_METADATA: Record<string, any> = {
  rentabilidad: {
    icon: TrendingUp,
    accentClass: 'border-mf-coral/40 hover:border-mf-coral',
    iconBg: 'bg-mf-coral/10',
    iconColor: 'text-mf-coral',
  },
  'perfil-riesgo': {
    icon: ShieldCheck,
    accentClass: 'border-gain/40 hover:border-gain',
    iconBg: 'bg-gain/10',
    iconColor: 'text-gain',
  },
  'numero-dorado': {
    icon: Gem,
    accentClass: 'border-mf-orange/40 hover:border-mf-orange',
    iconBg: 'bg-mf-orange/10',
    iconColor: 'text-mf-orange',
  },
  default: {
    icon: Calculator,
    accentClass: 'border-mia-border',
    iconBg: 'bg-mia-surface',
    iconColor: 'text-neutral',
  },
}

export default function CalculatorCards() {
  const [simulators, setSimulators] = useState<Simulator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminApi.listPublicSimulators()
        setSimulators(mergeSimulatorCatalog(data))
      } catch {
        setSimulators(mergeSimulatorCatalog([]))
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
    <section className="px-0 py-8 sm:py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {simulators.map((sim) => {
          const ui = UI_METADATA[sim.slug] || UI_METADATA.default
          const Icon = ui.icon
          const isActive = sim.status === 'active'
          const isComingSoon = sim.status === 'coming_soon' || sim.status === 'disabled'
          const hrefBySlug: Record<string, string> = {
            rentabilidad: '/calculadoras/rentabilidad',
            'perfil-riesgo': '/calculadoras/perfil-riesgo',
            'numero-dorado': '/calculadoras/numero-dorado',
          }
          const href = hrefBySlug[sim.slug] || '#'

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
