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
  setDashboardData: (data: { isRegistered: boolean; aportes: Aporte[]; profile: DesafioMundialProfile | null }) => void
  agregarAporteLocal: (aporte: Aporte) => void
  eliminarAporteLocal: (id: string) => void
  clearAll: () => void
  getAportesHoy: () => Aporte[]
  getTotalHoy: () => number
  getDiaCompletado: (fecha: string) => boolean
  getRacha: () => number
  getTotalDiasCompletados: () => number
  getTotalAcumulado: () => number
  // Nuevo: devuelve cuántos días virtuales están 100% llenos
  getDiasLlenosAcumulado: () => number
  // Nuevo: dado un índice de día virtual (0-based), devuelve 0..1 de llenado
  getDiaFill: (index: number) => number
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

      setDashboardData: (data) => set({
        profile: data.profile,
        aportes: data.aportes,
        isRegistered: data.isRegistered
      }),

      agregarAporteLocal: (aporte) => {
        set((s) => ({ aportes: [aporte, ...s.aportes] }))
      },

      eliminarAporteLocal: (id) =>
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

      getDiasLlenosAcumulado: () => {
        const total = get().aportes.reduce((s, a) => s + a.monto, 0)
        return Math.floor(total / MONTO_MINIMO_DIA)
      },

      getDiaFill: (index: number) => {
        const total = get().aportes.reduce((s, a) => s + a.monto, 0)
        const inicio = index * MONTO_MINIMO_DIA
        if (total <= inicio) return 0
        const restante = total - inicio
        return Math.min(1, restante / MONTO_MINIMO_DIA)
      },

      getRacha: () => {
        const { aportes } = get()
        if (aportes.length === 0) return 0

        // Filtramos las fechas que efectivamente cumplen con el mínimo diario
        const fechasCompletadas = new Set(
          [...new Set(aportes.map((a) => a.fecha))].filter(
            (f) => totalDelDia(aportes, f) >= MONTO_MINIMO_DIA
          )
        )

        const hoy = todayStr()
        const ayerObj = new Date(hoy)
        ayerObj.setDate(ayerObj.getDate() - 1)
        const ayer = ayerObj.toISOString().slice(0, 10)

        let cursor = hoy
        // Si hoy no se ha completado pero ayer sí, comenzamos a contar la racha desde ayer
        if (!fechasCompletadas.has(hoy) && fechasCompletadas.has(ayer)) {
          cursor = ayer
        } else if (!fechasCompletadas.has(hoy)) {
          // Si no completó hoy ni ayer, la racha ya se rompió
          return 0
        }

        let racha = 0
        const dateCursor = new Date(cursor)

        while (true) {
          const checkFecha = dateCursor.toISOString().slice(0, 10)
          if (fechasCompletadas.has(checkFecha)) {
            racha++
            dateCursor.setDate(dateCursor.getDate() - 1)
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

