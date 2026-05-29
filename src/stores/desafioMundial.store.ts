'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const MONTO_MINIMO_DIA = 20_000

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
  agregarAporte: (monto: number, moneda: string) => void
  eliminarAporte: (id: string) => void
  clearAll: () => void
  getAportesHoy: () => Aporte[]
  getTotalHoy: () => number
  getDiaCompletado: (fecha: string) => boolean
  getRacha: () => number
  getTotalDiasCompletados: () => number
  getTotalAcumulado: () => number
}

type DesafioMundialStore = DesafioMundialState & DesafioMundialActions

const todayStr = () => new Date().toISOString().slice(0, 10)

function aportesDelDia(aportes: Aporte[], fecha: string) {
  return aportes.filter((a) => a.fecha === fecha)
}

function totalDelDia(aportes: Aporte[], fecha: string) {
  return aportesDelDia(aportes, fecha).reduce((s, a) => s + a.monto, 0)
}

export const useDesafioMundialStore = create<DesafioMundialStore>()(
  persist(
    (set, get) => ({
      profile: null,
      aportes: [],
      isRegistered: false,

      registerProfile: (data) => set({ profile: data, isRegistered: true }),

      agregarAporte: (monto, moneda) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const aporte: Aporte = { id, fecha: todayStr(), monto, moneda, timestamp: Date.now() }
        set((s) => ({ aportes: [aporte, ...s.aportes] }))
      },

      eliminarAporte: (id) =>
        set((s) => ({ aportes: s.aportes.filter((a) => a.id !== id) })),

      clearAll: () => set({ profile: null, aportes: [], isRegistered: false }),

      getAportesHoy: () => aportesDelDia(get().aportes, todayStr()),

      getTotalHoy: () => totalDelDia(get().aportes, todayStr()),

      getDiaCompletado: (fecha) => totalDelDia(get().aportes, fecha) >= MONTO_MINIMO_DIA,

      getTotalDiasCompletados: () => {
        const { aportes } = get()
        const fechas = [...new Set(aportes.map((a) => a.fecha))]
        return fechas.filter((f) => totalDelDia(aportes, f) >= MONTO_MINIMO_DIA).length
      },

      getTotalAcumulado: () =>
        get().aportes.reduce((s, a) => s + a.monto, 0),

      getRacha: () => {
        const { aportes } = get()
        if (aportes.length === 0) return 0
        const fechas = [...new Set(aportes.map((a) => a.fecha))].sort().reverse()
        const t = todayStr()
        let racha = 0
        const cursor = new Date(t)
        for (const fecha of fechas) {
          const cursorFecha = cursor.toISOString().slice(0, 10)
          if (fecha === cursorFecha && totalDelDia(aportes, fecha) >= MONTO_MINIMO_DIA) {
            racha++
            cursor.setDate(cursor.getDate() - 1)
          } else if (fecha === cursorFecha) {
            break
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
