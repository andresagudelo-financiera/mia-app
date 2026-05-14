'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { useUserStore } from '@/stores/user.store'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { SUPPORTED_CURRENCIES } from '@/lib/constants'
import { format } from 'date-fns'
import { User, Shield, AlertTriangle, LogOut, MessageCircle } from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function PerfilPage() {
  const router = useRouter()
  const { profile, isRegistered, updateProfile, clearProfile } = useUserStore()
  const { config, setBaseCurrency, exportData, importData } = useRentabilidadStore()
  const [currencyWarning, setCurrencyWarning] = useState(false)
  const [pendingCurrency, setPendingCurrency] = useState('')
  const [toast, setToast] = useState('')
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: profile?.name ?? '' },
  })

  if (!isRegistered || !profile) {
    return (
      <>
        <Navbar variant="user" />
        <main className="pt-24 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-neutral mb-4">Debes registrarte para acceder a tu perfil.</p>
            <button onClick={() => router.push('/')} className="bg-gradient-mf text-white px-6 py-3 rounded-xl font-bold">
              Ir al inicio
            </button>
          </div>
        </main>
      </>
    )
  }

  const onSaveProfile = (data: ProfileForm) => {
    updateProfile({ name: data.name })
    showToast('✅ Perfil actualizado correctamente')
  }

  const handleLogout = () => {
    clearProfile()
    router.push('/')
  }

  const field = 'w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream focus:outline-none focus:border-mf-coral text-sm'

  return (
    <>
      <Navbar variant="user" />
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 glass border border-mia-border px-6 py-3 rounded-xl text-sm text-mia-cream shadow-xl">
          {toast}
        </div>
      )}
      <main className="pt-24 pb-16 min-h-screen bg-mia-black">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-mf rounded-2xl">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-heading font-bold text-mia-cream">Mi Perfil</h1>
                <p className="text-neutral text-sm">
                  Miembro desde {format(new Date(profile.registeredAt), 'MMMM yyyy')}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-mia-border px-5 py-2.5 text-sm font-bold text-neutral transition-colors hover:border-mf-coral/40 hover:text-mia-cream"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>

          {/* Edit Profile */}
          <section className="glass rounded-2xl p-6 border border-mia-border space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-mf-coral" />
              <h2 className="font-heading font-semibold text-mia-cream">Editar perfil</h2>
            </div>
            <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral mb-1">Nombre</label>
                <input {...register('name')} className={field} />
                {errors.name && <p className="text-loss text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral mb-1">Email</label>
                <input
                  value={profile.email}
                  type="email"
                  readOnly
                  className={`${field} cursor-not-allowed opacity-70`}
                />
                <p className="mt-1 text-xs text-neutral/70">El correo no se puede editar porque identifica tu cuenta.</p>
              </div>
              <button type="submit" className="bg-gradient-mf text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                Guardar cambios
              </button>
            </form>
          </section>

          {/* Currency */}
          <section className="glass rounded-2xl p-6 border border-mia-border space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-mia-blue" />
              <h2 className="font-heading font-semibold text-mia-cream">Moneda base</h2>
            </div>
            {currencyWarning && (
              <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-mia-cream mb-2">
                    Cambiar a <strong>{pendingCurrency}</strong> no recalcula datos históricos.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => { setBaseCurrency(pendingCurrency); setCurrencyWarning(false); showToast('✅ Moneda base actualizada') }} className="px-3 py-1.5 bg-gradient-mf text-white text-xs font-bold rounded-lg">
                      Confirmar
                    </button>
                    <button onClick={() => setCurrencyWarning(false)} className="px-3 py-1.5 glass text-neutral text-xs rounded-lg">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-neutral mb-1">
                Moneda actual: <strong className="text-mf-coral">{config.baseCurrency}</strong>
              </label>
              <select
                value={config.baseCurrency}
                onChange={e => { setPendingCurrency(e.target.value); setCurrencyWarning(true) }}
                className={field + ' max-w-xs'}
              >
                {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </section>

          {/* Money Strategist CTA */}
          <section className="glass rounded-2xl border border-mf-coral/30 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-mf-coral" />
                  <h2 className="font-heading text-xl font-semibold text-mia-cream">¿Quieres revisar tu estrategia?</h2>
                </div>
                <p className="max-w-xl text-sm text-neutral">
                  Agenda una conversación con un Money Strategist para interpretar tus resultados y definir próximos pasos.
                </p>
              </div>
              <a
                href="https://wa.me/573205389740"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" />
                Contactar a un Money Strategist
              </a>
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </>
  )
}
