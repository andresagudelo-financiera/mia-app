import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import PerfilRiesgoSimulator from '@/components/simuladores/PerfilRiesgoSimulator'

export const metadata: Metadata = {
  title: 'Perfil de Riesgo | Moneyflow',
  description: 'Descubre tu perfil de riesgo y guarda tus respuestas en Moneyflow.',
}

export default function PerfilRiesgoPage() {
  return (
    <>
      <Navbar variant="user" />
      <div className="pt-16">
        <PerfilRiesgoSimulator />
      </div>
    </>
  )
}
