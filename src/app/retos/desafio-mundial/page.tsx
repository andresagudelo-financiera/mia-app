import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import DesafioMundial from '@/components/simuladores/DesafioMundial'

export const metadata: Metadata = {
  title: 'Desafío Mundial 2030 | Moneyflow',
  description: 'Marca cada día que ahorras hasta el FIFA World Cup 2030. Construye el hábito y llega al torneo con la racha ganada.',
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
