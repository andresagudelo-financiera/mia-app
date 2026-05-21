import Link from 'next/link'
import { BookOpen, Construction, Calculator } from 'lucide-react'

export default function AcademyComingSoon() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-16 text-center">
      <div className="rounded-[2rem] border border-mf-coral/20 bg-mia-card/70 p-8 shadow-2xl shadow-mf-coral/5 md:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-mf-coral/10 text-mf-coral">
          <Construction className="h-8 w-8" />
        </div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-mf-coral/30 bg-mf-coral/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-mf-coral">
          <BookOpen className="h-4 w-4" /> Academia en construcción
        </div>
        <h1 className="font-heading text-3xl font-bold text-mia-cream md:text-5xl">Estamos preparando los cursos</h1>
        <p className="mt-4 text-sm leading-relaxed text-neutral md:text-base">
          La Academia todavía no está habilitada en producción. Por ahora puedes seguir usando las calculadoras y simuladores disponibles.
        </p>
        <Link href="/calculadoras" className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf px-5 py-3 text-sm font-bold text-white">
          <Calculator className="h-4 w-4" /> Ir a calculadoras
        </Link>
      </div>
    </section>
  )
}
