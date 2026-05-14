'use client'

import { useState } from 'react'
import { CheckCircle, ChevronRight, Loader2, UserPlus, X } from 'lucide-react'
import { adminApi } from '@/services/api/admin.api'
import type { AdminUserSummary } from '@/types/rentabilidad'
import { SUPPORTED_CURRENCIES } from '@/lib/constants'
import { useRouter } from 'next/navigation'

interface Props {
  onClose: () => void
  onSuccess: (user: AdminUserSummary) => void
}

export default function AdminCreateUserModal({ onClose, onSuccess }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'form' | 'exists'>('email')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState('COP')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingUser, setExistingUser] = useState<AdminUserSummary | null>(null)

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    try {
      setLoading(true)
      setError(null)
      // We use listUsers with the exact email to check existence
      const results = await adminApi.listUsers({ search: email.trim() })
      const exactMatch = results.find(u => u.email.toLowerCase() === email.toLowerCase().trim())

      if (exactMatch) {
        setExistingUser(exactMatch)
        setStep('exists')
      } else {
        setStep('form')
      }
    } catch (err) {
      setError('Error al validar el email. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      const user = await adminApi.createUser({
        email: email.trim(),
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        baseCurrency: currency
      })
      onSuccess(user)
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Error al crear el usuario.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-mia-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="rounded-3xl border border-mia-border bg-mia-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-mia-border px-6 py-4">
            <h3 className="font-heading font-bold text-mia-cream">Ingresar nuevo usuario</h3>
            <button onClick={onClose} className="rounded-lg p-1 text-neutral hover:bg-mia-surface hover:text-mia-cream">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            {step === 'email' && (
              <form onSubmit={handleCheckEmail} className="space-y-4">
                <p className="text-sm text-neutral mb-4">
                  Ingresa el correo para validar si el usuario ya tiene una cuenta en MIA.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-neutral uppercase mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@email.com"
                    autoFocus
                    required
                    className="w-full rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-mia-cream outline-none focus:border-mf-coral"
                  />
                </div>
                
                {error && <p className="text-xs text-loss">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf py-4 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Validar correo'}
                  <ChevronRight className="h-5 w-5" />
                </button>
              </form>
            )}

            {step === 'exists' && existingUser && (
              <div className="space-y-6 text-center py-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-gain/10 flex items-center justify-center mb-2">
                  <CheckCircle className="w-8 h-8 text-gain" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-mia-cream mb-1">Usuario ya existe</h4>
                  <p className="text-sm text-neutral">
                    El usuario <strong>{existingUser.name}</strong> ya está registrado.
                  </p>
                </div>
                
                <div className="p-4 bg-mia-surface/50 rounded-2xl border border-mia-border text-left">
                  <p className="text-xs text-neutral uppercase font-bold mb-2">Estado actual</p>
                  <div className="flex items-center justify-between">
                    <span className="text-mia-cream">{existingUser.email}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      existingUser.status === 'active' || existingUser.status === 'paid' ? 'bg-gain/10 text-gain border border-gain/20' : 'bg-loss/10 text-loss border border-loss/20'
                    }`}>
                      {existingUser.status}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/admin/usuarios/${existingUser.id}`)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-mia-surface border border-mia-border py-4 font-bold text-mia-cream hover:bg-mia-surface/80 transition-colors"
                >
                  Ver detalle y gestionar acceso
                </button>
              </div>
            )}

            {step === 'form' && (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="p-3 bg-gain/5 border border-gain/20 rounded-xl mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-gain" />
                  <p className="text-xs text-gain font-medium">Email disponible para registro</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral uppercase mb-1.5">Nombre (opcional)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-mia-cream outline-none focus:border-mf-coral"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral uppercase mb-1.5">Celular (opcional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+57..."
                    className="w-full rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-mia-cream outline-none focus:border-mf-coral"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral uppercase mb-1.5">Moneda base</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-mia-cream outline-none focus:border-mf-coral"
                  >
                    {SUPPORTED_CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {error && <p className="text-xs text-loss">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="flex-1 rounded-xl border border-mia-border py-4 font-bold text-neutral hover:text-mia-cream transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf py-4 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Crear usuario'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
