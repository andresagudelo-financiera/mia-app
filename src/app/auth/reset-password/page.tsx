'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useMemo, useState } from 'react'
import { CheckCircle, LockKeyhole } from 'lucide-react'
import { userApi } from '@/services/api/user.api'
import { useUserStore } from '@/stores/user.store'

function validatePassword(password: string) {
  if (password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.'
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) || !/\d/.test(password)) return 'Usa al menos una letra y un número.'
  return null
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = useMemo(() => String(searchParams.get('email') || '').trim().toLowerCase(), [searchParams])
  const token = useMemo(() => String(searchParams.get('token') || '').trim(), [searchParams])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isInvalidLink = !email || !token

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (isInvalidLink) {
      setError('El enlace de restablecimiento no es válido.')
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    try {
      setIsSubmitting(true)
      const user = await userApi.resetPassword({ email, token, password })
      if (user) {
        useUserStore.setState({ profile: user, isRegistered: true })
      }
      setSuccess(true)
      setTimeout(() => router.push('/calculadoras'), 1200)
    } catch (error) {
      setError((error as Error).message || 'No pudimos restablecer la contraseña.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-mia-black px-4 py-16 text-mia-cream">
      <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-mia-border bg-mia-card shadow-2xl shadow-mf-coral/10">
        <div className="bg-gradient-to-br from-mf-coral/15 via-mia-card to-mf-orange/10 p-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-mf-coral/10 text-mf-coral">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-mf-coral">Seguridad Moneyflow</p>
          <h1 className="mt-2 font-heading text-3xl font-bold">Restablece tu contraseña</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral">Crea una nueva contraseña para volver a acceder a tus calculadoras, retos y progreso.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-8">
          {isInvalidLink ? (
            <div className="rounded-2xl border border-loss/30 bg-loss/10 p-4 text-sm text-loss">
              Este enlace no contiene los datos necesarios. Solicita uno nuevo desde el login.
            </div>
          ) : success ? (
            <div className="rounded-2xl border border-gain/30 bg-gain/10 p-4 text-sm text-gain">
              <CheckCircle className="mb-2 h-5 w-5" />
              Contraseña actualizada. Te estamos llevando a tus calculadoras.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-mia-border bg-mia-surface/50 p-3 text-xs text-neutral">
                Cuenta: <span className="font-semibold text-mia-cream">{email}</span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mia-cream/70">Nueva contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream outline-none transition focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mia-cream/70">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream outline-none transition focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30"
                  placeholder="Repite tu contraseña"
                />
              </div>

              {error && <div className="rounded-xl border border-loss/20 bg-loss/10 p-3 text-xs text-loss">{error}</div>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-mf py-4 text-base font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </>
          )}

          <Link href="/calculadoras" className="block text-center text-xs font-semibold text-mf-coral hover:text-mf-orange">
            Volver a calculadoras
          </Link>
        </form>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-mia-black p-8 text-mia-cream">Cargando...</main>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
