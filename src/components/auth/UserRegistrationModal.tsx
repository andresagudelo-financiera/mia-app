'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, TrendingUp, Shield, FileText, ChevronRight, ArrowLeft } from 'lucide-react'
import { useUserStore } from '@/stores/user.store'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { pushEvent } from '@/lib/analytics'
import { trackMetaEvent } from '@/lib/analytics'
import { SUPPORTED_CURRENCIES } from '@/lib/constants'
import { userApi } from '@/services/api/user.api'

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email('Ingresa un email válido'),
  phone: z.string().optional(),
  baseCurrency: z.string().min(1, 'Selecciona tu moneda'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  onClose: () => void
  toolName?: string
  contentName?: string
  backHref?: string
  backLabel?: string
}

const benefits = [
  { icon: TrendingUp, text: 'Calculadora de TIR (XIRR) multi-moneda' },
  { icon: FileText, text: 'Reporte PDF brandeado descargable' },
  { icon: Shield, text: 'Backup seguro en la nube y privacidad' },
]

type CountryDialCode = {
  code: string
  name: string
  flag: string
  dialCode: string
  example: string
  min: number
  max: number
  pattern?: RegExp
  validationMessage?: string
}

const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  {
    code: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    dialCode: '+57',
    example: '300 123 4567',
    min: 10,
    max: 10,
    pattern: /^3\d{9}$/,
    validationMessage: 'En Colombia el celular debe tener 10 dígitos y empezar por 3.',
  },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', dialCode: '+1', example: '305 123 4567', min: 10, max: 10 },
  { code: 'MX', name: 'México', flag: '🇲🇽', dialCode: '+52', example: '55 1234 5678', min: 10, max: 10 },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', dialCode: '+51', example: '987 654 321', min: 9, max: 9 },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dialCode: '+56', example: '9 1234 5678', min: 9, max: 9 },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', dialCode: '+593', example: '99 123 4567', min: 9, max: 9 },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dialCode: '+54', example: '9 11 1234 5678', min: 10, max: 11 },
  { code: 'ES', name: 'España', flag: '🇪🇸', dialCode: '+34', example: '612 345 678', min: 9, max: 9 },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', dialCode: '+55', example: '11 91234 5678', min: 10, max: 11 },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', dialCode: '+507', example: '6123 4567', min: 8, max: 8 },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', dialCode: '+506', example: '8888 8888', min: 8, max: 8 },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴', dialCode: '+1', example: '809 123 4567', min: 10, max: 10 },
]

function getPhoneDigits(value?: string) {
  return String(value || '').replace(/\D/g, '')
}

function normalizeNationalPhone(value: string, country: CountryDialCode) {
  const digits = getPhoneDigits(value)
  const dialDigits = country.dialCode.replace(/\D/g, '')

  if (digits.startsWith(dialDigits) && digits.length > country.max) {
    return digits.slice(dialDigits.length)
  }

  return digits
}

function validatePassword(password?: string) {
  const value = password || ''

  if (value.length < 8) {
    return 'La contraseña debe tener mínimo 8 caracteres.'
  }

  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(value) || !/\d/.test(value)) {
    return 'Usa al menos una letra y un número.'
  }

  return null
}


const TRACKING_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
  'gclid',
  'fbclid',
  'ttclid',
  'msclkid',
] as const

function getCurrentUtms() {
  const fallback = {
    utm_source: 'direct',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
    utm_id: '',
    gclid: '',
    fbclid: '',
    ttclid: '',
    msclkid: '',
    referrer: '',
    landing_page: '',
  }

  if (typeof window === 'undefined') return fallback

  const params = new URLSearchParams(window.location.search)
  const output = { ...fallback }

  TRACKING_KEYS.forEach(key => {
    const camelKey = key.replace(/_([a-z])/g, (_, char) => String(char).toUpperCase())
    const currentValue = params.get(key) || params.get(camelKey)
    const storedValue = localStorage.getItem(`mia_${key}`)
    ;(output as Record<string, string>)[key] = currentValue || storedValue || ''
    if (currentValue) localStorage.setItem(`mia_${key}`, currentValue)
  })

  output.utm_source = output.utm_source || 'direct'
  output.referrer = document.referrer || localStorage.getItem('mia_referrer') || ''
  output.landing_page = window.location.href

  if (document.referrer) localStorage.setItem('mia_referrer', document.referrer)
  localStorage.setItem('mia_landing_page', window.location.href)

  return output
}

export default function UserRegistrationModal({ onClose, toolName = 'rentabilidad', contentName = 'calculadora_rentabilidad', backHref = '/calculadoras', backLabel = 'Volver' }: Props) {
  const { register, login, setInitialPassword, progressiveEntry } = useUserStore()
  const setBaseCurrency = useRentabilidadStore(s => s.setBaseCurrency)
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<'email' | 'login' | 'setupPassword' | 'form' | 'success'>('email')
  const [error, setError] = useState<string | null>(null)
  const [isValidatingEmail, setIsValidatingEmail] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [selectedCountryCode, setSelectedCountryCode] = useState('CO')
  const [isRequestingPasswordReset, setIsRequestingPasswordReset] = useState(false)
  const [passwordResetSent, setPasswordResetSent] = useState(false)

  const selectedCountry =
    COUNTRY_DIAL_CODES.find(country => country.code === selectedCountryCode) || COUNTRY_DIAL_CODES[0]

  useEffect(() => { setMounted(true) }, [])

  const {
    register: formRegister,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { baseCurrency: 'COP', phone: '' },
  })

  const requestPasswordReset = async () => {
    const email = watch('email')
    try {
      setError(null)
      setPasswordResetSent(false)
      setIsRequestingPasswordReset(true)
      await userApi.requestPasswordReset(email)
      setPasswordResetSent(true)
      pushEvent('password_reset_requested', { toolName })
    } catch (error) {
      setError((error as Error).message || 'No pudimos enviar el correo de restablecimiento.')
    } finally {
      setIsRequestingPasswordReset(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      setError(null)
      setPasswordResetSent(false)
      
      if (step === 'email') {
        const nationalPhone = normalizeNationalPhone(data.phone || '', selectedCountry)
        const fullPhone = `${selectedCountry.dialCode}${nationalPhone}`

        if (nationalPhone.length < selectedCountry.min || nationalPhone.length > selectedCountry.max) {
          const expectedLength =
            selectedCountry.min === selectedCountry.max
              ? `${selectedCountry.min} dígitos`
              : `entre ${selectedCountry.min} y ${selectedCountry.max} dígitos`

          setFieldError('phone', { message: `Ingresa un WhatsApp válido de ${selectedCountry.name}: ${expectedLength}.` })
          return
        }

        if (selectedCountry.pattern && !selectedCountry.pattern.test(nationalPhone)) {
          setFieldError('phone', { message: selectedCountry.validationMessage || `Ingresa un WhatsApp válido de ${selectedCountry.name}.` })
          return
        }

        setIsValidatingEmail(true)
        await progressiveEntry({
          email: data.email,
          phone: fullPhone,
          baseCurrency: data.baseCurrency || 'COP',
          ...getCurrentUtms(),
        }, toolName)
        setBaseCurrency(data.baseCurrency || 'COP')
        pushEvent('user_registered', { method: 'progressive_entry', has_phone: true })
        trackMetaEvent('Lead', { content_name: contentName })
        setIsNewUser(true)
        setStep('success')
        setTimeout(() => onClose(), 900)
        return
      }

      if (step === 'login') {
        if (!data.password) {
          setFieldError('password', { message: 'Ingresa tu contraseña.' })
          return
        }

        const success = await login(data.email, data.password || '', toolName)
        if (!success) {
          setError('No pudimos iniciar sesión. Revisa tus credenciales.')
          return
        }

        pushEvent('user_login', { method: 'password' })
        setIsNewUser(false)
        setStep('success')
        setTimeout(() => onClose(), 1000)
        return
      }

      if (step === 'setupPassword') {
        const nationalPhone = normalizeNationalPhone(data.phone || '', selectedCountry)
        const fullPhone = `${selectedCountry.dialCode}${nationalPhone}`
        const passwordError = validatePassword(data.password)

        if (nationalPhone.length < selectedCountry.min || nationalPhone.length > selectedCountry.max) {
          const expectedLength =
            selectedCountry.min === selectedCountry.max
              ? `${selectedCountry.min} dígitos`
              : `entre ${selectedCountry.min} y ${selectedCountry.max} dígitos`

          setFieldError('phone', { message: `Ingresa un número válido de ${selectedCountry.name}: ${expectedLength}.` })
          return
        }

        if (selectedCountry.pattern && !selectedCountry.pattern.test(nationalPhone)) {
          setFieldError('phone', { message: selectedCountry.validationMessage || `Ingresa un número válido de ${selectedCountry.name}.` })
          return
        }

        if (passwordError) {
          setFieldError('password', { message: passwordError })
          return
        }

        if (data.password !== data.confirmPassword) {
          setFieldError('confirmPassword', { message: 'Las contraseñas no coinciden.' })
          return
        }

        const success = await setInitialPassword({ email: data.email, phone: fullPhone, password: data.password || '' }, toolName)
        if (!success) {
          setError('No pudimos crear tu contraseña. Revisa los datos.')
          return
        }

        pushEvent('user_password_created', { method: 'phone_validation' })
        setStep('success')
        setTimeout(() => onClose(), 1000)
        return
      }

      // Registration step
      const name = data.name?.trim() || ''
      const nationalPhone = normalizeNationalPhone(data.phone || '', selectedCountry)
      const fullPhone = `${selectedCountry.dialCode}${nationalPhone}`
      const passwordError = validatePassword(data.password)

      if (name.length < 2) {
        setFieldError('name', { message: 'Mínimo 2 caracteres' })
        return
      }

      if (name.length > 100) {
        setFieldError('name', { message: 'Máximo 100 caracteres' })
        return
      }

      if (nationalPhone.length < selectedCountry.min || nationalPhone.length > selectedCountry.max) {
        const expectedLength =
          selectedCountry.min === selectedCountry.max
            ? `${selectedCountry.min} dígitos`
            : `entre ${selectedCountry.min} y ${selectedCountry.max} dígitos`

        setFieldError('phone', { message: `Ingresa un número válido de ${selectedCountry.name}: ${expectedLength}.` })
        return
      }

      if (selectedCountry.pattern && !selectedCountry.pattern.test(nationalPhone)) {
        setFieldError('phone', { message: selectedCountry.validationMessage || `Ingresa un número válido de ${selectedCountry.name}.` })
        return
      }

      if (passwordError) {
        setFieldError('password', { message: passwordError })
        return
      }

      if (data.password !== data.confirmPassword) {
        setFieldError('confirmPassword', { message: 'Las contraseñas no coinciden.' })
        return
      }

      await register({
        name,
        email: data.email,
        phone: fullPhone,
        baseCurrency: data.baseCurrency,
        password: data.password || '',
        ...getCurrentUtms(),
      }, toolName)
      setBaseCurrency(data.baseCurrency)
      pushEvent('user_registered', { currency: data.baseCurrency, has_phone: true })
      trackMetaEvent('Lead', { content_name: contentName })
      setStep('success')
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      setIsValidatingEmail(false)
      const message =
        (err as any)?.response?.errors?.[0]?.message ||
        (err as Error)?.message ||
        'Hubo un problema al conectar con el servidor. Inténtalo de nuevo.'
      const normalizedMessage = message.toLowerCase()
      if (normalizedMessage.includes('correo') || normalizedMessage.includes('email')) {
        setFieldError('email', { message })
      }
      if (normalizedMessage.includes('celular') || normalizedMessage.includes('teléfono') || normalizedMessage.includes('telefono')) {
        setFieldError('phone', { message })
      }
      setError(message)
    }
  }

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-mia-black/95 backdrop-blur-md" />

      <Link
        href={backHref}
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-mia-border bg-mia-card/90 px-4 py-2 text-sm font-bold text-neutral shadow-lg backdrop-blur transition-colors hover:border-mf-coral/60 hover:text-mia-cream sm:left-6 sm:top-6"
        aria-label={backLabel}
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {step !== 'success' ? (
          <div
            key={step}
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
                  {step === 'email'
                    ? 'Guarda tu resultado y entra a la calculadora'
                    : step === 'login'
                      ? 'Ingresa tu contraseña'
                      : step === 'setupPassword'
                        ? 'Crea tu contraseña'
                        : 'Completa tu perfil'}
                </h2>
                {step !== 'email' && (
                  <p className="text-white/80 text-sm mt-2">
                    {step === 'login'
                      ? 'Validaremos tu acceso y suscripción a la calculadora'
                      : step === 'setupPassword'
                        ? 'Valida tu celular para proteger tu cuenta existente'
                        : 'Solo unos datos más para activar tu calculadora'}
                  </p>
                )}
              </div>

              {/* Benefits strip (only on first step) */}
              {step === 'email' && (
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
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="bg-mia-card p-8 space-y-4">
                {step === 'email' ? (
                  /* STEP 1: PROGRESSIVE ACCESS */
                  <>
                    <div className="rounded-2xl border border-mf-coral/20 bg-mf-coral/10 p-4">
                      <p className="text-sm font-semibold leading-relaxed text-mia-cream">
                        Accede rápido con tu correo y WhatsApp. Luego podrás descargar tu PDF y crear contraseña si quieres guardar historial.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-mia-cream/70 uppercase tracking-wider mb-1.5">
                        Correo electrónico
                      </label>
                      <input
                        {...formRegister('email')}
                        type="email"
                        placeholder="tu@email.com"
                        autoFocus
                        className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream placeholder:text-neutral/50 focus:outline-none focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30 transition-all text-sm"
                      />
                      {errors.email && <p className="text-loss text-xs mt-1">{errors.email.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-mia-cream/70 uppercase tracking-wider mb-1.5">
                        WhatsApp
                      </label>
                      <div className="grid grid-cols-[132px_1fr] gap-2 sm:grid-cols-[160px_1fr]">
                        <select
                          value={selectedCountryCode}
                          onChange={event => setSelectedCountryCode(event.target.value)}
                          className="w-full rounded-xl border border-mia-border bg-mia-surface px-3 py-3 text-sm text-mia-cream outline-none transition-all focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30"
                          aria-label="Indicativo del país"
                        >
                          {COUNTRY_DIAL_CODES.map(country => (
                            <option key={`${country.code}-${country.dialCode}`} value={country.code}>
                              {country.flag} {country.dialCode}
                            </option>
                          ))}
                        </select>
                        <input
                          {...formRegister('phone')}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder={selectedCountry.example}
                          onInput={event => {
                            const input = event.currentTarget
                            input.value = input.value.replace(/[^\d\s]/g, '')
                          }}
                          className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream placeholder:text-neutral/50 focus:outline-none focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30 transition-all text-sm"
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] text-neutral/60">
                        Te enviaremos tu resultado y acceso por WhatsApp. Sin spam.
                      </p>
                      {errors.phone && <p className="text-loss text-xs mt-1">{errors.phone.message}</p>}
                    </div>

                    {error && (
                      <div className="p-3 bg-loss/10 border border-loss/20 rounded-xl">
                        <p className="text-loss text-xs">{error}</p>
                      </div>
                    )}
                  </>
                ) : step === 'login' ? (
                  /* STEP 2A: EXISTING USER PASSWORD */
                  <>
                    <div className="flex items-center gap-3 p-3 bg-mia-surface/50 rounded-xl border border-mia-border/50 mb-2">
                      <div className="w-8 h-8 rounded-full bg-mf-coral/10 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-gain" />
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral uppercase font-bold tracking-tighter">Cuenta encontrada</p>
                        <p className="text-xs text-mia-cream font-medium">{watch('email')}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-mia-cream/70 uppercase tracking-wider mb-1.5">
                        Contraseña
                      </label>
                      <input
                        {...formRegister('password')}
                        type="password"
                        autoComplete="current-password"
                        placeholder="Tu contraseña"
                        autoFocus
                        className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream placeholder:text-neutral/50 focus:outline-none focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30 transition-all text-sm"
                      />
                      {errors.password && <p className="text-loss text-xs mt-1">{errors.password.message}</p>}
                    </div>

                    {error && (
                      <div className="p-3 bg-loss/10 border border-loss/20 rounded-xl">
                        <p className="text-loss text-xs">{error}</p>
                      </div>
                    )}

                    {passwordResetSent && (
                      <div className="p-3 bg-gain/10 border border-gain/20 rounded-xl">
                        <p className="text-gain text-xs">
                          Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null)
                          setPasswordResetSent(false)
                          setStep('email')
                        }}
                        className="text-xs font-semibold text-mf-coral hover:text-mf-orange"
                      >
                        Usar otro correo
                      </button>
                      <button
                        type="button"
                        onClick={requestPasswordReset}
                        disabled={isRequestingPasswordReset}
                        className="text-xs font-semibold text-neutral hover:text-mia-cream disabled:opacity-50"
                      >
                        {isRequestingPasswordReset ? 'Enviando enlace...' : 'Olvidé mi contraseña'}
                      </button>
                    </div>
                  </>
                ) : step === 'setupPassword' ? (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-mia-surface/50 rounded-xl border border-mia-border/50 mb-2">
                      <div className="w-8 h-8 rounded-full bg-mf-coral/10 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-gain" />
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral uppercase font-bold tracking-tighter">Cuenta existente</p>
                        <p className="text-xs text-mia-cream font-medium">{watch('email')}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-mia-cream/70 uppercase tracking-wider mb-1.5">
                        Celular registrado
                      </label>
                      <div className="grid grid-cols-[132px_1fr] gap-2 sm:grid-cols-[160px_1fr]">
                        <select
                          value={selectedCountryCode}
                          onChange={event => setSelectedCountryCode(event.target.value)}
                          className="w-full rounded-xl border border-mia-border bg-mia-surface px-3 py-3 text-sm text-mia-cream outline-none transition-all focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30"
                          aria-label="Indicativo del país"
                        >
                          {COUNTRY_DIAL_CODES.map(country => (
                            <option key={`${country.code}-${country.dialCode}`} value={country.code}>
                              {country.flag} {country.dialCode}
                            </option>
                          ))}
                        </select>
                        <input
                          {...formRegister('phone')}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder={selectedCountry.example}
                          onInput={event => {
                            const input = event.currentTarget
                            input.value = input.value.replace(/[^\d\s]/g, '')
                          }}
                          className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream placeholder:text-neutral/50 focus:outline-none focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30 transition-all text-sm"
                        />
                      </div>
                      {errors.phone && <p className="text-loss text-xs mt-1">{errors.phone.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-mia-cream/70 uppercase tracking-wider mb-1.5">
                        Nueva contraseña
                      </label>
                      <input
                        {...formRegister('password')}
                        type="password"
                        autoComplete="new-password"
                        placeholder="Mínimo 8 caracteres"
                        className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream placeholder:text-neutral/50 focus:outline-none focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30 transition-all text-sm"
                      />
                      {errors.password && <p className="text-loss text-xs mt-1">{errors.password.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-mia-cream/70 uppercase tracking-wider mb-1.5">
                        Confirmar contraseña
                      </label>
                      <input
                        {...formRegister('confirmPassword')}
                        type="password"
                        autoComplete="new-password"
                        placeholder="Repite tu contraseña"
                        className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream placeholder:text-neutral/50 focus:outline-none focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30 transition-all text-sm"
                      />
                      {errors.confirmPassword && <p className="text-loss text-xs mt-1">{errors.confirmPassword.message}</p>}
                    </div>

                    {error && (
                      <div className="p-3 bg-loss/10 border border-loss/20 rounded-xl">
                        <p className="text-loss text-xs">{error}</p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setError(null)
                        setStep('email')
                      }}
                      className="text-xs font-semibold text-mf-coral hover:text-mf-orange"
                    >
                      Usar otro correo
                    </button>
                  </>
                ) : (
                  /* STEP 2: FULL FORM */
                  <>
                    <div className="flex items-center gap-3 p-3 bg-mia-surface/50 rounded-xl border border-mia-border/50 mb-2">
                      <div className="w-8 h-8 rounded-full bg-mf-coral/10 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-gain" />
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral uppercase font-bold tracking-tighter">Email confirmado</p>
                        <p className="text-xs text-mia-cream font-medium">{watch('email')}</p>
                      </div>
                    </div>

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

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-mia-cream/70 uppercase tracking-wider mb-1.5">
                        Celular <span className="text-neutral/50 normal-case text-xs font-normal">(selecciona país y escribe tu número)</span>
                      </label>
                      <div className="grid grid-cols-[132px_1fr] gap-2 sm:grid-cols-[160px_1fr]">
                        <select
                          value={selectedCountryCode}
                          onChange={event => setSelectedCountryCode(event.target.value)}
                          className="w-full rounded-xl border border-mia-border bg-mia-surface px-3 py-3 text-sm text-mia-cream outline-none transition-all focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30"
                          aria-label="Indicativo del país"
                        >
                          {COUNTRY_DIAL_CODES.map(country => (
                            <option key={`${country.code}-${country.dialCode}`} value={country.code}>
                              {country.flag} {country.dialCode}
                            </option>
                          ))}
                        </select>
                        <input
                          {...formRegister('phone')}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder={selectedCountry.example}
                          onInput={event => {
                            const input = event.currentTarget
                            input.value = input.value.replace(/[^\d\s]/g, '')
                          }}
                          className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream placeholder:text-neutral/50 focus:outline-none focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30 transition-all text-sm"
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] text-neutral/60">
                        Guardaremos tu celular como <span className="text-neutral">{selectedCountry.dialCode} {watch('phone') || selectedCountry.example}</span>.
                      </p>
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

                    <div>
                      <label className="block text-xs font-semibold text-mia-cream/70 uppercase tracking-wider mb-1.5">
                        Crea una contraseña
                      </label>
                      <input
                        {...formRegister('password')}
                        type="password"
                        autoComplete="new-password"
                        placeholder="Mínimo 8 caracteres"
                        className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream placeholder:text-neutral/50 focus:outline-none focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30 transition-all text-sm"
                      />
                      {errors.password && <p className="text-loss text-xs mt-1">{errors.password.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-mia-cream/70 uppercase tracking-wider mb-1.5">
                        Confirmar contraseña
                      </label>
                      <input
                        {...formRegister('confirmPassword')}
                        type="password"
                        autoComplete="new-password"
                        placeholder="Repite tu contraseña"
                        className="w-full px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream placeholder:text-neutral/50 focus:outline-none focus:border-mf-coral focus:ring-1 focus:ring-mf-coral/30 transition-all text-sm"
                      />
                      {errors.confirmPassword && <p className="text-loss text-xs mt-1">{errors.confirmPassword.message}</p>}
                    </div>

                    {error && (
                      <div className="p-3 bg-loss/10 border border-loss/20 rounded-xl">
                        <p className="text-loss text-xs">{error}</p>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || isValidatingEmail}
                  className="w-full bg-gradient-mf text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-60 text-base flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmitting || isValidatingEmail
                    ? 'Validando...'
                    : step === 'email'
                      ? 'Entrar ahora'
                      : step === 'login'
                        ? 'Iniciar sesión'
                        : step === 'setupPassword'
                          ? 'Crear contraseña'
                          : 'Crear cuenta'}
                  <ChevronRight className="w-5 h-5" />
                </button>

                {step !== 'email' && (
                  <p className="text-center text-xs text-neutral/40 leading-relaxed">
                    Al continuar aceptas recibir contenido educativo de Moneyflow.
                  </p>
                )}
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
                {isNewUser ? '¡Listo! Bienvenido a MIA' : '¡Bienvenido de nuevo!'}
              </h2>
              <p className="text-neutral">
                {isNewUser ? 'Cargando tu calculadora...' : 'Abriendo tu cuenta...'}
              </p>
            </div>
          </div>
        )}
    </div>
  )
}
