import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import CalculadoraLayout from '@/components/calculadora-rentabilidad/CalculadoraLayout'

export const metadata: Metadata = {
  title: 'Calculadora de Rentabilidad',
  description: 'Calcula la rentabilidad real de tus inversiones en COP y USD con TIR (XIRR) incluida.',
}

export default function RentabilidadPage() {
  return (
    <>
      <Navbar />
      <div className="pt-16">
        <CalculadoraLayout />
      </div>
    </>
  )
}
