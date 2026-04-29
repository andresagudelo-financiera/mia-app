'use client'

import Link from 'next/link'
import { ArrowRight, TrendingUp, Lock } from 'lucide-react'

const calculators = [
  {
    icon: TrendingUp,
    name: 'Calculadora de Rentabilidad',
    description: 'Mide el retorno real de tus inversiones en COP y USD, incluyendo TIR (XIRR) con fechas irregulares.',
    href: '/calculadoras/rentabilidad',
    status: 'active' as const,
    accentClass: 'border-mf-coral/40 hover:border-mf-coral',
    iconBg: 'bg-mf-coral/10',
    iconColor: 'text-mf-coral',
  },
  {
    icon: Lock,
    name: 'Calculadora de Interés Compuesto',
    description: 'Simula el crecimiento de tus ahorros con aportaciones periódicas y tasa de interés.',
    href: '#',
    status: 'soon' as const,
    accentClass: 'border-mia-border',
    iconBg: 'bg-mia-surface',
    iconColor: 'text-neutral',
  },
  {
    icon: Lock,
    name: 'Calculadora FIRE',
    description: 'Calcula cuánto necesitas para alcanzar tu independencia financiera.',
    href: '#',
    status: 'soon' as const,
    accentClass: 'border-mia-border',
    iconBg: 'bg-mia-surface',
    iconColor: 'text-neutral',
  },
]

export default function CalculatorCards() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div
        className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-4">
          Herramientas{' '}
          <span className="gradient-mf-text">disponibles</span>
        </h2>
        <p className="text-lg text-neutral max-w-xl mx-auto">
          Lead magnets financieros diseñados para darte claridad inmediata sobre tu dinero.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {calculators.map((calc, i) => {
          const Icon = calc.icon
          const isActive = calc.status === 'active'
          return (
            <div
              key={calc.name}
              className={`relative glass rounded-2xl p-8 border ${calc.accentClass} transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${isActive ? 'hover:-translate-y-1 hover:shadow-xl hover:shadow-mf-coral/10' : 'opacity-60'}`}
            >
              {!isActive && (
                <span className="absolute top-4 right-4 text-xs font-semibold text-neutral bg-mia-surface px-2 py-1 rounded-full">
                  Próximamente
                </span>
              )}

              <div className={`inline-flex p-3 rounded-xl ${calc.iconBg} mb-6`}>
                <Icon className={`w-6 h-6 ${calc.iconColor}`} />
              </div>

              <h3 className={`text-xl font-heading font-semibold mb-3 ${isActive ? 'text-mia-cream' : 'text-neutral'}`}>
                {calc.name}
              </h3>
              <p className="text-neutral leading-relaxed text-sm mb-6">{calc.description}</p>

              {isActive ? (
                <Link
                  href={calc.href}
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
