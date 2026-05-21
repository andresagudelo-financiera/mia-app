'use client'

import Link from 'next/link'
import { Award, Download, ShieldCheck, Sparkles, Trophy } from 'lucide-react'
import type { AcademyLearningPath } from '@/types/rentabilidad'

type DiplomaCardProps = {
  path: AcademyLearningPath
  studentName?: string | null
  studentEmail?: string | null
  compact?: boolean
}

export default function DiplomaCard({ path, studentName, studentEmail, compact = false }: DiplomaCardProps) {
  const certificate = path.certificate
  if (!certificate) return null

  const issuedAt = certificate.issuedAt ? new Date(certificate.issuedAt) : null
  const displayName = studentName || studentEmail || 'Estudiante Financieramente'

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[2rem] border border-amber-300/40 bg-[#fff8e7] text-[#251a0b] shadow-2xl shadow-amber-500/10 print:shadow-none">
        <div className="relative p-6 md:p-10">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-mf-coral/15 blur-2xl" />
          <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-amber-300/25 blur-2xl" />

          <div className="relative rounded-[1.5rem] border-2 border-amber-300/60 p-6 md:p-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mf-coral/25 bg-mf-coral/10 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-mf-coral">
                  <Trophy className="h-4 w-4" /> Diploma oficial
                </div>
                <p className="font-heading text-3xl font-black md:text-5xl">Financieramente Academy</p>
                <p className="mt-2 text-sm font-semibold text-[#7d6543]">Moneyflow by MIA</p>
              </div>
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-amber-300 bg-white/60 text-mf-coral shadow-inner">
                <Award className="h-10 w-10" />
              </div>
            </div>

            <div className="my-8 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />

            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#7d6543]">Se certifica que</p>
              <h1 className="mt-3 font-heading text-4xl font-black leading-tight text-[#1f160b] md:text-6xl">{displayName}</h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#5f4f39] md:text-lg">
                completó satisfactoriamente la ruta de estudio <strong>{path.title}</strong>, incluyendo sus clases, actividades y evaluación final.
              </p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <DiplomaFact label="Ruta" value={path.title} />
              <DiplomaFact label="Fecha de emisión" value={issuedAt ? issuedAt.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Emitido'} />
              <DiplomaFact label="Código" value={certificate.verificationCode} monospace />
            </div>

            {!compact && (
              <div className="mt-8 rounded-2xl border border-amber-300/50 bg-white/45 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-black text-[#1f160b]"><Sparkles className="h-4 w-4 text-mf-coral" /> Cursos completados</p>
                <div className="grid gap-2">
                  {path.courses.map(course => (
                    <div key={course.courseKey} className="flex items-center justify-between rounded-xl bg-white/55 px-3 py-2 text-sm">
                      <span className="font-semibold">{course.courseOrder}. {course.title || course.courseKey}</span>
                      <ShieldCheck className="h-4 w-4 text-gain" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 border-t border-amber-300/40 pt-5 text-xs text-[#7d6543] sm:flex-row sm:items-center sm:justify-between">
              <span>Verificación: {certificate.subjectType}/{certificate.subjectKey}</span>
              <span>ID certificado: {certificate.id}</span>
            </div>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="flex flex-col gap-3 print:hidden sm:flex-row">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf px-5 py-3 text-sm font-bold text-white"
          >
            <Download className="h-4 w-4" /> Descargar / imprimir PDF
          </button>
          <Link href="/academia" className="inline-flex items-center justify-center rounded-xl border border-mia-border px-5 py-3 text-sm font-bold text-neutral hover:text-mia-cream">
            Volver a academia
          </Link>
        </div>
      )}
    </section>
  )
}

function DiplomaFact({ label, value, monospace = false }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="rounded-2xl border border-amber-300/50 bg-white/55 p-4 text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8a7047]">{label}</p>
      <p className={`mt-2 text-sm font-black text-[#1f160b] ${monospace ? 'font-mono tracking-[0.18em]' : 'font-heading'}`}>{value}</p>
    </div>
  )
}
