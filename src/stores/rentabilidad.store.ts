'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Config, Investment, Transaction, Snapshot, RentabilidadStoreData } from '@/types/rentabilidad'
import { DEFAULT_PILLARS, DEFAULT_ENTITIES, SUPPORTED_CURRENCIES } from '@/lib/constants'
import { rentabilidadApi } from '@/services/api/rentabilidad.api'

function buildDefaultConfig(baseCurrency = 'COP'): Config {
  return {
    baseCurrency,
    pillars: [...DEFAULT_PILLARS],
    entities: [...DEFAULT_ENTITIES],
    currencies: [...SUPPORTED_CURRENCIES],
    dashboardSettings: {
      pillarTargets: {},
      goldenNumberTarget: undefined,
    },
  }
}

const DEFAULT_CONFIG: Config = buildDefaultConfig()

interface RentabilidadStore extends RentabilidadStoreData {
  activeUserId: string | null
  isHydratedFromBackend: boolean
  hydrateStatus: 'idle' | 'loading' | 'ready' | 'error'
  hydrateError: string | null
  // Config actions
  setBaseCurrency: (currency: string) => void
  addPillar: (name: string) => void
  updatePillar: (oldName: string, newName: string) => void
  removePillar: (name: string) => void
  addEntity: (name: string) => void
  updateEntity: (oldName: string, newName: string) => void
  removeEntity: (name: string) => void
  setPillarTarget: (pillar: string, target: number | null) => void
  setGoldenNumberTarget: (target: number | null) => void

  // Investment actions
  addInvestment: (inv: Omit<Investment, 'id' | 'createdAt'>) => boolean // returns false if name duplicate
  updateInvestment: (id: string, updates: Partial<Omit<Investment, 'id'>>) => void
  removeInvestment: (id: string) => void
  removeInvestments: (ids: string[]) => void

  // Transaction actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => void
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => void
  removeTransaction: (id: string) => void
  removeTransactions: (ids: string[]) => void

  // Snapshot actions
  addSnapshot: (snap: Omit<Snapshot, 'id'>) => void
  updateSnapshot: (id: string, updates: Partial<Omit<Snapshot, 'id'>>) => void
  removeSnapshot: (id: string) => void

  // Data actions
  exportData: () => RentabilidadStoreData
  importData: (data: RentabilidadStoreData) => void
  clearData: () => void
  syncStatus: 'idle' | 'saving' | 'saved' | 'error'
  lastSyncedAt: string | null
  syncError: string | null
  prepareForUser: (userId: string, baseCurrency?: string) => void
  hydrateFromBackend: (userId: string, baseCurrency?: string) => Promise<boolean>
  syncWithBackend: (userId: string) => Promise<boolean>
}

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

function nowIso(): string {
  return new Date().toISOString()
}

export const useRentabilidadStore = create<RentabilidadStore>()(
  persist(
    (set, get) => ({
      activeUserId: null,
      isHydratedFromBackend: false,
      hydrateStatus: 'idle',
      hydrateError: null,
      config: DEFAULT_CONFIG,
      investments: [],
      transactions: [],
      snapshots: [],
      lastUpdated: nowIso(),
      syncStatus: 'idle',
      lastSyncedAt: null,
      syncError: null,

      prepareForUser: (userId, baseCurrency = 'COP') =>
        set((s) => {
          if (!userId || s.activeUserId === userId) return {}
          return {
            activeUserId: userId,
            isHydratedFromBackend: false,
            hydrateStatus: 'idle',
            hydrateError: null,
            config: buildDefaultConfig(baseCurrency),
            investments: [],
            transactions: [],
            snapshots: [],
            lastUpdated: nowIso(),
            syncStatus: 'idle',
            lastSyncedAt: null,
            syncError: null,
          }
        }),

      hydrateFromBackend: async (userId, baseCurrency = 'COP') => {
        if (!userId) return false
        const state = get()
        if (state.activeUserId === userId && state.isHydratedFromBackend) return true

        set((s) => ({
          ...(s.activeUserId !== userId
            ? {
                activeUserId: userId,
                config: buildDefaultConfig(baseCurrency),
                investments: [],
                transactions: [],
                snapshots: [],
              }
            : {}),
          hydrateStatus: 'loading',
          hydrateError: null,
          isHydratedFromBackend: false,
        }))

        try {
          const remoteData = await rentabilidadApi.load(userId)
          const remoteConfig = remoteData?.config || {}
          const nextConfig = {
            ...buildDefaultConfig(remoteConfig.baseCurrency || baseCurrency),
            ...remoteConfig,
            pillars: Array.isArray(remoteConfig.pillars) && remoteConfig.pillars.length > 0 ? remoteConfig.pillars : DEFAULT_PILLARS,
            entities: Array.isArray(remoteConfig.entities) && remoteConfig.entities.length > 0 ? remoteConfig.entities : DEFAULT_ENTITIES,
            currencies: Array.isArray(remoteConfig.currencies) && remoteConfig.currencies.length > 0 ? remoteConfig.currencies : SUPPORTED_CURRENCIES,
            dashboardSettings: {
              ...buildDefaultConfig(remoteConfig.baseCurrency || baseCurrency).dashboardSettings,
              ...(remoteConfig.dashboardSettings || {}),
              pillarTargets: {
                ...(remoteConfig.dashboardSettings?.pillarTargets || {}),
              },
            },
          }

          set({
            activeUserId: userId,
            isHydratedFromBackend: true,
            hydrateStatus: 'ready',
            hydrateError: null,
            config: nextConfig,
            investments: Array.isArray(remoteData?.investments) ? remoteData.investments : [],
            transactions: Array.isArray(remoteData?.transactions) ? remoteData.transactions : [],
            snapshots: Array.isArray(remoteData?.snapshots) ? remoteData.snapshots : [],
            lastUpdated: remoteData?.lastUpdated || nowIso(),
            syncStatus: 'idle',
            lastSyncedAt: nowIso(),
            syncError: null,
          })
          return true
        } catch (error) {
          const message = error instanceof Error ? error.message : 'No se pudo cargar tu configuración.'
          set({ hydrateStatus: 'error', hydrateError: message, isHydratedFromBackend: false })
          return false
        }
      },

      // === CONFIG ===
      setBaseCurrency: (currency) =>
        set((s) => ({ config: { ...s.config, baseCurrency: currency }, lastUpdated: nowIso() })),

      addPillar: (name) =>
        set((s) => ({
          config: { ...s.config, pillars: [...(s.config.pillars || []), name] },
          lastUpdated: nowIso(),
        })),

      updatePillar: (oldName, newName) =>
        set((s) => {
          const targets = { ...(s.config.dashboardSettings?.pillarTargets || {}) }
          if (Object.prototype.hasOwnProperty.call(targets, oldName)) {
            targets[newName] = targets[oldName]
            delete targets[oldName]
          }

          return {
            config: {
              ...s.config,
              pillars: (s.config.pillars || []).map(p => p === oldName ? newName : p),
              dashboardSettings: {
                ...(s.config.dashboardSettings || {}),
                pillarTargets: targets,
              },
            },
            investments: s.investments.map(inv => inv.pilar === oldName ? { ...inv, pilar: newName } : inv),
            lastUpdated: nowIso(),
          }
        }),

      removePillar: (name) =>
        set((s) => {
          const targets = { ...(s.config.dashboardSettings?.pillarTargets || {}) }
          delete targets[name]

          return {
            config: {
              ...s.config,
              pillars: (s.config.pillars || []).filter(p => p !== name),
              dashboardSettings: {
                ...(s.config.dashboardSettings || {}),
                pillarTargets: targets,
              },
            },
            lastUpdated: nowIso(),
          }
        }),

      addEntity: (name) =>
        set((s) => ({
          config: { ...s.config, entities: [...(s.config.entities || []), name] },
          lastUpdated: nowIso(),
        })),

      updateEntity: (oldName, newName) =>
        set((s) => ({
          config: { ...s.config, entities: (s.config.entities || []).map(e => e === oldName ? newName : e) },
          investments: s.investments.map(inv => inv.entity === oldName ? { ...inv, entity: newName } : inv),
          transactions: s.transactions.map(tx => tx.entity === oldName ? { ...tx, entity: newName } : tx),
          lastUpdated: nowIso(),
        })),

      removeEntity: (name) =>
        set((s) => ({
          config: { ...s.config, entities: (s.config.entities || []).filter(e => e !== name) },
          lastUpdated: nowIso(),
        })),

      setPillarTarget: (pillar, target) =>
        set((s) => {
          const targets = { ...(s.config.dashboardSettings?.pillarTargets || {}) }
          const numericTarget = Number(target ?? 0)
          if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
            delete targets[pillar]
          } else {
            targets[pillar] = numericTarget
          }

          return {
            config: {
              ...s.config,
              dashboardSettings: {
                ...(s.config.dashboardSettings || {}),
                pillarTargets: targets,
              },
            },
            lastUpdated: nowIso(),
          }
        }),

      setGoldenNumberTarget: (target) =>
        set((s) => {
          const numericTarget = Number(target ?? 0)
          const nextSettings = { ...(s.config.dashboardSettings || {}) }
          if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
            delete nextSettings.goldenNumberTarget
          } else {
            nextSettings.goldenNumberTarget = numericTarget
          }

          return {
            config: {
              ...s.config,
              dashboardSettings: nextSettings,
            },
            lastUpdated: nowIso(),
          }
        }),

      // === INVESTMENTS ===
      addInvestment: (inv) => {
        const state = get()
        if (state.investments.some(i => i.name === inv.name)) return false
        set({
          investments: [...state.investments, { ...inv, id: generateId(), createdAt: nowIso() }],
          lastUpdated: nowIso(),
        })
        return true
      },

      updateInvestment: (id, updates) =>
        set((s) => ({
          investments: s.investments.map(inv => inv.id === id ? { ...inv, ...updates } : inv),
          lastUpdated: nowIso(),
        })),

      removeInvestment: (id) =>
        set((s) => {
          const inv = s.investments.find(i => i.id === id)
          if (!inv) return s

          return {
            investments: s.investments.filter(i => i.id !== id),
            transactions: s.transactions.filter(t => t.investmentName !== inv.name),
            snapshots: s.snapshots.filter(snap => snap.investmentName !== inv.name),
            lastUpdated: nowIso(),
          }
        }),

      removeInvestments: (ids) =>
        set((s) => {
          const invsToRemove = s.investments.filter(i => ids.includes(i.id))
          if (invsToRemove.length === 0) return s
          const namesToRemove = new Set(invsToRemove.map(i => i.name))

          return {
            investments: s.investments.filter(i => !ids.includes(i.id)),
            transactions: s.transactions.filter(t => !namesToRemove.has(t.investmentName)),
            snapshots: s.snapshots.filter(snap => !namesToRemove.has(snap.investmentName)),
            lastUpdated: nowIso(),
          }
        }),

      // === TRANSACTIONS ===
      addTransaction: (tx) =>
        set((s) => ({
          transactions: [...s.transactions, { ...tx, id: generateId() }],
          lastUpdated: nowIso(),
        })),

      updateTransaction: (id, updates) =>
        set((s) => ({
          transactions: s.transactions.map(t => t.id === id ? { ...t, ...updates } : t),
          lastUpdated: nowIso(),
        })),

      removeTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter(t => t.id !== id),
          lastUpdated: nowIso(),
        })),

      removeTransactions: (ids) =>
        set((s) => ({
          transactions: s.transactions.filter(t => !ids.includes(t.id)),
          lastUpdated: nowIso(),
        })),

      // === SNAPSHOTS ===
      addSnapshot: (snap) =>
        set((s) => ({
          snapshots: [...s.snapshots, { ...snap, id: generateId() }],
          lastUpdated: nowIso(),
        })),

      updateSnapshot: (id, updates) =>
        set((s) => ({
          snapshots: s.snapshots.map(snap => snap.id === id ? { ...snap, ...updates } : snap),
          lastUpdated: nowIso(),
        })),

      removeSnapshot: (id) =>
        set((s) => ({
          snapshots: s.snapshots.filter(snap => snap.id !== id),
          lastUpdated: nowIso(),
        })),

      // === DATA ===
      exportData: () => {
        const { config, investments, transactions, snapshots, lastUpdated } = get()
        return { config, investments, transactions, snapshots, lastUpdated }
      },

      importData: (data) =>
        set({ ...data, lastUpdated: nowIso() }),

      clearData: () =>
        set({
          config: buildDefaultConfig(get().config.baseCurrency),
          investments: [],
          transactions: [],
          snapshots: [],
          lastUpdated: nowIso(),
          syncStatus: 'idle',
          lastSyncedAt: null,
          syncError: null,
        }),

      syncWithBackend: async (userId: string) => {
        if (!userId) return false

        const state = get()
        if (state.activeUserId && state.activeUserId !== userId) return false
        if (!state.isHydratedFromBackend) return false

        const { config, investments, transactions, snapshots } = state
        set({ syncStatus: 'saving', syncError: null })

        try {
          const saved = await rentabilidadApi.sync(userId, { config, investments, transactions, snapshots })
          const syncedAt = nowIso()
          set({ syncStatus: 'saved', lastSyncedAt: syncedAt, syncError: null })
          return Boolean(saved)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'No se pudo sincronizar la calculadora.'
          set({ syncStatus: 'error', syncError: message })
          throw error
        }
      },
    }),
    {
      name: 'mia-rentabilidad',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeUserId: state.activeUserId,
        config: state.config,
        investments: state.investments,
        transactions: state.transactions,
        snapshots: state.snapshots,
        lastUpdated: state.lastUpdated,
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        config: {
          ...currentState.config,
          ...(persistedState?.config || {}),
          pillars: (() => {
            const persisted: string[] = persistedState?.config?.pillars || []
            // Migrate: remove legacy auto-generated pillar names that were removed from defaults
            const LEGACY_PILLARS = ['Crea Patrimonio', ...Array.from({ length: 10 }, (_, i) => `Objetivo ${i + 1}`)]
            const cleaned = persisted.filter(p => !LEGACY_PILLARS.includes(p))
            // Ensure the 4 core Vortex pillars always exist (add if missing)
            const core = DEFAULT_PILLARS.filter(p => !cleaned.includes(p))
            return cleaned.length > 0 ? [...core, ...cleaned] : currentState.config.pillars
          })(),
          entities: persistedState?.config?.entities || currentState.config.entities,
          currencies: persistedState?.config?.currencies || currentState.config.currencies,
          dashboardSettings: {
            ...(currentState.config.dashboardSettings || {}),
            ...(persistedState?.config?.dashboardSettings || {}),
            pillarTargets: {
              ...(currentState.config.dashboardSettings?.pillarTargets || {}),
              ...(persistedState?.config?.dashboardSettings?.pillarTargets || {}),
            },
          },
        },
        activeUserId: persistedState?.activeUserId || null,
        isHydratedFromBackend: false,
        hydrateStatus: 'idle',
        hydrateError: null,
        investments: persistedState?.investments || currentState.investments,
        transactions: persistedState?.transactions || currentState.transactions,
        snapshots: persistedState?.snapshots || currentState.snapshots,
      }),
    }
  )
)
