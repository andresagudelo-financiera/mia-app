import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import AntiDebtSimulator from '@/components/simuladores/AntiDebtSimulator'

export const metadata: Metadata = {
  title: 'Analiza tu deuda | Moneyflow',
  description: 'Simula abonos, tasa y plazo para optimizar una deuda.',
}

export default function AntiDebtPage() {
  return (
    <>
      <Navbar variant="user" />
      <div className="pt-16">
        <AntiDebtSimulator simulatorKey="analiza-tu-deuda" />
      </div>
    </>
  )
}
