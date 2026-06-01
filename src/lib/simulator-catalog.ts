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
  {
    id: 'diagnostico-emocional-deuda',
    slug: 'diagnostico-emocional-deuda',
    name: 'Diagnóstico emocional de deuda',
    description: 'Descubre tu arquetipo de deuda, riesgo de recaída y primera acción anti-deuda.',
    status: 'active',
    accessType: 'free',
  },
  {
    id: 'diagnostico-financiero-deuda',
    slug: 'diagnostico-financiero-deuda',
    name: 'Diagnóstico financiero de deuda',
    description: 'Calcula carga de deuda, liquidez, semáforo financiero y mejor método de pago.',
    status: 'active',
    accessType: 'free',
  },
  {
    id: 'plan-pago-deuda',
    slug: 'plan-pago-deuda',
    name: 'Plan de pago de deuda',
    description: 'Compara bola de nieve y avalancha para estimar fecha de libertad financiera.',
    status: 'active',
    accessType: 'free',
  },
  {
    id: 'analiza-tu-deuda',
    slug: 'analiza-tu-deuda',
    name: 'Analiza tu deuda',
    description: 'Simula abonos, tasa y plazo para decidir si pagar, reestructurar o invertir.',
    status: 'active',
    accessType: 'free',
  },
  {
    id: 'desafio-mundial',
    slug: 'desafio-mundial',
    name: 'Desafío Mundial 2030',
    description: 'Tracker de ahorro diario con cuotas. Marca cada día, acumula tu racha y llega al FIFA World Cup 2030 con el hábito construido.',
    status: process.env.NEXT_PUBLIC_ENABLE_WORLD_CUP_CHALLENGE === 'true' ? 'active' : 'hidden',
    accessType: 'free',
  },
]

export function mergeSimulatorCatalog(
  simulators: Simulator[],
  options: { includeDefaults?: boolean } = {},
) {
  const merged = [...simulators]

  if (options.includeDefaults) {
    DEFAULT_PUBLIC_SIMULATORS.forEach(simulator => {
      if (!merged.some(item => item.slug === simulator.slug)) {
        merged.push(simulator)
      }
    })
  }

  // Filtrar simuladores que estén inactivos debido a flags de feature
  return merged.filter(simulator => simulator.status === 'active')
}

