'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, TrendingUp } from 'lucide-react'
import { pushEvent } from '@/lib/analytics'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="/key-visuals/money-flow-01.jpg"
          alt="Moneyflow background"
          fill
          priority
          className="object-cover opacity-20"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-mia-black/60 via-mia-black/80 to-mia-black" />
      </div>

      {/* Decorative glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-mf-coral/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-mia-teal/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm">
              <TrendingUp className="w-4 h-4 text-mf-coral" />
              <span className="text-mia-cream/80">Inteligencia financiera real</span>
            </div>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-roboto font-extrabold leading-[1.05] mb-6"
          >
            La arquitectura de tu{' '}
            <span className="gradient-mf-text">libertad financiera</span>
          </h1>

          {/* Sub-headline */}
          <p
            className="text-lg sm:text-xl text-mia-cream/70 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            MIA te da las herramientas para medir, entender y hacer crecer tus inversiones.
            Calcula la rentabilidad real de tu portafolio en COP y USD, con TIR incluida.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/calculadoras/rentabilidad"
              id="hero-cta-primary"
              onClick={() => pushEvent('cta_hero_click', { cta: 'primary' })}
              className="group inline-flex items-center gap-3 bg-gradient-mf text-white font-bold text-base px-8 py-4 rounded-xl hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-mf-coral/30"
            >
              Calcular mi rentabilidad
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/calculadoras"
              id="hero-cta-secondary"
              onClick={() => pushEvent('cta_hero_click', { cta: 'secondary' })}
              className="inline-flex items-center gap-2 glass text-mia-cream font-semibold text-base px-8 py-4 rounded-xl hover:border-mia-blue/40 transition-all duration-300"
            >
              Ver todas las herramientas
            </Link>
          </div>

          {/* Stats */}
          <div
            className="mt-16 flex flex-wrap justify-center gap-8 sm:gap-16"
          >
            {[
              { value: '100%', label: 'Gratuito' },
              { value: 'TIR', label: 'Incluida en cálculos' },
              { value: 'COP + USD', label: 'Multi-moneda' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-heading font-bold gradient-mf-text">{stat.value}</div>
                <div className="text-sm text-neutral mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
      >
        <div className="w-px h-16 bg-gradient-to-b from-transparent to-mf-coral mx-auto" />
      </div>
    </section>
  )
}
