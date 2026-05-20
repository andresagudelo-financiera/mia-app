import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import AntiDebtSimulator from '@/components/simuladores/AntiDebtSimulator'

export const metadata: Metadata = {
  title: 'Diagnóstico emocional de deuda | Moneyflow',
  description: 'Identifica tu arquetipo de deuda y riesgo de recaída.',
}

export default function AntiDebtPage() {
  return (
    <>
      <Navbar variant="user" />
      <div className="pt-16">
        <AntiDebtSimulator simulatorKey="diagnostico-emocional-deuda" />
      </div>
    </>
  )
}
