'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { Settings, TrendingUp, ArrowRightLeft, Scissors, BarChart2, ChevronRight, Info, Lock, Calendar, MessageCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import { useUserStore } from '@/stores/user.store'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { pushEvent } from '@/lib/analytics'
import { trackMetaEvent } from '@/lib/analytics'
import { useRentabilidadAutoSync } from '@/hooks/useRentabilidadAutoSync'
import UserRegistrationModal from '@/components/auth/UserRegistrationModal'
import OnboardingConfig from './OnboardingConfig'
import ConfigPanel from './ConfigPanel'
import InvestmentsPanel from './InvestmentsPanel'
import TransactionsPanel from './TransactionsPanel'
import SnapshotsPanel from './SnapshotsPanel'
import ResultsPanel from './ResultsPanel'

const TABS = [
  { id: 'config', label: 'A · Configuración', shortLabel: 'Config', icon: Settings, hint: 'Define pilares, entidades y moneda' },
  { id: 'inversiones', label: 'B · Inversiones', shortLabel: 'Inversiones', icon: TrendingUp, hint: 'Crea tus buckets de inversión' },
  { id: 'transacciones', label: 'C · Entradas y Salidas', shortLabel: 'Flujos', icon: ArrowRightLeft, hint: 'Registra aportes con fecha y TRM' },
  { id: 'cortes', label: 'D · Cortes', shortLabel: 'Cortes', icon: Scissors, hint: 'Valor actual de cada inversión' },
  { id: 'resultados', label: 'E · Resultados', shortLabel: 'TIR', icon: BarChart2, hint: 'TIR en COP, USD y USD→COP' },
] as const

type TabId = typeof TABS[number]['id']
type AccessValidationStatus = 'idle' | 'validating' | 'validated' | 'error'

function isRentabilidadAccess(access: { toolName?: string; simulatorSlug?: string; simulatorName?: string }) {
  return [access.toolName, access.simulatorSlug, access.simulatorName]
    .filter(Boolean)
    .some(value => value!.toLowerCase().includes('rentabilidad'))
}

export default function CalculadoraLayout() {
  const { isRegistered, profile, updateProfile, refreshProfile } = useUserStore()
  const investments = useRentabilidadStore(s => s.investments)
  const syncStatus = useRentabilidadStore(s => s.syncStatus)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('config')
  const [tracked, setTracked] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [accessValidationStatus, setAccessValidationStatus] = useState<AccessValidationStatus>('idle')
  
  // Use a ref or state for access data to keep it stable during hydration
  const [accessInfo, setAccessInfo] = useState<{
    hasAccess: boolean;
    daysRemaining: number | null;
    requiresRegistration: boolean;
  }>({
    hasAccess: true,
    daysRemaining: null,
    requiresRegistration: false
  })

  useEffect(() => {
    setMounted(true)
    
    // Calculate access info only on client after mount
    const requiresRegistration = !isRegistered || !profile
    const rentabilidadAccess = profile?.accesses?.find(isRentabilidadAccess)
    const isUserAllowed = profile?.status ? !['blocked', 'expired'].includes(profile.status) : true
    const isAccessEnabled = rentabilidadAccess?.status === 'active'
    
    const isExpired = rentabilidadAccess?.expiresAt 
      ? new Date(rentabilidadAccess.expiresAt) < new Date() 
      : false
      
    const hasAccess = Boolean(isUserAllowed && rentabilidadAccess && isAccessEnabled && !isExpired)
    
    const daysRemaining = rentabilidadAccess?.expiresAt 
      ? Math.max(0, Math.ceil((new Date(rentabilidadAccess.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null

    setAccessInfo({
      hasAccess,
      daysRemaining,
      requiresRegistration
    })
  }, [isRegistered, profile, mounted])

  const canUseCalculator = mounted && !accessInfo.requiresRegistration && accessValidationStatus === 'validated' && accessInfo.hasAccess

  useEffect(() => {
    if (!mounted) return

    if (accessInfo.requiresRegistration || !profile?.email) {
      setAccessValidationStatus('idle')
      return
    }

    let isCurrent = true
    const validateAccess = (showLoading: boolean) => {
      if (showLoading) {
        setAccessValidationStatus('validating')
      }

      refreshProfile()
        .then((refreshedProfile) => {
          if (!isCurrent) return
          setAccessValidationStatus(refreshedProfile ? 'validated' : 'error')
        })
        .catch(() => {
          if (!isCurrent) return
          setAccessValidationStatus('error')
        })
    }

    validateAccess(true)

    const intervalId = window.setInterval(() => validateAccess(false), 60_000)
    const handleFocus = () => validateAccess(false)
    window.addEventListener('focus', handleFocus)

    return () => {
      isCurrent = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
    }
  }, [mounted, accessInfo.requiresRegistration, profile?.email, refreshProfile])

  // Show onboarding config after first registration or whenever the profile has not completed it.
  // Do not depend on local investments: they can be stale from another session/user in the browser.
  useEffect(() => {
    if (canUseCalculator && !profile?.hasCompletedOnboarding) {
      setShowOnboarding(true)
    }
  }, [canUseCalculator, profile?.hasCompletedOnboarding])

  useEffect(() => {
    if (!tracked && isRegistered && profile?.id) {
      pushEvent('calculator_started', { user_registered: isRegistered })
      trackMetaEvent('ViewContent', { content_name: 'calculadora_rentabilidad' })
      setTracked(true)
    }
  }, [tracked, isRegistered, profile?.id])

  useRentabilidadAutoSync({
    enabled: mounted && isRegistered && Boolean(profile?.id) && canUseCalculator,
    userId: profile?.id,
    debounceMs: 1200,
  })

  const handleOnboardingComplete = () => {
    updateProfile({ hasCompletedOnboarding: true })
    setShowOnboarding(false)
  }

  return (
    <div className="min-h-screen bg-mia-black">
      {/* Registration Modal */}
      {accessInfo.requiresRegistration && (
        <UserRegistrationModal onClose={() => undefined} />
      )}

      {/* Subscription validation loading */}
      {mounted && !accessInfo.requiresRegistration && accessValidationStatus === 'validating' && (
        <AccessStateCard
          icon={<RefreshCw className="w-8 h-8 animate-spin text-mf-coral" />}
          title="Validando suscripción"
          description="Estamos confirmando tu acceso activo con Moneyflow antes de abrir la calculadora."
        />
      )}

      {/* Subscription validation error */}
      {mounted && !accessInfo.requiresRegistration && accessValidationStatus === 'error' && (
        <AccessStateCard
          icon={<Info className="w-8 h-8 text-loss" />}
          title="No pudimos validar tu acceso"
          description="Por seguridad no abrimos la calculadora hasta confirmar la suscripción. Reintenta la validación o contacta soporte."
          action={
            <button
              onClick={() => {
                setAccessValidationStatus('validating')
                refreshProfile()
                  .then((refreshedProfile) => setAccessValidationStatus(refreshedProfile ? 'validated' : 'error'))
                  .catch(() => setAccessValidationStatus('error'))
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-mf py-4 font-bold text-white shadow-lg shadow-mf-coral/20 transition-opacity hover:opacity-90"
            >
              <RefreshCw className="h-5 w-5" />
              Validar de nuevo
            </button>
          }
        />
      )}

      {/* Access Expired / No Access UI */}
      {mounted && !accessInfo.requiresRegistration && accessValidationStatus === 'validated' && !accessInfo.hasAccess && !showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-mia-black/80 backdrop-blur-sm p-4">
          <div className="glass max-w-md w-full rounded-3xl border border-mia-border p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-loss/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-loss" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-mia-cream mb-3">Acceso no disponible</h2>
            <p className="text-neutral mb-8 leading-relaxed">
              Tu acceso a la Calculadora de Rentabilidad está restringido, vencido o fue desactivado.
              Contacta a soporte para revisarlo y volver a habilitarlo.
            </p>
            <a 
              href="https://wa.me/573205389740" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 bg-gradient-mf text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-mf-coral/20"
            >
              Contactar Soporte
              <ArrowRightLeft className="w-5 h-5 rotate-90" />
            </a>
            <button 
              onClick={() => useUserStore.getState().clearProfile()}
              className="mt-4 text-xs text-neutral hover:text-mia-cream transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Onboarding config screen */}
      {canUseCalculator && showOnboarding && (
        <OnboardingConfig onComplete={handleOnboardingComplete} />
      )}

      {/* Main Calculator UI */}
      {canUseCalculator && !showOnboarding && (
        <>
          {/* Page Header */}
          <div className="border-b border-mia-border bg-mia-black/95 backdrop-blur-md sticky top-16 z-40">
            <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8">
              <Link
                href="/calculadoras"
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-mia-border bg-mia-surface/60 px-3 py-1.5 text-xs font-semibold text-neutral transition-colors hover:border-mf-coral/60 hover:text-mia-cream sm:text-sm"
                aria-label="Volver al listado de calculadoras"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h1 className="max-w-full text-balance font-heading text-2xl font-bold leading-tight text-mia-cream sm:text-2xl md:text-3xl">
                      Calculadora de Rentabilidad
                    </h1>
                    {profile?.name && (
                      <span className="text-xs font-medium text-neutral sm:text-sm">· {profile.name.split(' ')[0]}</span>
                    )}
                  </div>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-neutral sm:text-sm">
                    TIR multi-moneda para medir el desempeño real de tus inversiones.
                    <span className="hidden sm:inline"> Replica el flujo de &ldquo;Calculadora Inversiones V1&rdquo; en 3 dimensiones.</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {/* Days remaining badge */}
                  {accessInfo.hasAccess && accessInfo.daysRemaining !== null && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-mia-border bg-mia-surface/50 px-3 py-1.5">
                      <Calendar className={`h-3.5 w-3.5 ${accessInfo.daysRemaining <= 3 ? 'text-loss' : 'text-mf-coral'}`} />
                      <span className="whitespace-nowrap text-xs font-medium text-mia-cream">
                        {accessInfo.daysRemaining} {accessInfo.daysRemaining === 1 ? 'día' : 'días'} restantes
                      </span>
                    </div>
                  )}

                  <div className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-transparent px-1 text-xs">
                    {syncStatus === 'saving' && (
                      <span className="inline-flex items-center gap-1 text-mf-coral animate-pulse">
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Guardando...
                      </span>
                    )}
                    {syncStatus === 'saved' && (
                      <span className="inline-flex items-center gap-1 text-gain">
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Guardado automático
                      </span>
                    )}
                    {syncStatus === 'error' && (
                      <span className="inline-flex items-center gap-1 text-loss">
                        <Info className="h-3.5 w-3.5" />
                        Error guardando
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="hidden md:flex items-center gap-1.5 text-xs text-neutral">
                  {TABS.map((tab, i) => (
                    <div key={tab.id} className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${
                          activeTab === tab.id
                            ? 'bg-gradient-mf text-white'
                            : 'bg-mia-surface text-neutral hover:text-mia-cream'
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </button>
                      {i < TABS.length - 1 && <ChevronRight className="w-3 h-3 text-mia-border" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="-mx-3 overflow-x-auto scrollbar-hidden border-t border-mia-border/50 px-3 pt-2 sm:mx-0 sm:border-t-0 sm:px-0 sm:pt-0">
                <div className="flex min-w-max gap-1">
                  {TABS.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        id={`tab-${tab.id}`}
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.hint}
                        className={`flex items-center gap-1.5 rounded-t-xl border-b-2 px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 sm:gap-2 sm:px-4 sm:text-sm ${
                          isActive
                            ? 'bg-mia-black border-mf-coral text-mia-cream'
                            : 'border-transparent text-neutral hover:text-mia-cream hover:bg-mia-surface/50'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.shortLabel}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Panel content */}
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 lg:pb-8">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              {activeTab === 'config' && <ConfigPanel />}
              {activeTab === 'inversiones' && <InvestmentsPanel onGoToTransactions={() => setActiveTab('transacciones')} />}
              {activeTab === 'transacciones' && <TransactionsPanel onGoToSnapshots={() => setActiveTab('cortes')} />}
              {activeTab === 'cortes' && <SnapshotsPanel onGoToResults={() => setActiveTab('resultados')} />}
              {activeTab === 'resultados' && <ResultsPanel />}
            </div>
          </div>

          <MoneyStrategistFloatingCTA />
        </>
      )}
    </div>
  )
}


function AccessStateCard({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mia-black/80 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-md animate-in zoom-in rounded-3xl border border-mia-border p-8 text-center duration-300 fade-in">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-mf-coral/10">
          {icon}
        </div>
        <h2 className="mb-3 font-heading text-2xl font-bold text-mia-cream">{title}</h2>
        <p className="mb-8 leading-relaxed text-neutral">{description}</p>
        {action}
      </div>
    </div>
  )
}


function MoneyStrategistFloatingCTA() {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 lg:left-auto lg:right-6 lg:max-w-sm">
      <div className="glass border border-mf-coral/30 p-3 shadow-2xl shadow-mf-coral/10 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mf-coral/10 text-mf-coral sm:flex">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-mia-cream">Asesórate GRATIS con un Money Strategist</p>
            <p className="hidden text-xs leading-snug text-neutral sm:block">
              Revisa tu plan, interpreta tus resultados y resuelve dudas con guía personalizada.
            </p>
          </div>
          <a
            href="https://wa.me/573205389740?text=Hola%2C%20quiero%20asesorarme%20gratis%20con%20un%20Money%20Strategist%20para%20revisar%20mi%20plan%20de%20inversi%C3%B3n."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-mf px-4 py-3 text-xs font-bold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Hablar ahora</span>
          </a>
        </div>
      </div>
    </div>
  )
}
