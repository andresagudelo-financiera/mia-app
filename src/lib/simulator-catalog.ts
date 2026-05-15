import type { Simulator } from '@/types/rentabilidad'

export const DEFAULT_PUBLIC_SIMULATORS: Simulator[] = [
  {
    id: 'rentabilidad',
    slug: 'rentabilidad',
    name: 'Calculadora de Rentabilidad',
    description: 'Mide la rentabilidad real de tus inversiones con flujos, cortes y TIR/XIRR multi-moneda.',
    status: 'active',
    accessType: 'demo',
    demoDays: 20,
  },
  {
    id: 'perfil-riesgo',
    slug: 'perfil-riesgo',
    name: 'Perfil de Riesgo',
    description: 'Descubre tu tolerancia al riesgo y recibe una guía inicial para invertir con más claridad.',
    status: 'active',
    accessType: 'free',
  },
  {
    id: 'numero-dorado',
    slug: 'numero-dorado',
    name: 'Número Dorado',
    description: 'Calcula cuánto necesitas acumular para sostener tu retiro con inflación y rentabilidad esperada.',
    status: 'active',
    accessType: 'free',
  },
]

export const PLACEHOLDER_SIMULATORS: Simulator[] = [
  {
    id: 'interes-compuesto',
    slug: 'interes-compuesto',
    name: 'Calculadora de Interés Compuesto',
    description: 'Simula el crecimiento de tus ahorros con aportaciones periódicas y tasa de interés.',
    status: 'coming_soon',
    accessType: 'free',
  },
]

export function mergeSimulatorCatalog(simulators: Simulator[]) {
  const merged = [...simulators]

  DEFAULT_PUBLIC_SIMULATORS.forEach(simulator => {
    if (!merged.some(item => item.slug === simulator.slug)) {
      merged.push(simulator)
    }
  })

  PLACEHOLDER_SIMULATORS.forEach(simulator => {
    if (!merged.some(item => item.slug === simulator.slug)) {
      merged.push(simulator)
    }
  })

  return merged
}
