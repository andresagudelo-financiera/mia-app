import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import CalculatorCards from '@/components/landing/CalculatorCards'

export const metadata: Metadata = {
  title: 'Calculadoras',
  description: 'Herramientas financieras gratuitas de MIA by Moneyflow.',
}

export default function CalculadorasPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-mia-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-heading font-bold text-mia-cream mb-4">
              Calculadoras <span className="gradient-mf-text">MIA</span>
            </h1>
            <p className="text-lg text-neutral max-w-xl">
              Herramientas profesionales para tomar decisiones financieras con claridad.
            </p>
          </div>
          <CalculatorCards />
        </div>
      </main>
      <Footer />
    </>
  )
}
