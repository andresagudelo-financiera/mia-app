import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import WhatIsMIA from '@/components/landing/WhatIsMIA'
import CalculatorCards from '@/components/landing/CalculatorCards'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'MIA | Tu inteligencia financiera en un solo lugar',
  description:
    'Herramientas financieras gratuitas para calcular la rentabilidad real de tus inversiones en COP y USD, con TIR incluida.',
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-mia-black">
      <Navbar />
      <Hero />
      <WhatIsMIA />
      <CalculatorCards />
      <Footer />
    </main>
  )
}
