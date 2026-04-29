'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Config, Investment, Transaction, Snapshot, RentabilidadStoreData } from '@/types/rentabilidad'
import { DEFAULT_PILLARS, DEFAULT_ENTITIES, SUPPORTED_CURRENCIES } from '@/lib/constants'

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
}

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

export const useRentabilidadStore = create<RentabilidadStore>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      investments: [],
      transactions: [],
      snapshots: [],
      lastUpdated: new Date().toISOString(),

      // === CONFIG ===
      setBaseCurrency: (currency) =>
        set((s) => ({ config: { ...s.config, baseCurrency: currency }, lastUpdated: new Date().toISOString() })),

      addPillar: (name) =>
        set((s) => ({ config: { ...s.config, pillars: [...(s.config.pillars || []), name] } })),

      updatePillar: (oldName, newName) =>
        set((s) => ({
          config: { ...s.config, pillars: (s.config.pillars || []).map(p => p === oldName ? newName : p) },
          investments: s.investments.map(inv => inv.pilar === oldName ? { ...inv, pilar: newName } : inv),
        })),

      removePillar: (name) =>
        set((s) => ({ config: { ...s.config, pillars: (s.config.pillars || []).filter(p => p !== name) } })),

      addEntity: (name) =>
        set((s) => ({ config: { ...s.config, entities: [...(s.config.entities || []), name] } })),

      updateEntity: (oldName, newName) =>
        set((s) => ({
          config: { ...s.config, entities: (s.config.entities || []).map(e => e === oldName ? newName : e) },
          investments: s.investments.map(inv => inv.entity === oldName ? { ...inv, entity: newName } : inv),
          transactions: s.transactions.map(tx => tx.entity === oldName ? { ...tx, entity: newName } : tx),
        })),

      removeEntity: (name) =>
        set((s) => ({ config: { ...s.config, entities: (s.config.entities || []).filter(e => e !== name) } })),

      // === INVESTMENTS ===
      addInvestment: (inv) => {
        const state = get()
        if (state.investments.some(i => i.name === inv.name)) return false
        set({
          investments: [...state.investments, { ...inv, id: generateId(), createdAt: new Date().toISOString() }],
          lastUpdated: new Date().toISOString(),
        })
        return true
      },

      updateInvestment: (id, updates) =>
        set((s) => ({
          investments: s.investments.map(inv => inv.id === id ? { ...inv, ...updates } : inv),
          lastUpdated: new Date().toISOString(),
        })),

      removeInvestment: (id) =>
        set((s) => {
          const inv = s.investments.find(i => i.id === id)
          if (!inv) return {}
          return {
            investments: s.investments.filter(i => i.id !== id),
            transactions: s.transactions.filter(t => t.investmentName !== inv.name),
            snapshots: s.snapshots.filter(snap => snap.investmentName !== inv.name),
            lastUpdated: new Date().toISOString(),
          }
        }),

      // === TRANSACTIONS ===
      addTransaction: (tx) =>
        set((s) => ({
          transactions: [...s.transactions, { ...tx, id: generateId() }],
          lastUpdated: new Date().toISOString(),
        })),

      updateTransaction: (id, updates) =>
        set((s) => ({
          transactions: s.transactions.map(t => t.id === id ? { ...t, ...updates } : t),
          lastUpdated: new Date().toISOString(),
        })),

      removeTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter(t => t.id !== id),
          lastUpdated: new Date().toISOString(),
        })),

      // === SNAPSHOTS ===
      addSnapshot: (snap) =>
        set((s) => ({
          snapshots: [...s.snapshots, { ...snap, id: generateId() }],
          lastUpdated: new Date().toISOString(),
        })),

      updateSnapshot: (id, updates) =>
        set((s) => ({
          snapshots: s.snapshots.map(snap => snap.id === id ? { ...snap, ...updates } : snap),
          lastUpdated: new Date().toISOString(),
        })),

      removeSnapshot: (id) =>
        set((s) => ({
          snapshots: s.snapshots.filter(snap => snap.id !== id),
          lastUpdated: new Date().toISOString(),
        })),

      // === DATA ===
      exportData: () => {
        const { config, investments, transactions, snapshots, lastUpdated } = get()
        return { config, investments, transactions, snapshots, lastUpdated }
      },

      importData: (data) =>
        set({ ...data, lastUpdated: new Date().toISOString() }),

      clearData: () =>
        set({
          config: DEFAULT_CONFIG,
          investments: [],
          transactions: [],
          snapshots: [],
          lastUpdated: new Date().toISOString(),
        }),
    }),
    {
      name: 'mia-rentabilidad',
      storage: createJSONStorage(() => localStorage),
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
