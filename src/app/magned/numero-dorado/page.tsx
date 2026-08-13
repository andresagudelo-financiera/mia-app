import type { Metadata } from 'next'
import NumeroDoradoV2Simulator from '@/components/simuladores/NumeroDoradoV2Simulator'

export const metadata: Metadata = {
  title: 'Tu Número Dorado | Moneyflow',
  description: 'Conoce una proyección para tu meta y las palancas que puedes mover.',
}

/** Public lead-magnet route: it deliberately does not render the account navbar or auth gate. */
export default function MagnedNumeroDoradoPage() {
  return <NumeroDoradoV2Simulator mode="magned" />
}
