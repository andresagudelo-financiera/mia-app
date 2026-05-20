import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import AntiDebtChallenge from '@/components/simuladores/AntiDebtChallenge'

export const metadata: Metadata = {
  title: 'Reto Anti-Deuda | Moneyflow',
  description: 'Completa una ruta gamificada para pasar de deudor a inversionista.',
}

export default function AntiDebtChallengePage() {
  return (
    <>
      <Navbar variant="user" />
      <div className="pt-16">
        <AntiDebtChallenge />
      </div>
    </>
  )
}
