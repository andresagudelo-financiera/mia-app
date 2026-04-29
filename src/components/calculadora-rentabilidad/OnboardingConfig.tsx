'use client'

import { useState } from 'react'
import { ChevronRight, ChevronLeft, Settings, Globe, CheckCircle, Sparkles } from 'lucide-react'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { useUserStore } from '@/stores/user.store'
import { SUPPORTED_CURRENCIES } from '@/lib/constants'

const STEPS = ['moneda', 'confirmacion'] as const
type Step = typeof STEPS[number]

interface Props {
  onComplete: () => void
}

export default function OnboardingConfig({ onComplete }: Props) {
  const { config, setBaseCurrency } = useRentabilidadStore()
  const profile = useUserStore(s => s.profile)
  const [step, setStep] = useState<Step>('moneda')
  const [currency, setCurrency] = useState(profile?.baseCurrency ?? 'COP')

  const handleConfirm = () => {
    setBaseCurrency(currency)
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-mia-black p-4 animate-in fade-in duration-300">
      {/* Decorative glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-mf-coral/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-mia-teal/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= STEPS.indexOf(step) ? 'bg-mf-coral w-8' : 'bg-mia-border w-4'
              }`}
            />
          ))}
        </div>

        <AnimatedStep key={step}>
          {step === 'moneda' ? (
            <div className="glass rounded-3xl p-8 border border-mia-border shadow-2xl">
              <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-mia-blue/10 rounded-2xl mb-4">
                  <Globe className="w-8 h-8 text-mia-blue" />
                </div>
                <h2 className="text-2xl font-heading font-bold text-mia-cream mb-2">
                  ¿En qué moneda manejas tus inversiones?
                </h2>
                <p className="text-neutral text-sm leading-relaxed max-w-sm mx-auto">
                  Esta será tu moneda base para los cálculos. Puedes cambiarla después en la configuración.
                </p>
              </div>

              {/* Currency selector */}
              <div className="space-y-3 mb-8">
                {/* Quick options */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['COP', 'USD', 'EUR', 'MXN', 'PEN', 'CLP'].map(c => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                        currency === c
                          ? 'bg-gradient-mf text-white border-transparent shadow-lg shadow-mf-coral/20'
                          : 'glass border-mia-border text-neutral hover:border-mia-blue/40 hover:text-mia-cream'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {/* Other currency */}
                <div>
                  <label className="block text-xs font-medium text-neutral mb-1.5">Otra moneda</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream focus:outline-none focus:border-mf-coral appearance-none text-sm"
                  >
                    {SUPPORTED_CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => { setBaseCurrency(currency); setStep('confirmacion') }}
                className="w-full bg-gradient-mf text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Continuar
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="glass rounded-3xl p-8 border border-mia-border shadow-2xl">
              <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-gain/10 rounded-2xl mb-4">
                  <CheckCircle className="w-8 h-8 text-gain" />
                </div>
                <h2 className="text-2xl font-heading font-bold text-mia-cream mb-2">
                  ¡Perfecto, {profile?.name ? profile.name.split(' ')[0] : 'Inversor'}!
                </h2>
                <p className="text-neutral text-sm leading-relaxed max-w-sm mx-auto">
                  Tu calculadora está configurada con moneda base <strong className="text-mf-coral">{currency}</strong>.
                  Ahora agrega tus inversiones para comenzar.
                </p>
              </div>

              {/* Cómo usar — resumen del flujo del Excel */}
              <div className="space-y-3 mb-8">
                {[
                  { letter: 'A', title: 'Configuración', desc: 'Personaliza pilares, entidades y monedas (ya está listo)', done: true },
                  { letter: 'B', title: 'Inversiones', desc: 'Crea tus buckets: CDTs, fondos, acciones, etc.' },
                  { letter: 'C', title: 'Entradas y Salidas', desc: 'Registra cada aporte con fecha, monto y TRM si es en USD' },
                  { letter: 'D', title: 'Cortes de Valor', desc: 'Ingresa el valor actual de cada inversión para la fecha de hoy' },
                  { letter: 'E', title: 'Resultados TIR', desc: 'Obtén tu TIR en moneda local, USD y USD→moneda local' },
                ].map(item => (
                  <div key={item.letter} className={`flex items-start gap-3 p-3 rounded-xl ${item.done ? 'bg-gain/5 border border-gain/20' : 'bg-mia-surface/50'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      item.done ? 'bg-gain text-white' : 'bg-gradient-mf text-white'
                    }`}>
                      {item.letter}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-mia-cream">{item.title}</p>
                      <p className="text-xs text-neutral mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('moneda')}
                  className="flex items-center gap-2 glass border border-mia-border text-neutral text-sm font-medium px-4 py-3 rounded-xl hover:text-mia-cream transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-gradient-mf text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Comenzar a calcular
                </button>
              </div>
            </div>
          )}
        </AnimatedStep>
      </div>
    </div>
  )
}

function AnimatedStep({ children, key: k }: { children: React.ReactNode; key?: string }) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {children}
    </div>
  )
}
