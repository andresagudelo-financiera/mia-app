'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, TrendingUp, Shield, FileText, ChevronRight } from 'lucide-react'
import { useUserStore } from '@/stores/user.store'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { pushEvent } from '@/lib/analytics'
import { trackMetaEvent } from '@/lib/analytics'
import { SUPPORTED_CURRENCIES } from '@/lib/constants'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().email('Ingresa un email válido'),
  phone: z.string()
    .min(7, 'Mínimo 7 dígitos')
    .max(20, 'Máximo 20 dígitos')
    .regex(/^[+\d\s\-()]+$/, 'Solo números, espacios y +'),
  baseCurrency: z.string().min(1, 'Selecciona tu moneda'),
})

type FormData = z.infer<typeof schema>

interface Props {
  onClose: () => void
}

const benefits = [
  { icon: TrendingUp, text: 'Calculadora de TIR (XIRR) multi-moneda' },
  { icon: FileText, text: 'Reporte PDF brandeado descargable' },
  { icon: Shield, text: 'Datos guardados localmente, sin servidor' },
]

export default function UserRegistrationModal({ onClose }: Props) {
  const register = useUserStore(s => s.register)
  const setBaseCurrency = useRentabilidadStore(s => s.setBaseCurrency)
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<'form' | 'success'>('form')

  useEffect(() => { setMounted(true) }, [])

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { baseCurrency: 'COP' },
  })

  const onSubmit = (data: FormData) => {
    register({ name: data.name, email: data.email, phone: data.phone, baseCurrency: data.baseCurrency })
    setBaseCurrency(data.baseCurrency)
    pushEvent('user_registered', { currency: data.baseCurrency, has_phone: true })
    trackMetaEvent('Lead', { content_name: 'calculadora_rentabilidad' })
    setStep('success')
    setTimeout(() => onClose(), 2000)
  }

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-mia-black/95 backdrop-blur-md" />

      {step === 'form' ? (
          <div
            key="form"
            className="relative w-full max-w-lg transition-all duration-300 animate-in fade-in zoom-in-95"
          >
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-mf-coral/20 border border-mia-border">
              {/* Header */}
              <div className="bg-gradient-mf px-8 py-7 text-center">
                <div className="flex justify-center mb-4">
                  <Image
                    src="/logo-mf-blanco.png"
                    alt="Moneyflow"
                    width={160}
                    height={42}
                    className="h-9 w-auto"
                  />
                </div>
                <h2 className="text-white font-heading font-extrabold text-2xl leading-tight">
                  Accede a tu calculadora
                </h2>
                <p className="text-white/80 text-sm mt-2">
                  Gratis para siempre · Sin tarjeta de crédito
                </p>
              </div>

              {/* Benefits strip */}
              <div className="bg-mia-card border-b border-mia-border px-6 py-3 flex flex-wrap justify-center gap-x-6 gap-y-1.5">
                {benefits.map(b => {
                  const Icon = b.icon
                  return (
                    <div key={b.text} className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-mf-coral flex-shrink-0" />
                      <span className="text-xs text-neutral">{b.text}</span>
                    </div>
                  )
                })}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="bg-mia-card p-8 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-mia-cream/70 uppercase tracking-wider mb-1.5">
                    Nombre completo
                  </label>
                  <input
                    {...formRegister('name')}
                    type="text"
                    placeholder="Claudia Uribe"
                    autoFocus
                    className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream placeholder:text-neutral/50 focus:outline-none focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30 transition-all text-sm"
                  />
                  {errors.name && <p className="text-loss text-xs mt-1">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-mia-cream/70 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    {...formRegister('email')}
                    type="email"
                    placeholder="claudia@email.com"
                    className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream placeholder:text-neutral/50 focus:outline-none focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30 transition-all text-sm"
                  />
                  {errors.email && <p className="text-loss text-xs mt-1">{errors.email.message}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-mia-cream/70 uppercase tracking-wider mb-1.5">
                    Celular <span className="text-neutral/50 normal-case text-xs font-normal">(con indicativo, ej: +57 300 123 4567)</span>
                  </label>
                  <input
                    {...formRegister('phone')}
                    type="tel"
                    placeholder="+57 300 000 0000"
                    className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream placeholder:text-neutral/50 focus:outline-none focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30 transition-all text-sm"
                  />
                  {errors.phone && <p className="text-loss text-xs mt-1">{errors.phone.message}</p>}
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-xs font-semibold text-mia-cream/70 uppercase tracking-wider mb-1.5">
                    Mi moneda principal
                  </label>
                  <select
                    {...formRegister('baseCurrency')}
                    className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream focus:outline-none focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30 transition-all appearance-none text-sm"
                  >
                    {SUPPORTED_CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {errors.baseCurrency && <p className="text-loss text-xs mt-1">{errors.baseCurrency.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-mf text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-60 text-base flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmitting ? 'Activando...' : 'Acceder gratis'}
                  <ChevronRight className="w-5 h-5" />
                </button>

                <p className="text-center text-xs text-neutral/40 leading-relaxed">
                  Tus datos se guardan solo en tu dispositivo. No enviamos spam.<br />
                  Al continuar aceptas recibir contenido educativo de Moneyflow.
                </p>
              </form>
            </div>
          </div>
        ) : (
          <div
            key="success"
            className="relative flex flex-col items-center justify-center gap-5 text-center animate-in fade-in zoom-in-95"
          >
            <div className="p-5 bg-gain/10 border border-gain/30 rounded-full">
              <CheckCircle className="w-12 h-12 text-gain" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold text-mia-cream mb-2">
                ¡Listo! Bienvenido a MIA
              </h2>
              <p className="text-neutral">Cargando tu calculadora...</p>
            </div>
          </div>
        )}
    </div>
  )
}
