'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LogIn, ShieldAlert } from 'lucide-react'

type GoogleCredentialResponse = {
  credential?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            callback: (response: GoogleCredentialResponse) => void
            ux_mode?: 'popup' | 'redirect'
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              type?: 'standard' | 'icon'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              width?: string | number
            },
          ) => void
          cancel?: () => void
        }
      }
    }
  }
}

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSigningOutExpiredSession, setIsSigningOutExpiredSession] = useState(false)

  const callbackUrl = searchParams.get('callbackUrl') || '/admin'
  const nextAuthError = searchParams.get('error')

  const staffPanelRoles = ['admin', 'coach', 'money_strategist']
  const isAuthenticatedStaff =
    status === 'authenticated' &&
    staffPanelRoles.includes(String(session?.user?.role || '')) &&
    session?.user?.isActive === true

  const isAdmin = session?.user?.role === 'admin'
  const isCoachAllowedRoute = pathname === '/admin/usuarios' || pathname.startsWith('/admin/usuarios/') || pathname === '/admin/perfil'


  useEffect(() => {
    if (status !== 'authenticated') return

    const expiresAt = session?.adminTokenExpiresAt ? new Date(session.adminTokenExpiresAt).getTime() : null
    const expiredByTime = expiresAt !== null && Number.isFinite(expiresAt) && expiresAt <= Date.now()

    if (session?.error === 'AdminTokenExpired' || expiredByTime) {
      setIsSigningOutExpiredSession(true)
      void signOut({ callbackUrl: '/admin?expired=1' })
    }
  }, [session?.adminTokenExpiresAt, session?.error, status])

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setLoginError('Tu sesión expiró. Vuelve a iniciar sesión para continuar.')
      return
    }

    if (nextAuthError) {
      setLoginError('Credenciales inválidas o usuario sin permisos de administrador.')
    }
  }, [nextAuthError, searchParams])

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
        setLoginError('Credenciales inválidas o usuario sin permisos de panel.')
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

  const googleLogin = useCallback(async (idToken: string) => {
    if (!idToken) {
      setLoginError('Google no retornó una sesión válida.')
      return
    }

    try {
      setIsSubmitting(true)
      setLoginError(null)

      const result = await signIn('admin-google', {
        idToken,
        redirect: false,
        callbackUrl,
      })

      if (!result?.ok || result.error) {
        setLoginError('Tu cuenta de Google no tiene permisos activos para el panel.')
        return
      }

      router.replace(result.url || callbackUrl)
      router.refresh()
    } catch (error) {
      console.error('Admin Google login failed:', error)
      setLoginError('No pudimos validar Google. Revisa la configuración y vuelve a intentar.')
    } finally {
      setIsSubmitting(false)
    }
  }, [callbackUrl, router])

  if (isSigningOutExpiredSession) {
    return (
      <div className="min-h-screen bg-mia-black pt-16 flex items-center justify-center px-4">
        <div className="glass rounded-3xl border border-mf-coral/30 px-8 py-6 text-center text-neutral">
          Tu sesión expiró. Cerrando sesión...
        </div>
      </div>
    )
  }

  if (isAuthenticatedStaff) {
    if (!isAdmin && !isCoachAllowedRoute) {
      return (
        <div className="min-h-screen bg-mia-black pt-16 flex items-center justify-center px-4">
          <div className="glass w-full max-w-2xl rounded-3xl border border-mf-coral/30 p-8 text-center shadow-2xl sm:p-12">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-mf-coral/10 text-mf-coral">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-mia-cream">Modo coach / MS</h1>
            <p className="mt-2 text-sm text-neutral">Tu rol puede consultar leads y respuestas, pero no modificar configuración administrativa.</p>
            <button
              type="button"
              onClick={() => router.replace('/admin/usuarios')}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-mf px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Ir a leads
            </button>
          </div>
        </div>
      )
    }

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
            Tu usuario existe, pero no tiene rol de panel activo en el backend.
          </p>
          <p className="mt-3 text-xs text-neutral/70">Usuario actual: {session.user?.email}</p>
        </div>
      </div>
    )
  }

  return <AdminLoginForm loginError={loginError} isSubmitting={isSubmitting} login={login} googleLogin={googleLogin} />
}

function AdminLoginForm({
  loginError,
  isSubmitting,
  login,
  googleLogin,
}: {
  loginError: string | null
  isSubmitting: boolean
  login: (email: string, password: string) => Promise<void>
  googleLogin: (idToken: string) => Promise<void>
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
          Ingresa con tus credenciales de panel. El backend validará que tu usuario esté activo y tenga rol admin, coach o money_strategist.
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

          <div className="pt-2">
            <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-neutral/60">
              <span className="h-px flex-1 bg-mia-border" />
              o ingresa con Google
              <span className="h-px flex-1 bg-mia-border" />
            </div>
            <GoogleAdminSignInButton disabled={isSubmitting} onCredential={googleLogin} />
          </div>

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

function GoogleAdminSignInButton({
  disabled,
  onCredential,
}: {
  disabled: boolean
  onCredential: (idToken: string) => Promise<void>
}) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle')
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId) {
      setStatus('missing')
      return
    }

    let isMounted = true

    const renderGoogleButton = () => {
      if (!isMounted || !buttonRef.current || !window.google?.accounts?.id) return

      buttonRef.current.innerHTML = ''
      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: 'popup',
        callback: (response) => {
          if (!response.credential) return
          void onCredential(response.credential)
        },
      })
      const buttonWidth = Math.min(384, Math.max(280, buttonRef.current.clientWidth || 384))
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'pill',
        text: 'signin_with',
        width: buttonWidth,
      })
      setStatus('ready')
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton()
      return () => {
        isMounted = false
      }
    }

    setStatus('loading')
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')

    if (existingScript) {
      existingScript.addEventListener('load', renderGoogleButton, { once: true })
      existingScript.addEventListener('error', () => setStatus('error'), { once: true })
      return () => {
        isMounted = false
        existingScript.removeEventListener('load', renderGoogleButton)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = renderGoogleButton
    script.onerror = () => {
      if (isMounted) setStatus('error')
    }
    document.head.appendChild(script)

    return () => {
      isMounted = false
    }
  }, [clientId, onCredential])

  if (status === 'missing') {
    return (
      <div className="rounded-2xl border border-mia-border bg-mia-surface px-4 py-3 text-center text-sm text-neutral">
        Configura NEXT_PUBLIC_GOOGLE_CLIENT_ID para habilitar Google.
      </div>
    )
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : undefined}>
      <div ref={buttonRef} className="flex min-h-[44px] justify-center" />
      {status === 'loading' && <p className="mt-2 text-center text-xs text-neutral/70">Cargando Google...</p>}
      {status === 'error' && (
        <p className="mt-2 text-center text-xs text-loss">No se pudo cargar Google Sign-In.</p>
      )}
    </div>
  )
}
