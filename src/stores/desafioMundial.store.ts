'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Aporte {
  id: string
  fecha: string
  timestamp: number
}

export interface DesafioMundialProfile {
  nombre: string
  email: string
  telefono: string
  pais: string
  bandera: string
  registradoEn: string
  userId?: string
}

interface DesafioMundialState {
  profile: DesafioMundialProfile | null
  aportes: Aporte[]
  isRegistered: boolean
}

interface DesafioMundialActions {
  registerProfile: (data: DesafioMundialProfile) => void
  marcarHoy: () => void
  desmarcarAporte: (id: string) => void
  clearAll: () => void
  getAporteHoy: () => Aporte | undefined
  getRacha: () => number
  getTotalDias: () => number
}

type DesafioMundialStore = DesafioMundialState & DesafioMundialActions

const today = () => new Date().toISOString().slice(0, 10)

export const useDesafioMundialStore = create<DesafioMundialStore>()(
  persist(
    (set, get) => ({
      profile: null,
      aportes: [],
      isRegistered: false,

      registerProfile: (data) => set({ profile: data, isRegistered: true }),

      marcarHoy: () => {
        const t = today()
        if (get().aportes.find((a) => a.fecha === t)) return
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        set((s) => ({ aportes: [{ id, fecha: t, timestamp: Date.now() }, ...s.aportes] }))
      },

      desmarcarAporte: (id) =>
        set((s) => ({ aportes: s.aportes.filter((a) => a.id !== id) })),

      clearAll: () => set({ profile: null, aportes: [], isRegistered: false }),

      getAporteHoy: () => {
        const t = today()
        return get().aportes.find((a) => a.fecha === t)
      },

      getTotalDias: () => get().aportes.length,

      getRacha: () => {
        const aportes = get().aportes
        if (aportes.length === 0) return 0
        const fechas = [...new Set(aportes.map((a) => a.fecha))].sort().reverse()
        const t = today()
        let racha = 0
        const cursor = new Date(t)
        for (const fecha of fechas) {
          if (fecha === cursor.toISOString().slice(0, 10)) {
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
