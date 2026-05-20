'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Award, BookOpen, CheckCircle2, LockKeyhole, PlayCircle, Route, Sparkles, Trophy } from 'lucide-react'
import { academyApi } from '@/services/api/academy.api'
import { useUserStore } from '@/stores/user.store'
import type { AcademyCourse, AcademyLearningPath } from '@/types/rentabilidad'

export default function AcademyHome() {
  const { profile } = useUserStore()
  const [courses, setCourses] = useState<AcademyCourse[]>([])
  const [paths, setPaths] = useState<AcademyLearningPath[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([academyApi.listCourses(profile?.id), academyApi.listLearningPaths(profile?.id)])
      .then(([courseList, pathList]) => {
        setCourses(courseList)
        setPaths(pathList)
      })
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [profile?.id])

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border border-mia-border bg-mia-card/70 p-6 shadow-2xl shadow-mf-coral/5 md:p-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mf-coral/30 bg-mf-coral/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-mf-coral">
          <Sparkles className="h-4 w-4" /> Academia Financieramente
        </div>
        <h1 className="font-heading text-4xl font-bold text-mia-cream md:text-6xl">Estudia, simula y avanza con un roadmap financiero.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral md:text-lg">
          Cursos, lives, replays, simuladores y retos conectados en una experiencia de aprendizaje medible tipo Hotmart/Skool, pero integrada al ecosistema Financieramente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Feature icon={BookOpen} title="Cursos por capas" text="Módulos, lecciones, materiales, demos y suscripciones." />
        <Feature icon={Route} title="School road" text="Desbloqueo por avance, fecha, simuladores, retos o admin." />
        <Feature icon={PlayCircle} title="Videos YouTube" text="Embed protegido por plataforma, watermark y trazabilidad." />
      </div>

      {loading && <p className="rounded-2xl border border-mia-border bg-mia-surface/30 p-4 text-neutral">Cargando cursos...</p>}
      {error && <p className="rounded-2xl border border-loss/30 bg-loss/10 p-4 text-loss">{error}</p>}

      {paths.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-mf-coral" /><h2 className="font-heading text-2xl font-bold text-mia-cream">Carreras disponibles</h2></div>
          <div className="grid gap-6 lg:grid-cols-2">
            {paths.map(path => <LearningPathCard key={path.id} path={path} />)}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-mf-coral" /><h2 className="font-heading text-2xl font-bold text-mia-cream">Cursos individuales</h2></div>
        <div className="grid gap-6 lg:grid-cols-2">
          {courses.map(course => <CourseCard key={course.id} course={course} />)}
        </div>
      </div>
    </section>
  )
}


function LearningPathCard({ path }: { path: AcademyLearningPath }) {
  const completed = path.courses.filter(course => course.isCompleted).length
  const total = path.courses.length || 1
  const percent = Math.round((completed / total) * 100)
  const firstCourse = path.courses[0]
  const href = firstCourse ? `/academia/cursos/${firstCourse.courseKey}` : '/academia'

  return (
    <Link href={href} className="group block rounded-3xl border border-mf-coral/30 bg-gradient-to-br from-mf-coral/15 via-mia-card/80 to-mia-black p-6 shadow-2xl shadow-mf-coral/10 transition hover:-translate-y-1 hover:border-mf-coral/60 hover:shadow-mf-coral/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-mf-coral/10 px-3 py-1 text-xs font-bold text-mf-coral"><Award className="h-4 w-4" /> Carrera</div>
          <h3 className="font-heading text-2xl font-bold text-mia-cream">{path.title}</h3>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mf-coral/30 bg-mf-coral/10 text-mf-coral transition group-hover:translate-x-1 group-hover:bg-mf-coral group-hover:text-white">
          <ArrowRight className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-neutral">{path.description}</p>
      <div className="mt-5 space-y-2">
        {path.courses.map(course => (
          <div key={course.courseKey} className="flex items-center justify-between rounded-2xl border border-mia-border bg-mia-surface/30 px-4 py-3 text-sm transition group-hover:border-mf-coral/40">
            <span className="font-semibold text-mia-cream">{course.courseOrder}. {course.title || course.courseKey}</span>
            {course.isCompleted ? <CheckCircle2 className="h-5 w-5 text-gain" /> : <ArrowRight className="h-5 w-5 text-mf-coral" />}
          </div>
        ))}
      </div>
      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs font-semibold text-neutral"><span>{completed}/{path.courses.length} cursos completados</span><span>{percent}%</span></div>
        <div className="h-2 rounded-full bg-mia-surface"><div className="h-full rounded-full bg-gradient-mf" style={{ width: `${percent}%` }} /></div>
      </div>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-mf-coral">Empezar carrera <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div>
      {path.certificate && (
        <div className="mt-5 rounded-2xl border border-gain/30 bg-gain/10 p-4 text-sm text-gain">
          <Trophy className="mr-2 inline h-4 w-4" /> Diploma emitido: {path.certificate.title} · Código {path.certificate.verificationCode}
        </div>
      )}
    </Link>
  )
}

function CourseCard({ course }: { course: AcademyCourse }) {
  const totalLessons = course.progress.totalLessons || course.modules.reduce((sum, module) => sum + module.lessons.length, 0)
  return (
    <Link href={`/academia/cursos/${course.slug}`} className="group block rounded-3xl border border-mia-border bg-mia-card/70 p-6 transition hover:-translate-y-1 hover:border-mf-coral/50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gain/10 px-3 py-1 text-xs font-bold text-gain">
            {course.access.hasAccess ? <CheckCircle2 className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
            {course.accessType}
          </div>
          <h2 className="font-heading text-2xl font-bold text-mia-cream">{course.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral">{course.description}</p>
        </div>
        <span className="rounded-xl bg-gradient-mf px-4 py-3 text-sm font-bold text-white">Ver curso</span>
      </div>
      <div className="mt-6">
        <div className="mb-2 flex justify-between text-xs font-semibold text-neutral"><span>{totalLessons} lecciones</span><span>{course.progress.progressPercent}%</span></div>
        <div className="h-2 rounded-full bg-mia-surface"><div className="h-full rounded-full bg-gradient-mf" style={{ width: `${course.progress.progressPercent}%` }} /></div>
      </div>
    </Link>
  )
}

function Feature({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return <div className="rounded-3xl border border-mia-border bg-mia-surface/30 p-5"><Icon className="mb-3 h-6 w-6 text-mf-coral" /><h3 className="font-heading text-lg font-bold text-mia-cream">{title}</h3><p className="mt-2 text-sm text-neutral">{text}</p></div>
}
