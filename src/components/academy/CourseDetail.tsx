'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, HelpCircle, LockKeyhole, PlayCircle } from 'lucide-react'
import { academyApi } from '@/services/api/academy.api'
import { useUserStore } from '@/stores/user.store'
import type { AcademyCourse } from '@/types/rentabilidad'

export default function CourseDetail({ slug }: { slug: string }) {
  const { profile } = useUserStore()
  const [course, setCourse] = useState<AcademyCourse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    academyApi.getCourse(slug, profile?.id)
      .then(setCourse)
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [profile?.id, slug])

  async function startCourse() {
    if (!profile?.id || !course) return
    const updated = await academyApi.startCourse(profile.id, course.slug)
    setCourse(updated)
  }

  if (loading) return <div className="rounded-3xl border border-mia-border bg-mia-card p-6 text-neutral">Cargando curso...</div>
  if (error || !course) return <div className="rounded-3xl border border-loss/30 bg-loss/10 p-6 text-loss">{error || 'Curso no encontrado.'}</div>

  return (
    <section className="space-y-6">
      <Link href="/academia" className="inline-flex items-center gap-2 rounded-full border border-mia-border bg-mia-surface/60 px-4 py-2 text-sm font-semibold text-neutral hover:text-mia-cream"><ArrowLeft className="h-4 w-4" /> Volver a academia</Link>
      <div className="rounded-[2rem] border border-mia-border bg-mia-card/70 p-6 md:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-mf-coral">{course.level || 'Curso'} · {course.accessType}</p>
        <h1 className="mt-3 font-heading text-4xl font-bold text-mia-cream md:text-6xl">{course.title}</h1>
        <p className="mt-4 max-w-3xl text-neutral">{course.description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {profile?.id && course.access.hasAccess && <button onClick={startCourse} className="rounded-xl bg-gradient-mf px-5 py-3 text-sm font-bold text-white">Iniciar / continuar</button>}
          {!course.access.hasAccess && <div className="rounded-xl border border-mf-orange/30 bg-mf-orange/10 px-4 py-3 text-sm font-bold text-mf-orange">{course.access.lockedMessage}</div>}
        </div>
      </div>

      <div className="space-y-5">
        {course.modules.map(module => (
          <div key={module.id} className="rounded-3xl border border-mia-border bg-mia-surface/30 p-5">
            <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-heading text-2xl font-bold text-mia-cream">{module.title}</h2>{!module.isUnlocked && <LockKeyhole className="h-5 w-5 text-mf-orange" />}</div>
            <div className="grid gap-3">
              {module.lessons.map(lesson => {
                const canOpen = lesson.isUnlocked && (course.access.hasAccess || lesson.isDemo)
                return (
                  <Link key={lesson.id} href={canOpen ? `/academia/cursos/${course.slug}/lecciones/${lesson.slug}` : '#'} className={`rounded-2xl border p-4 transition ${canOpen ? 'border-mia-border bg-mia-card/70 hover:border-mf-coral/50' : 'pointer-events-none border-mia-border bg-mia-black/20 opacity-70'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">{lesson.lessonType === 'quiz' ? <HelpCircle className="mt-1 h-5 w-5 text-mf-coral" /> : <PlayCircle className="mt-1 h-5 w-5 text-mf-coral" />}<div><p className="font-bold text-mia-cream">{lesson.title}</p><p className="text-sm text-neutral">{lesson.description}</p></div></div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-mia-surface px-3 py-1 text-xs font-bold text-neutral">{lesson.progress.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-gain" />}{lesson.lessonType === 'quiz' ? 'Quiz' : lesson.isDemo ? 'Demo' : lesson.accessType}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
