'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Lock, Calculator, ShieldCheck, Gem, HeartPulse, BadgeDollarSign, Route, SearchCheck } from 'lucide-react'
import { adminApi } from '@/services/api/admin.api'
import { DEFAULT_PUBLIC_SIMULATORS, mergeSimulatorCatalog } from '@/lib/simulator-catalog'
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
  'diagnostico-emocional-deuda': {
    icon: HeartPulse,
    accentClass: 'border-pink-400/40 hover:border-pink-400',
    iconBg: 'bg-pink-400/10',
    iconColor: 'text-pink-300',
  },
  'diagnostico-financiero-deuda': {
    icon: BadgeDollarSign,
    accentClass: 'border-gain/40 hover:border-gain',
    iconBg: 'bg-gain/10',
    iconColor: 'text-gain',
  },
  'plan-pago-deuda': {
    icon: Route,
    accentClass: 'border-mf-orange/40 hover:border-mf-orange',
    iconBg: 'bg-mf-orange/10',
    iconColor: 'text-mf-orange',
  },
  'analiza-tu-deuda': {
    icon: SearchCheck,
    accentClass: 'border-sky-400/40 hover:border-sky-400',
    iconBg: 'bg-sky-400/10',
    iconColor: 'text-sky-300',
  },
  default: {
    icon: Calculator,
    accentClass: 'border-mia-border',
    iconBg: 'bg-mia-surface',
    iconColor: 'text-neutral',
  },
}


const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'investment', label: 'Inversión' },
  { key: 'debt', label: 'Anti-Deuda' },
  { key: 'planning', label: 'Planeación' },
]

const CATEGORY_BY_SLUG: Record<string, string> = {
  rentabilidad: 'investment',
  'perfil-riesgo': 'planning',
  'numero-dorado': 'planning',
  'diagnostico-emocional-deuda': 'debt',
  'diagnostico-financiero-deuda': 'debt',
  'plan-pago-deuda': 'debt',
  'analiza-tu-deuda': 'debt',
}

function matchesFilter(simulator: Simulator, activeFilter: string, search: string) {
  const query = search.trim().toLowerCase()
  const category = CATEGORY_BY_SLUG[simulator.slug] || 'investment'
  const matchesCategory = activeFilter === 'all' || category === activeFilter
  const matchesSearch = !query || [simulator.name, simulator.description, simulator.slug]
    .filter(Boolean)
    .some(value => String(value).toLowerCase().includes(query))

  return matchesCategory && matchesSearch
}

export default function CalculatorCards() {
  const [simulators, setSimulators] = useState<Simulator[]>(() => mergeSimulatorCatalog(DEFAULT_PUBLIC_SIMULATORS, { includeDefaults: true }))
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true

    const load = async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true)
        const data = await adminApi.listPublicSimulators()
        if (active) setSimulators(mergeSimulatorCatalog(data, { includeDefaults: true }))
      } catch {
        if (active) setSimulators(mergeSimulatorCatalog(DEFAULT_PUBLIC_SIMULATORS, { includeDefaults: true }))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    const refreshOnFocus = () => load({ silent: true })
    window.addEventListener('focus', refreshOnFocus)
    window.addEventListener('pageshow', refreshOnFocus)

    return () => {
      active = false
      window.removeEventListener('focus', refreshOnFocus)
      window.removeEventListener('pageshow', refreshOnFocus)
    }
  }, [])

  const filteredSimulators = useMemo(
    () => simulators.filter(simulator => matchesFilter(simulator, activeFilter, search)),
    [simulators, activeFilter, search],
  )

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
      <div className="mb-6 rounded-3xl border border-mia-border bg-mia-card/50 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-mf-coral">Filtrar calculadoras</p>
            <h2 className="mt-1 font-heading text-2xl font-bold text-mia-cream">Encuentra la herramienta que necesitas</h2>
          </div>
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar por nombre o tema..."
            className="w-full rounded-xl border border-mia-border bg-mia-black/50 px-4 py-3 text-sm text-mia-cream placeholder:text-neutral/60 outline-none transition focus:border-mf-coral lg:max-w-sm"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map(filter => {
            const active = activeFilter === filter.key
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition ${active ? 'border-mf-coral bg-mf-coral/15 text-mf-coral' : 'border-mia-border bg-mia-surface/60 text-neutral hover:border-mf-coral/50 hover:text-mia-cream'}`}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      {filteredSimulators.length === 0 ? (
        <div className="rounded-2xl border border-mia-border bg-mia-surface/40 p-10 text-center">
          <Calculator className="mx-auto mb-3 h-8 w-8 text-neutral" />
          <p className="font-heading text-xl font-bold text-mia-cream">No encontramos calculadoras con ese filtro</p>
          <p className="mt-2 text-sm text-neutral">Prueba con otra categoría o limpia la búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredSimulators.map((sim) => {
          const ui = UI_METADATA[sim.slug] || UI_METADATA.default
          const Icon = ui.icon
          const isActive = sim.status === 'active'
          const isComingSoon = sim.status === 'coming_soon' || sim.status === 'disabled'
          const hrefBySlug: Record<string, string> = {
            rentabilidad: '/calculadoras/rentabilidad',
            'perfil-riesgo': '/calculadoras/perfil-riesgo',
            'numero-dorado': '/calculadoras/numero-dorado',
            'diagnostico-emocional-deuda': '/calculadoras/diagnostico-emocional-deuda',
            'diagnostico-financiero-deuda': '/calculadoras/diagnostico-financiero-deuda',
            'plan-pago-deuda': '/calculadoras/plan-pago-deuda',
            'analiza-tu-deuda': '/calculadoras/analiza-tu-deuda',
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
      )}
    </section>
  )
}
