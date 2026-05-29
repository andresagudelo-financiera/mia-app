import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import DesafioMundial from '@/components/simuladores/DesafioMundial'

export const metadata: Metadata = {
  title: 'Desafío Mundial 2026 | Moneyflow',
  description: 'Tracker de ahorro diario hasta el FIFA World Cup 2026. Registra un aporte cada día y llega al Mundial con más plata.',
}

export default function DesafioMundialPage() {
  return (
    <>
      <Navbar variant="user" />
      <div className="pt-16">
        <DesafioMundial />
      </div>
    </>
  )
}
