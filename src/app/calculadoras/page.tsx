import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import CalculatorDirectory from '@/components/landing/CalculatorDirectory'

export const metadata: Metadata = {
  title: 'Calculadoras',
  description: 'Herramientas financieras gratuitas de Moneyflow by MIA.',
}

export default function CalculadorasPage() {
  return (
    <>
      <Navbar variant="user" />
      <main className="pt-24 pb-16 min-h-screen bg-mia-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <section className="mx-auto mb-8 max-w-3xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-mf-coral">
              Moneyflow by MIA
            </p>
            <h1 className="text-balance font-heading text-4xl font-bold leading-tight text-mia-cream sm:text-5xl lg:text-6xl">
              Decide mejor con tu dinero
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-neutral sm:text-lg">
              Elige un simulador, guarda tus respuestas en la nube y recibe claridad accionable sobre inversión, riesgo y retiro.
            </p>
          </section>

          <CalculatorDirectory />
        </div>
      </main>
      <Footer />
    </>
  )
}
