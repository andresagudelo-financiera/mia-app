import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import AntiDebtSimulator from '@/components/simuladores/AntiDebtSimulator'

export const metadata: Metadata = {
  title: 'Diagnóstico financiero de deuda | Moneyflow',
  description: 'Calcula tu carga de deuda, liquidez y semáforo financiero.',
}

export default function AntiDebtPage() {
  return (
    <>
      <Navbar variant="user" />
      <div className="pt-16">
        <AntiDebtSimulator simulatorKey="diagnostico-financiero-deuda" />
      </div>
    </>
  )
}
