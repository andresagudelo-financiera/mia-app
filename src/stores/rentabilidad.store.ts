'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Config, Investment, Transaction, Snapshot, RentabilidadStoreData } from '@/types/rentabilidad'
import { DEFAULT_PILLARS, DEFAULT_ENTITIES, SUPPORTED_CURRENCIES } from '@/lib/constants'
import { rentabilidadApi } from '@/services/api/rentabilidad.api'

const DEFAULT_CONFIG: Config = {
  baseCurrency: 'COP',
  pillars: DEFAULT_PILLARS,
  entities: DEFAULT_ENTITIES,
  currencies: SUPPORTED_CURRENCIES,
}

interface RentabilidadStore extends RentabilidadStoreData {
  // Config actions
  setBaseCurrency: (currency: string) => void
  addPillar: (name: string) => void
  updatePillar: (oldName: string, newName: string) => void
  removePillar: (name: string) => void
  addEntity: (name: string) => void
  updateEntity: (oldName: string, newName: string) => void
  removeEntity: (name: string) => void

  // Investment actions
  addInvestment: (inv: Omit<Investment, 'id' | 'createdAt'>) => boolean // returns false if name duplicate
  updateInvestment: (id: string, updates: Partial<Omit<Investment, 'id'>>) => void
  removeInvestment: (id: string) => void

  // Transaction actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => void
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => void
  removeTransaction: (id: string) => void

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
      config: DEFAULT_CONFIG,
      investments: [],
      transactions: [],
      snapshots: [],
      lastUpdated: nowIso(),
      syncStatus: 'idle',
      lastSyncedAt: null,
      syncError: null,

      // === CONFIG ===
      setBaseCurrency: (currency) =>
        set((s) => ({ config: { ...s.config, baseCurrency: currency }, lastUpdated: nowIso() })),

      addPillar: (name) =>
        set((s) => ({
          config: { ...s.config, pillars: [...(s.config.pillars || []), name] },
          lastUpdated: nowIso(),
        })),

      updatePillar: (oldName, newName) =>
        set((s) => ({
          config: { ...s.config, pillars: (s.config.pillars || []).map(p => p === oldName ? newName : p) },
          investments: s.investments.map(inv => inv.pilar === oldName ? { ...inv, pilar: newName } : inv),
          lastUpdated: nowIso(),
        })),

      removePillar: (name) =>
        set((s) => ({
          config: { ...s.config, pillars: (s.config.pillars || []).filter(p => p !== name) },
          lastUpdated: nowIso(),
        })),

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
          if (!inv) return {}
          return {
            investments: s.investments.filter(i => i.id !== id),
            transactions: s.transactions.filter(t => t.investmentName !== inv.name),
            snapshots: s.snapshots.filter(snap => snap.investmentName !== inv.name),
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
          config: DEFAULT_CONFIG,
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

        const { config, investments, transactions, snapshots } = get()
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
          pillars: persistedState?.config?.pillars || currentState.config.pillars,
          entities: persistedState?.config?.entities || currentState.config.entities,
          currencies: persistedState?.config?.currencies || currentState.config.currencies,
        },
        investments: persistedState?.investments || currentState.investments,
        transactions: persistedState?.transactions || currentState.transactions,
        snapshots: persistedState?.snapshots || currentState.snapshots,
      }),
    }
  )
)
