'use client'

import { useEffect, useState } from 'react'
import { BookOpen, LockKeyhole, ShieldCheck } from 'lucide-react'
import UserRegistrationModal from '@/components/auth/UserRegistrationModal'
import { useUserStore } from '@/stores/user.store'

export default function AcademyAuthGate({ children }: { children: React.ReactNode }) {
  const profile = useUserStore(state => state.profile)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="rounded-3xl border border-mia-border bg-mia-card p-6 text-neutral">Validando sesión...</div>
  }

  if (!profile?.id) {
    return (
      <div className="relative min-h-[70vh]">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-mf-coral/30 bg-mia-card/80 p-8 text-center shadow-2xl shadow-mf-coral/10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-mf-coral/10 text-mf-coral">
            <LockKeyhole className="h-8 w-8" />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-mf-coral">Acceso protegido</p>
          <h1 className="font-heading text-3xl font-bold text-mia-cream md:text-5xl">Inicia sesión para entrar a Academia</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-neutral md:text-base">
            Los cursos, carreras, lecciones, quizzes y certificados requieren una cuenta activa para medir tu avance y proteger el contenido.
          </p>
          <div className="mt-6 grid gap-3 text-left md:grid-cols-3">
            <Info icon={BookOpen} text="Cursos y carreras con progreso" />
            <Info icon={ShieldCheck} text="Acceso trazable por usuario" />
            <Info icon={LockKeyhole} text="Videos y certificados protegidos" />
          </div>
        </div>
        <UserRegistrationModal toolName="academia" contentName="academia" backHref="/" backLabel="Volver al inicio" onClose={() => undefined} />
      </div>
    )
  }

  return <>{children}</>
}

function Info({ icon: Icon, text }: { icon: any; text: string }) {
  return <div className="rounded-2xl border border-mia-border bg-mia-surface/30 p-4 text-sm font-semibold text-neutral"><Icon className="mb-2 h-5 w-5 text-mf-coral" />{text}</div>
}
