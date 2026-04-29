'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { useUserStore } from '@/stores/user.store'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { SUPPORTED_CURRENCIES } from '@/lib/constants'
import { format } from 'date-fns'
import { User, Shield, Download, Upload, Trash2, AlertTriangle } from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function PerfilPage() {
  const router = useRouter()
  const { profile, isRegistered, updateProfile, clearProfile } = useUserStore()
  const { config, setBaseCurrency, exportData, importData, clearData } = useRentabilidadStore()
  const [currencyWarning, setCurrencyWarning] = useState(false)
  const [pendingCurrency, setPendingCurrency] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [toast, setToast] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: profile?.name ?? '', email: profile?.email ?? '' },
  })

  if (!mounted) return null

  if (!isRegistered || !profile) {
    return (
      <>
        <Navbar />
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
    updateProfile(data)
    showToast('✅ Perfil actualizado correctamente')
  }

  const handleExport = () => {
    const data = exportData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mia-datos-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data.config || !Array.isArray(data.investments)) throw new Error('Invalid')
        if (confirm('¿Importar datos? Esto sobrescribirá tus datos actuales.')) {
          importData(data)
          showToast('✅ Datos importados correctamente')
        }
      } catch {
        showToast('❌ El archivo no es un export válido de MIA')
      }
    }
    reader.readAsText(file)
  }

  const handleDelete = () => {
    if (deleteConfirm !== 'CONFIRMAR') return
    clearData()
    clearProfile()
    router.push('/')
  }

  const field = 'w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream focus:outline-none focus:border-mf-coral text-sm'

  return (
    <>
      <Navbar />
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 glass border border-mia-border px-6 py-3 rounded-xl text-sm text-mia-cream shadow-xl">
          {toast}
        </div>
      )}
      <main className="pt-24 pb-16 min-h-screen bg-mia-black">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
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
                <input {...register('email')} type="email" className={field} />
                {errors.email && <p className="text-loss text-xs mt-1">{errors.email.message}</p>}
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

          {/* Export / Import */}
          <section className="glass rounded-2xl p-6 border border-mia-border space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-4 h-4 text-mia-teal" />
              <h2 className="font-heading font-semibold text-mia-cream">Exportar / Importar datos</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-mia-teal text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                Exportar mis datos
              </button>
              <label className="flex items-center gap-2 glass border border-mia-border text-neutral text-sm font-medium px-5 py-2.5 rounded-xl cursor-pointer hover:border-mia-teal/40 transition-all">
                <Upload className="w-4 h-4" />
                Importar datos
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </section>

          {/* Delete */}
          <section className="glass rounded-2xl p-6 border border-loss/30 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-4 h-4 text-loss" />
              <h2 className="font-heading font-semibold text-mia-cream">Zona de peligro</h2>
            </div>
            {!showDeleteModal ? (
              <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 border border-loss text-loss text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-loss/10 transition-colors">
                <Trash2 className="w-4 h-4" />
                Limpiar todos mis datos
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-mia-cream">
                  Esta acción es <strong className="text-loss">irreversible</strong>. Escribe <strong>CONFIRMAR</strong> para proceder.
                </p>
                <input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="CONFIRMAR"
                  className={field + ' max-w-xs border-loss/40 focus:border-loss'}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleteConfirm !== 'CONFIRMAR'}
                    className="px-5 py-2.5 bg-loss text-white text-sm font-bold rounded-xl disabled:opacity-40 transition-opacity"
                  >
                    Borrar definitivamente
                  </button>
                  <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }} className="glass text-neutral text-sm px-5 py-2.5 rounded-xl">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
