import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import AntiDebtSimulator from '@/components/simuladores/AntiDebtSimulator'

export const metadata: Metadata = {
  title: 'Plan de pago de deuda | Moneyflow',
  description: 'Compara métodos de pago y fecha de libertad de deuda.',
}

export default function AntiDebtPage() {
  return (
    <>
      <Navbar variant="user" />
      <div className="pt-16">
        <AntiDebtSimulator simulatorKey="plan-pago-deuda" />
      </div>
    </>
  )
}
