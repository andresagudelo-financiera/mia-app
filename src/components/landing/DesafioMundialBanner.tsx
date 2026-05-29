import Link from 'next/link'
import { ArrowRight, Flame } from 'lucide-react'

function diasRestantes(): number {
  const ahora = new Date()
  ahora.setHours(0, 0, 0, 0)
  const mundial = new Date('2030-06-08T00:00:00')
  mundial.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((mundial.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)))
}

export default function DesafioMundialBanner() {
  const dias = diasRestantes()

  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/retos/desafio-mundial"
          className="group relative block overflow-hidden rounded-[2rem] border border-mf-orange/30 bg-gradient-to-br from-mf-orange/15 via-mia-card to-mia-black p-6 shadow-2xl shadow-mf-orange/5 transition hover:-translate-y-1 hover:border-mf-orange/60 md:p-10"
        >
          <div className="absolute -right-6 -top-6 select-none text-[9rem] opacity-10 md:-right-10 md:text-[13rem]">⚽</div>

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-5">
              <span className="text-5xl md:text-6xl">⚽</span>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-mf-orange/30 bg-mf-orange/10 px-3 py-1 text-xs font-bold text-mf-orange">
                  <Flame className="h-3.5 w-3.5" /> Desafío activo · Gratis
                </div>
                <h2 className="font-heading text-2xl font-bold text-mia-cream md:text-3xl">
                  Desafío Mundial 2030
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral md:text-base">
                  Marca cada día que ahorras. Construye el hábito antes del FIFA World Cup 2030.
                  {dias > 0 && (
                    <> Faltan <strong className="text-mf-orange">{dias.toLocaleString('es-CO')} días</strong> para el torneo.</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-shrink-0 flex-col items-start gap-3 md:items-end">
              {dias > 0 && (
                <div className="text-center md:text-right">
                  <p className="font-heading text-4xl font-bold text-mf-orange">{dias.toLocaleString('es-CO')}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral">días restantes</p>
                </div>
              )}
              <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-mf px-6 py-3 text-sm font-bold text-white shadow-lg shadow-mf-coral/20">
                Unirme al desafío
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  )
}
