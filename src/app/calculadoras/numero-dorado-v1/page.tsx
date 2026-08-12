import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import NumeroDoradoSimulator from '@/components/simuladores/NumeroDoradoSimulator'

export const metadata: Metadata = {
  title: 'Número Dorado V1 | Moneyflow',
  description: 'Calcula tu número dorado para retiro y guarda el resultado en Moneyflow.',
}

export default function NumeroDoradoV1Page() {
  return (
    <>
      <Navbar variant="user" />
      <div className="pt-16">
        <NumeroDoradoSimulator />
      </div>
    </>
  )
}
