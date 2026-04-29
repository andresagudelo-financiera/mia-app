'use client'

import { Wrench, GraduationCap, ShoppingBag } from 'lucide-react'

const pillars = [
  {
    icon: Wrench,
    title: 'Herramientas financieras gratuitas',
    description:
      'Calculadoras profesionales para medir el retorno real de tus inversiones en moneda local y USD, con TIR incluida.',
    color: 'text-mf-coral',
    bg: 'bg-mf-coral/10',
    border: 'border-mf-coral/20',
  },
  {
    icon: GraduationCap,
    title: 'Educación práctica',
    description:
      'Aprende a estructurar tu dinero con el método MIA: las 4 cuentas, la reserva de oxígeno, el patrimonio real.',
    color: 'text-mia-blue',
    bg: 'bg-mia-blue/10',
    border: 'border-mia-blue/20',
  },
  {
    icon: ShoppingBag,
    title: 'Infoproductos',
    description:
      'Cursos, guías y plantillas para acelerar tu evolución financiera. Próximamente en el Marketplace MIA.',
    color: 'text-mia-teal',
    bg: 'bg-mia-teal/10',
    border: 'border-mia-teal/20',
    badge: 'Próximamente',
  },
]

export default function WhatIsMIA() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div
        className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-4">
          ¿Qué es{' '}
          <span className="gradient-mia-text">MIA</span>?
        </h2>
        <p className="text-lg text-neutral max-w-2xl mx-auto">
          Money Intelligent Access. Un ecosistema digital diseñado por Moneyflow para que tomes el control real de tu dinero.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pillars.map((pillar, i) => {
          const Icon = pillar.icon
          return (
            <div
              key={pillar.title}
              className={`relative glass rounded-2xl p-8 border ${pillar.border} hover:border-opacity-60 transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4`}
            >
              {pillar.badge && (
                <span className="absolute top-4 right-4 text-xs font-semibold text-mia-teal bg-mia-teal/10 px-2 py-1 rounded-full">
                  {pillar.badge}
                </span>
              )}
              <div className={`inline-flex p-3 rounded-xl ${pillar.bg} mb-6`}>
                <Icon className={`w-6 h-6 ${pillar.color}`} />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-3 text-mia-cream">
                {pillar.title}
              </h3>
              <p className="text-neutral leading-relaxed">{pillar.description}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
