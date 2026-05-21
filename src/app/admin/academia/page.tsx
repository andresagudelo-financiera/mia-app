'use client'

import { useEffect, useState } from 'react'
import { Activity, BookOpen, HelpCircle, KeyRound, Loader2, Plus, ShieldCheck, Trophy, Video } from 'lucide-react'
import AdminGuard from '@/components/admin/AdminGuard'
import AdminShell from '@/components/admin/AdminShell'
import type { AcademyCourse } from '@/types/rentabilidad'
import { isAcademyEnabled } from '@/lib/feature-flags'

const COURSE_FIELDS = `
  id key slug title description status accessType level estimatedMinutes metadata
  progress { progressPercent completedLessons totalLessons status }
  modules { id courseId title moduleOrder status lessons { id title slug status youtubeVideoId youtubeUrl isDemo accessType } }
`

const LIST = `query AdminAcademyCourses { adminAcademySummary adminAcademyCourses { ${COURSE_FIELDS} } }`
const UPSERT_COURSE = `mutation UpsertCourse($key:String!,$slug:String!,$title:String!,$description:String,$status:String,$accessType:String,$level:String,$estimatedMinutes:Float){ adminUpsertAcademyCourse(key:$key,slug:$slug,title:$title,description:$description,status:$status,accessType:$accessType,level:$level,estimatedMinutes:$estimatedMinutes){ ${COURSE_FIELDS} } }`
const UPSERT_MODULE = `mutation UpsertModule($courseId:String!,$title:String!,$moduleOrder:Float!,$description:String,$status:String,$unlockRule:String){ adminUpsertAcademyModule(courseId:$courseId,title:$title,moduleOrder:$moduleOrder,description:$description,status:$status,unlockRule:$unlockRule) }`
const UPSERT_LESSON = `mutation UpsertLesson($courseId:String!,$moduleId:String!,$slug:String!,$title:String!,$lessonOrder:Float!,$description:String,$status:String,$accessType:String,$youtubeUrl:String,$isDemo:Boolean,$lessonType:String){ adminUpsertAcademyLesson(courseId:$courseId,moduleId:$moduleId,slug:$slug,title:$title,lessonOrder:$lessonOrder,description:$description,status:$status,accessType:$accessType,youtubeUrl:$youtubeUrl,isDemo:$isDemo,lessonType:$lessonType) }`
const UPSERT_PATH = `mutation UpsertPath($key:String!,$slug:String!,$title:String!,$description:String,$status:String,$accessType:String,$courseKeys:JSON){ adminUpsertAcademyLearningPath(key:$key,slug:$slug,title:$title,description:$description,status:$status,accessType:$accessType,courseKeys:$courseKeys) }`
const UPSERT_QUIZ = `mutation UpsertQuiz($lessonId:String!,$title:String!,$description:String,$passingScore:Float,$maxAttempts:Float,$questions:JSON!){ adminUpsertAcademyQuiz(lessonId:$lessonId,title:$title,description:$description,passingScore:$passingScore,maxAttempts:$maxAttempts,questions:$questions) }`
const GRANT_ACCESS = `mutation GrantAcademyAccessByEmail($email:String!,$subjectType:String!,$subjectKey:String!,$accessType:String!,$source:String,$expiresAt:String){ adminGrantAcademyAccessByEmail(email:$email,subjectType:$subjectType,subjectKey:$subjectKey,accessType:$accessType,source:$source,expiresAt:$expiresAt) }`

export default function AdminAcademiaPage() {
  if (!isAcademyEnabled()) {
    return (
      <AdminGuard>
        <AdminShell>
          <div className="rounded-3xl border border-mf-coral/20 bg-mia-card p-8 text-mia-cream">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-mf-coral">Academia en construcción</p>
            <h2 className="mt-3 font-heading text-2xl font-black">El módulo de cursos está oculto temporalmente</h2>
            <p className="mt-2 max-w-2xl text-sm text-neutral">Para producción, Academia queda deshabilitada hasta terminar la validación funcional. Actívala con NEXT_PUBLIC_ACADEMY_ENABLED=true cuando esté lista.</p>
          </div>
        </AdminShell>
      </AdminGuard>
    )
  }
  return <AdminGuard><AdminShell><AcademyAdmin /></AdminShell></AdminGuard>
}

function AcademyAdmin() {
  const [courses, setCourses] = useState<AcademyCourse[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courseForm, setCourseForm] = useState({ key: 'nuevo-curso', slug: 'nuevo-curso', title: 'Nuevo curso', description: '', status: 'draft', accessType: 'subscription', level: 'basico', estimatedMinutes: 60 })
  const [lessonForm, setLessonForm] = useState({ courseId: '', moduleId: '', slug: 'nueva-clase', title: 'Nueva clase', description: '', lessonOrder: 1, status: 'draft', accessType: 'inherit', youtubeUrl: '', isDemo: false, lessonType: 'video' })
  const [pathForm, setPathForm] = useState({ key: 'nueva-carrera', slug: 'nueva-carrera', title: 'Nueva carrera', description: '', status: 'draft', accessType: 'subscription', courseKeys: '' })
  const [quizForm, setQuizForm] = useState({ lessonId: '', title: 'Quiz final', description: '', passingScore: 80, maxAttempts: 3, questionsText: 'Pregunta 1|Opción correcta|Opción 2|Opción 3\nPregunta 2|Opción correcta|Opción 2|Opción 3' })
  const [accessForm, setAccessForm] = useState({ email: '', subjectType: 'course', subjectKey: 'deudor-inversionista', accessType: 'manual', expiresAt: '' })

  useEffect(() => { void load() }, [])

  async function graphQL<T>(query: string, variables: Record<string, unknown> = {}) {
    const response = await fetch('/api/admin/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) })
    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.errors?.length) throw new Error(payload?.errors?.[0]?.message || 'No se pudo consultar GraphQL.')
    return payload.data as T
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await graphQL<{ adminAcademySummary: any; adminAcademyCourses: AcademyCourse[] }>(LIST)
      setSummary(data.adminAcademySummary)
      setCourses(data.adminAcademyCourses)
      const firstModule = data.adminAcademyCourses[0]?.modules[0]
      if (firstModule) setLessonForm(current => ({ ...current, courseId: firstModule.courseId, moduleId: firstModule.id }))
      const firstLesson = firstModule?.lessons?.[0]
      if (firstLesson) setQuizForm(current => ({ ...current, lessonId: firstLesson.id }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function createCourse() {
    setSaving(true)
    try {
      const data = await graphQL<{ adminUpsertAcademyCourse: AcademyCourse }>(UPSERT_COURSE, courseForm)
      const course = data.adminUpsertAcademyCourse
      await graphQL(UPSERT_MODULE, { courseId: course.id, title: 'Módulo 1', description: 'Primer módulo del curso.', moduleOrder: 1, status: 'draft', unlockRule: 'always' })
      await load()
    } catch (err) { setError((err as Error).message) } finally { setSaving(false) }
  }

  async function createLesson() {
    setSaving(true)
    try {
      await graphQL(UPSERT_LESSON, lessonForm)
      await load()
    } catch (err) { setError((err as Error).message) } finally { setSaving(false) }
  }

  async function createLearningPath() {
    setSaving(true)
    try {
      await graphQL(UPSERT_PATH, { ...pathForm, courseKeys: pathForm.courseKeys.split(',').map(item => item.trim()).filter(Boolean) })
      await load()
    } catch (err) { setError((err as Error).message) } finally { setSaving(false) }
  }

  async function createQuiz() {
    setSaving(true)
    try {
      const questions = quizForm.questionsText.split('\n').map(line => {
        const [questionText, correctAnswer, ...otherOptions] = line.split('|').map(item => item.trim()).filter(Boolean)
        return { questionText, correctAnswer, options: [correctAnswer, ...otherOptions].filter(Boolean), points: 1, explanation: { text: 'Respuesta evaluada automáticamente.' } }
      }).filter(question => question.questionText && question.correctAnswer && question.options.length >= 2)
      await graphQL(UPSERT_QUIZ, { lessonId: quizForm.lessonId, title: quizForm.title, description: quizForm.description, passingScore: quizForm.passingScore, maxAttempts: quizForm.maxAttempts, questions })
      await load()
    } catch (err) { setError((err as Error).message) } finally { setSaving(false) }
  }


  async function grantAccess() {
    setSaving(true)
    try {
      await graphQL(GRANT_ACCESS, { ...accessForm, expiresAt: accessForm.expiresAt || null, source: 'admin_academia' })
      await load()
    } catch (err) { setError((err as Error).message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-mia-border bg-mia-card/70 p-6">
        <div className="mb-4 flex items-center gap-3"><BookOpen className="h-6 w-6 text-mf-coral" /><div><h2 className="font-heading text-2xl font-bold text-mia-cream">Academia</h2><p className="text-sm text-neutral">Cursos, módulos, carreras, quizzes, acceso manual y métricas MVP listas para escalar sin cambiar la lógica base.</p></div></div>
        {error && <p className="mb-4 rounded-xl border border-loss/30 bg-loss/10 p-3 text-sm text-loss">{error}</p>}
        {loading ? <p className="text-neutral"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Cargando...</p> : null}
      </div>

      {summary && <AcademySummary summary={summary} />}

      <section className="rounded-3xl border border-gain/30 bg-gain/10 p-5">
        <div className="mb-4 flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 text-gain" /><div><h3 className="font-heading text-xl font-bold text-mia-cream">Checklist MVP escalable</h3><p className="text-sm text-neutral">Seguimos con YouTube, pero la plataforma queda preparada para más cursos, carreras y usuarios.</p></div></div>
        <div className="grid gap-3 md:grid-cols-3">
          <ChecklistItem text="Acceso por curso/carrera desacoplado de pasarela" />
          <ChecklistItem text="Progreso, eventos de video y quiz medibles" />
          <ChecklistItem text="videoProvider preparado para futuro premium" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-mia-border bg-mia-surface/30 p-5">
          <h3 className="mb-4 font-heading text-xl font-bold text-mia-cream"><Plus className="mr-2 inline h-5 w-5 text-mf-coral" />Crear curso</h3>
          <div className="grid gap-3">
            <Input label="Key" value={courseForm.key} onChange={key => setCourseForm({ ...courseForm, key })} />
            <Input label="Slug" value={courseForm.slug} onChange={slug => setCourseForm({ ...courseForm, slug })} />
            <Input label="Título" value={courseForm.title} onChange={title => setCourseForm({ ...courseForm, title })} />
            <Input label="Descripción" value={courseForm.description} onChange={description => setCourseForm({ ...courseForm, description })} />
            <Select label="Acceso" value={courseForm.accessType} values={['free','demo','subscription','one_time_payment','manual','cohort']} onChange={accessType => setCourseForm({ ...courseForm, accessType })} />
            <Select label="Estado" value={courseForm.status} values={['draft','published','coming_soon','archived']} onChange={status => setCourseForm({ ...courseForm, status })} />
            <button onClick={createCourse} disabled={saving} className="rounded-xl bg-gradient-mf px-4 py-3 text-sm font-bold text-white disabled:opacity-60">Crear curso + módulo inicial</button>
          </div>
        </section>

        <section className="rounded-3xl border border-mia-border bg-mia-surface/30 p-5">
          <h3 className="mb-4 font-heading text-xl font-bold text-mia-cream"><Video className="mr-2 inline h-5 w-5 text-mf-coral" />Crear lección YouTube</h3>
          <div className="grid gap-3">
            <Select label="Curso / módulo" value={`${lessonForm.courseId}|${lessonForm.moduleId}`} values={courses.flatMap(c => c.modules.map(m => `${c.id}|${m.id}`))} labels={Object.fromEntries(courses.flatMap(c => c.modules.map(m => [`${c.id}|${m.id}`, `${c.title} · ${m.title}`])))} onChange={value => { const [courseId, moduleId] = value.split('|'); setLessonForm({ ...lessonForm, courseId, moduleId }) }} />
            <Input label="Slug" value={lessonForm.slug} onChange={slug => setLessonForm({ ...lessonForm, slug })} />
            <Input label="Título" value={lessonForm.title} onChange={title => setLessonForm({ ...lessonForm, title })} />
            <Input label="URL YouTube" value={lessonForm.youtubeUrl} onChange={youtubeUrl => setLessonForm({ ...lessonForm, youtubeUrl })} placeholder="https://www.youtube.com/watch?v=..." />
            <Input label="Descripción" value={lessonForm.description} onChange={description => setLessonForm({ ...lessonForm, description })} />
            <Select label="Acceso" value={lessonForm.accessType} values={['inherit','free','demo','subscription']} onChange={accessType => setLessonForm({ ...lessonForm, accessType })} />
            <Select label="Tipo" value={lessonForm.lessonType} values={['video','quiz','live','article']} onChange={lessonType => setLessonForm({ ...lessonForm, lessonType })} />
            <label className="flex items-center gap-2 text-sm font-semibold text-neutral"><input type="checkbox" checked={lessonForm.isDemo} onChange={event => setLessonForm({ ...lessonForm, isDemo: event.target.checked })} /> Clase demo</label>
            <button onClick={createLesson} disabled={saving || !lessonForm.courseId || !lessonForm.moduleId} className="rounded-xl bg-gradient-mf px-4 py-3 text-sm font-bold text-white disabled:opacity-60">Crear lección</button>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-mia-border bg-mia-surface/30 p-5">
          <h3 className="mb-4 font-heading text-xl font-bold text-mia-cream"><Trophy className="mr-2 inline h-5 w-5 text-mf-coral" />Crear carrera</h3>
          <div className="grid gap-3">
            <Input label="Key" value={pathForm.key} onChange={key => setPathForm({ ...pathForm, key })} />
            <Input label="Slug" value={pathForm.slug} onChange={slug => setPathForm({ ...pathForm, slug })} />
            <Input label="Título" value={pathForm.title} onChange={title => setPathForm({ ...pathForm, title })} />
            <Input label="Descripción" value={pathForm.description} onChange={description => setPathForm({ ...pathForm, description })} />
            <Input label="Course keys en orden" value={pathForm.courseKeys} onChange={courseKeys => setPathForm({ ...pathForm, courseKeys })} placeholder="deudor-inversionista,otro-curso" />
            <Select label="Acceso" value={pathForm.accessType} values={['free','demo','subscription','one_time_payment','manual','cohort']} onChange={accessType => setPathForm({ ...pathForm, accessType })} />
            <Select label="Estado" value={pathForm.status} values={['draft','published','coming_soon','archived']} onChange={status => setPathForm({ ...pathForm, status })} />
            <button onClick={createLearningPath} disabled={saving} className="rounded-xl bg-gradient-mf px-4 py-3 text-sm font-bold text-white disabled:opacity-60">Guardar carrera</button>
          </div>
        </section>

        <section className="rounded-3xl border border-mia-border bg-mia-surface/30 p-5">
          <h3 className="mb-4 font-heading text-xl font-bold text-mia-cream"><HelpCircle className="mr-2 inline h-5 w-5 text-mf-coral" />Configurar quiz</h3>
          <div className="grid gap-3">
            <Select label="Lección quiz" value={quizForm.lessonId} values={courses.flatMap(c => c.modules.flatMap(m => m.lessons.map(l => l.id)))} labels={Object.fromEntries(courses.flatMap(c => c.modules.flatMap(m => m.lessons.map(l => [l.id, `${c.title} · ${l.title}`]))))} onChange={lessonId => setQuizForm({ ...quizForm, lessonId })} />
            <Input label="Título" value={quizForm.title} onChange={title => setQuizForm({ ...quizForm, title })} />
            <Input label="Descripción" value={quizForm.description} onChange={description => setQuizForm({ ...quizForm, description })} />
            <NumberInput label="Puntaje aprobación" value={quizForm.passingScore} onChange={passingScore => setQuizForm({ ...quizForm, passingScore })} />
            <NumberInput label="Intentos máximos" value={quizForm.maxAttempts} onChange={maxAttempts => setQuizForm({ ...quizForm, maxAttempts })} />
            <label className="block text-sm font-semibold text-neutral">Preguntas: una por línea, formato pregunta|respuesta correcta|opción 2|opción 3<textarea value={quizForm.questionsText} onChange={event => setQuizForm({ ...quizForm, questionsText: event.target.value })} rows={5} className="mt-2 w-full rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-mia-cream outline-none focus:border-mf-coral" /></label>
            <button onClick={createQuiz} disabled={saving || !quizForm.lessonId} className="rounded-xl bg-gradient-mf px-4 py-3 text-sm font-bold text-white disabled:opacity-60">Guardar quiz</button>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-mia-border bg-mia-surface/30 p-5">
        <h3 className="mb-4 font-heading text-xl font-bold text-mia-cream"><KeyRound className="mr-2 inline h-5 w-5 text-mf-coral" />Dar acceso manual</h3>
        <div className="grid gap-3 md:grid-cols-5">
          <Input label="Email usuario" value={accessForm.email} onChange={email => setAccessForm({ ...accessForm, email })} placeholder="usuario@correo.com" />
          <Select label="Tipo" value={accessForm.subjectType} values={['course','learning_path']} labels={{ course: 'Curso', learning_path: 'Carrera' }} onChange={subjectType => setAccessForm({ ...accessForm, subjectType })} />
          <Input label="Key" value={accessForm.subjectKey} onChange={subjectKey => setAccessForm({ ...accessForm, subjectKey })} placeholder="deudor-inversionista" />
          <Select label="Acceso" value={accessForm.accessType} values={['manual','subscription','one_time_payment','demo','free']} onChange={accessType => setAccessForm({ ...accessForm, accessType })} />
          <Input label="Expira en" value={accessForm.expiresAt} onChange={expiresAt => setAccessForm({ ...accessForm, expiresAt })} placeholder="2026-12-31" />
        </div>
        <button onClick={grantAccess} disabled={saving || !accessForm.email || !accessForm.subjectKey} className="mt-4 rounded-xl bg-gradient-mf px-4 py-3 text-sm font-bold text-white disabled:opacity-60">Guardar acceso</button>
      </section>

      <section className="grid gap-4">
        {courses.map(course => <div key={course.id} className="rounded-3xl border border-mia-border bg-mia-card/60 p-5"><h3 className="font-heading text-xl font-bold text-mia-cream">{course.title}</h3><p className="text-sm text-neutral">{course.accessType} · {course.status} · {course.progress.totalLessons} lecciones</p>{course.modules.map(module => <div key={module.id} className="mt-4 rounded-2xl bg-mia-black/20 p-4"><p className="font-bold text-mia-cream">{module.title}</p><ul className="mt-2 space-y-1 text-sm text-neutral">{module.lessons.map(lesson => <li key={lesson.id}>• {lesson.title} · {lesson.youtubeVideoId || 'sin video'} · {lesson.isDemo ? 'demo' : lesson.accessType}</li>)}</ul></div>)}</div>)}
      </section>
    </div>
  )
}


function AcademySummary({ summary }: { summary: any }) {
  const counts = summary.counts || {}
  const rates = summary.rates || {}
  return (
    <section className="grid gap-4 md:grid-cols-4">
      <MetricCard icon={BookOpen} label="Cursos publicados" value={`${counts.publishedCourses || 0}/${counts.courses || 0}`} />
      <MetricCard icon={Video} label="Lecciones" value={counts.lessons || 0} helper={`${counts.demoLessons || 0} demo`} />
      <MetricCard icon={Activity} label="Eventos video" value={counts.videoEvents || 0} helper="play/pausa/resume" />
      <MetricCard icon={Trophy} label="Certificados" value={counts.certificates || 0} helper={`${rates.courseCompletionRate || 0}% finalización`} />
    </section>
  )
}

function MetricCard({ icon: Icon, label, value, helper }: { icon: any; label: string; value: string | number; helper?: string }) {
  return <div className="rounded-3xl border border-mia-border bg-mia-card/60 p-5"><Icon className="mb-3 h-5 w-5 text-mf-coral" /><p className="text-xs font-bold uppercase tracking-wide text-neutral">{label}</p><p className="mt-1 font-heading text-3xl font-bold text-mia-cream">{value}</p>{helper && <p className="mt-1 text-xs text-neutral">{helper}</p>}</div>
}

function ChecklistItem({ text }: { text: string }) {
  return <div className="rounded-2xl border border-gain/20 bg-mia-black/20 px-4 py-3 text-sm font-semibold text-gain"><ShieldCheck className="mr-2 inline h-4 w-4" />{text}</div>
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block text-sm font-semibold text-neutral">{label}<input value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-mia-cream outline-none focus:border-mf-coral" /></label>
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block text-sm font-semibold text-neutral">{label}<input type="number" value={value} onChange={event => onChange(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-mia-cream outline-none focus:border-mf-coral" /></label>
}

function Select({ label, value, values, onChange, labels }: { label: string; value: string; values: string[]; onChange: (value: string) => void; labels?: Record<string,string> }) {
  return <label className="block text-sm font-semibold text-neutral">{label}<select value={value} onChange={event => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-mia-border bg-mia-card px-4 py-3 text-mia-cream outline-none focus:border-mf-coral">{values.map(item => <option key={item} value={item}>{labels?.[item] || item}</option>)}</select></label>
}
