'use client'

import { useEffect, useRef, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn, ShieldAlert } from 'lucide-react'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const callbackUrl = searchParams.get('callbackUrl') || '/admin'
  const nextAuthError = searchParams.get('error')

  const isAuthenticatedAdmin =
    status === 'authenticated' &&
    session?.user?.role === 'admin' &&
    session.user.isActive === true

  useEffect(() => {
    if (nextAuthError) {
      setLoginError('Credenciales inválidas o usuario sin permisos de administrador.')
    }
  }, [nextAuthError])

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      setLoginError('Ingresa email y contraseña para continuar.')
      return
    }

    try {
      setIsSubmitting(true)
      setLoginError(null)

      const result = await signIn('admin-credentials', {
        email: normalizedEmail,
        password,
        redirect: false,
        callbackUrl,
      })

      if (!result?.ok || result.error) {
        setLoginError('Credenciales inválidas o usuario sin permisos de administrador.')
        return
      }

      router.replace(result.url || callbackUrl)
      router.refresh()
    } catch (error) {
      console.error('Admin login failed:', error)
      setLoginError('No pudimos iniciar sesión. Revisa que el backend esté activo e intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isAuthenticatedAdmin) {
    return <>{children}</>
  }

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-mia-black pt-16 flex items-center justify-center px-4">
        <div className="glass w-full max-w-2xl rounded-3xl border border-loss/30 p-8 text-center shadow-2xl sm:p-12">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-loss/10 text-loss">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-mia-cream">Acceso admin requerido</h1>
          <p className="mt-2 text-sm text-neutral">
            Tu usuario existe, pero no tiene rol de administrador activo en el backend.
          </p>
          <p className="mt-3 text-xs text-neutral/70">Usuario actual: {session.user?.email}</p>
        </div>
      </div>
    )
  }

  return <AdminLoginForm loginError={loginError} isSubmitting={isSubmitting} login={login} />
}

function AdminLoginForm({
  loginError,
  isSubmitting,
  login,
}: {
  loginError: string | null
  isSubmitting: boolean
  login: (email: string, password: string) => Promise<void>
}) {
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const submitLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void login(emailRef.current?.value || '', passwordRef.current?.value || '')
  }

  return (
    <div className="min-h-screen bg-mia-black pt-16 flex items-center justify-center px-4">
      <div className="glass w-full max-w-3xl rounded-3xl border border-mia-border px-6 py-14 text-center shadow-2xl sm:px-12">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-mf-coral/10 text-mf-coral">
          <LogIn className="h-8 w-8" />
        </div>
        <h1 className="font-heading text-4xl font-bold text-mia-cream sm:text-5xl">
          Inicia sesión
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-neutral sm:text-lg">
          Ingresa con tus credenciales admin. El backend validará que el usuario esté activo y tenga rol administrador.
        </p>

        <form onSubmit={submitLogin} className="mx-auto mt-8 max-w-md space-y-4 text-left">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral">
              Email
            </label>
            <input
              ref={emailRef}
              name="email"
              type="email"
              placeholder="admin@financieramente.com"
              autoFocus
              autoComplete="username"
              required
              className="w-full rounded-2xl border border-mia-border bg-mia-surface px-5 py-4 text-mia-cream outline-none transition-colors placeholder:text-neutral/50 focus:border-mf-coral"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral">
              Contraseña
            </label>
            <input
              ref={passwordRef}
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border border-mia-border bg-mia-surface px-5 py-4 text-mia-cream outline-none transition-colors placeholder:text-neutral/50 focus:border-mf-coral"
            />
          </div>

          {loginError && (
            <div className="rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-mf px-8 py-4 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <LogIn className="h-5 w-5" />
            {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}
