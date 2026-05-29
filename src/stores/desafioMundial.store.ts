'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Aporte {
  id: string
  fecha: string
  monto: number
  moneda: string
  timestamp: number
}

export interface DesafioMundialProfile {
  nombre: string
  email: string
  telefono: string
  pais: string
  bandera: string
  monedaDefault: string
  registradoEn: string
}

interface DesafioMundialState {
  profile: DesafioMundialProfile | null
  aportes: Aporte[]
  isRegistered: boolean
}

interface DesafioMundialActions {
  registerProfile: (data: DesafioMundialProfile) => void
  addAporte: (monto: number, moneda: string) => void
  deleteAporte: (id: string) => void
  clearAll: () => void
  getTotalAhorrado: () => number
  getAporteHoy: () => Aporte | undefined
  getRacha: () => number
}

type DesafioMundialStore = DesafioMundialState & DesafioMundialActions

const today = () => new Date().toISOString().slice(0, 10)

export const useDesafioMundialStore = create<DesafioMundialStore>()(
  persist(
    (set, get) => ({
      profile: null,
      aportes: [],
      isRegistered: false,

      registerProfile: (data) =>
        set({ profile: data, isRegistered: true }),

      addAporte: (monto, moneda) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const aporte: Aporte = {
          id,
          fecha: today(),
          monto,
          moneda,
          timestamp: Date.now(),
        }
        set((s) => ({ aportes: [aporte, ...s.aportes] }))
      },

      deleteAporte: (id) =>
        set((s) => ({ aportes: s.aportes.filter((a) => a.id !== id) })),

      clearAll: () => set({ profile: null, aportes: [], isRegistered: false }),

      getTotalAhorrado: () =>
        get().aportes.reduce((acc, a) => acc + a.monto, 0),

      getAporteHoy: () => {
        const t = today()
        return get().aportes.find((a) => a.fecha === t)
      },

      getRacha: () => {
        const aportes = get().aportes
        if (aportes.length === 0) return 0

        const fechas = [...new Set(aportes.map((a) => a.fecha))].sort().reverse()
        const t = today()

        let racha = 0
        let cursor = new Date(t)

        for (const fecha of fechas) {
          const cursorStr = cursor.toISOString().slice(0, 10)
          if (fecha === cursorStr) {
            racha++
            cursor.setDate(cursor.getDate() - 1)
          } else {
            break
          }
        }

        return racha
      },
    }),
    {
      name: 'mia-desafio-mundial',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
