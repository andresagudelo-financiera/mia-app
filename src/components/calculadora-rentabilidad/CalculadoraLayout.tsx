'use client'

import { useState, useEffect } from 'react'
import { Settings, TrendingUp, ArrowRightLeft, Scissors, BarChart2, ChevronRight, Info } from 'lucide-react'
import { useUserStore } from '@/stores/user.store'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { pushEvent } from '@/lib/analytics'
import { trackMetaEvent } from '@/lib/analytics'
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

export default function CalculadoraLayout() {
  const { isRegistered, profile, updateProfile } = useUserStore()
  const investments = useRentabilidadStore(s => s.investments)
  const [showModal, setShowModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('config')
  const [tracked, setTracked] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show modal if not registered
  useEffect(() => {
    if (!isRegistered) {
      setShowModal(true)
    }
  }, [isRegistered])

  // Show onboarding config after first registration (before investments exist)
  useEffect(() => {
    if (isRegistered && !profile?.hasCompletedOnboarding && investments.length === 0) {
      setShowOnboarding(true)
    }
  }, [isRegistered, profile?.hasCompletedOnboarding, investments.length])

  useEffect(() => {
    if (!tracked && isRegistered) {
      pushEvent('calculator_started', { user_registered: isRegistered })
      trackMetaEvent('ViewContent', { content_name: 'calculadora_rentabilidad' })
      setTracked(true)
    }
  }, [tracked, isRegistered])

  const handleModalClose = () => {
    setShowModal(false)
  }

  const handleOnboardingComplete = () => {
    updateProfile({ hasCompletedOnboarding: true })
    setShowOnboarding(false)
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-mia-black">
      {/* Registration Modal */}
      {showModal && (
        <UserRegistrationModal onClose={handleModalClose} />
      )}

      {/* Onboarding config screen */}
      {showOnboarding && !showModal && (
        <OnboardingConfig onComplete={handleOnboardingComplete} />
      )}

      {/* Main Calculator UI */}
      {!showModal && !showOnboarding && (
        <>
          {/* Page Header */}
          <div className="border-b border-mia-border bg-mia-card/40 sticky top-16 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-heading font-bold text-mia-cream">
                    Calculadora de Rentabilidad
                    {profile?.name && (
                      <span className="ml-3 text-sm font-normal text-neutral">· {profile.name.split(' ')[0]}</span>
                    )}
                  </h1>
                  <p className="text-neutral text-xs mt-0.5">
                    Replica el flujo de &ldquo;Calculadora Inversiones V1&rdquo; · TIR en 3 dimensiones
                  </p>
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
              <div className="overflow-x-auto scrollbar-hidden -mb-px">
                <div className="flex gap-1 min-w-max">
                  {TABS.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        id={`tab-${tab.id}`}
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.hint}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border-b-2 ${
                          isActive
                            ? 'bg-mia-black border-mf-coral text-mia-cream'
                            : 'border-transparent text-neutral hover:text-mia-cream hover:bg-mia-surface/50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              {activeTab === 'config' && <ConfigPanel />}
              {activeTab === 'inversiones' && <InvestmentsPanel onGoToTransactions={() => setActiveTab('transacciones')} />}
              {activeTab === 'transacciones' && <TransactionsPanel onGoToSnapshots={() => setActiveTab('cortes')} />}
              {activeTab === 'cortes' && <SnapshotsPanel onGoToResults={() => setActiveTab('resultados')} />}
              {activeTab === 'resultados' && <ResultsPanel />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
