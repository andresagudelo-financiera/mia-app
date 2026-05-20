'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Award, CheckCircle2, HelpCircle, LockKeyhole, PauseCircle, PlayCircle, RotateCcw, ShieldCheck, Trophy } from 'lucide-react'
import { academyApi } from '@/services/api/academy.api'
import { useUserStore } from '@/stores/user.store'
import type { AcademyLesson, AcademyQuiz, AcademyQuizAttempt } from '@/types/rentabilidad'

export default function LessonPlayer({ courseSlug, lessonSlug }: { courseSlug: string; lessonSlug: string }) {
  const { profile } = useUserStore()
  const [lesson, setLesson] = useState<AcademyLesson | null>(null)
  const [quiz, setQuiz] = useState<AcademyQuiz | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [attempt, setAttempt] = useState<AcademyQuizAttempt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLesson(null)
    setQuiz(null)
    setAttempt(null)
    setAnswers({})
    setError(null)
    academyApi.getLesson(courseSlug, lessonSlug, profile?.id)
      .then(setLesson)
      .catch(err => setError((err as Error).message))
  }, [courseSlug, lessonSlug, profile?.id])

  useEffect(() => {
    if (!lesson || lesson.lessonType !== 'quiz' || !lesson.isUnlocked) return
    setQuizError(null)
    academyApi.getQuiz(lesson.id, profile?.id)
      .then(setQuiz)
      .catch(err => setQuizError((err as Error).message))
  }, [lesson, profile?.id])

  const quizComplete = useMemo(() => quiz ? quiz.questions.every(question => answers[question.id]) : false, [answers, quiz])

  async function markCompleted() {
    if (!profile?.id || !lesson) return
    setSaving(true)
    try {
      const payload = await academyApi.trackLessonProgress({ userId: profile.id, lessonId: lesson.id, progressPercent: 100, status: 'completed', eventName: lesson.lessonType === 'video' ? 'video_completed' : 'lesson_completed' })
      setLesson(current => current ? { ...current, progress: payload.progress } : current)
    } finally {
      setSaving(false)
    }
  }

  async function submitQuiz() {
    if (!profile?.id || !quiz || !lesson || !quizComplete) return
    setSaving(true)
    setQuizError(null)
    try {
      const result = await academyApi.submitQuizAttempt({ userId: profile.id, quizId: quiz.id, answers })
      setAttempt(result)
      if (result.passed) {
        setLesson(current => current ? { ...current, progress: { ...current.progress, status: 'completed', progressPercent: 100 } } : current)
      }
    } catch (err) {
      setQuizError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (error) return <div className="rounded-3xl border border-loss/30 bg-loss/10 p-6 text-loss">{error}</div>
  if (!lesson) return <div className="rounded-3xl border border-mia-border bg-mia-card p-6 text-neutral">Cargando lección...</div>

  const locked = !lesson.isUnlocked
  const isQuiz = lesson.lessonType === 'quiz'

  return (
    <section className="space-y-6">
      <Link href={`/academia/cursos/${courseSlug}`} className="inline-flex items-center gap-2 rounded-full border border-mia-border bg-mia-surface/60 px-4 py-2 text-sm font-semibold text-neutral hover:text-mia-cream"><ArrowLeft className="h-4 w-4" /> Volver al curso</Link>
      <div className="rounded-[2rem] border border-mia-border bg-mia-card/70 p-5 md:p-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-mf-coral">{isQuiz ? 'Evaluación' : 'Clase'} · {lesson.isDemo ? 'Demo' : 'Suscripción'}</p>
        <h1 className="font-heading text-3xl font-bold text-mia-cream md:text-5xl">{lesson.title}</h1>
        <p className="mt-3 text-neutral">{lesson.description}</p>
      </div>

      {locked ? (
        <div className="rounded-3xl border border-mf-orange/30 bg-mf-orange/10 p-8 text-center text-mf-orange"><LockKeyhole className="mx-auto mb-3 h-8 w-8" />{lesson.lockedReason || 'Esta lección está bloqueada.'}</div>
      ) : isQuiz ? (
        <div className="space-y-4">
          {quizError && <div className="rounded-2xl border border-loss/30 bg-loss/10 p-4 text-sm text-loss">{quizError}</div>}
          {!quiz ? (
            <div className="rounded-3xl border border-mia-border bg-mia-card p-6 text-neutral">Cargando quiz...</div>
          ) : (
            <div className="rounded-3xl border border-mia-border bg-mia-card/70 p-5 md:p-8">
              <div className="mb-6 flex flex-col gap-3 border-b border-mia-border pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-mf-coral/30 bg-mf-coral/10 px-3 py-1 text-xs font-bold text-mf-coral"><HelpCircle className="h-4 w-4" /> Quiz final</div>
                  <h2 className="font-heading text-2xl font-bold text-mia-cream">{quiz.title}</h2>
                  <p className="mt-2 text-sm text-neutral">Aprueba con mínimo {quiz.passingScore}%. Al aprobar, la lección se marca automáticamente como completada y se recalcula el curso/carrera.</p>
                </div>
                <div className="rounded-2xl bg-mia-surface px-4 py-3 text-sm font-bold text-neutral">{Object.keys(answers).length}/{quiz.questions.length} respuestas</div>
              </div>

              <div className="space-y-5">
                {quiz.questions.map((question, index) => (
                  <div key={question.id} className="rounded-2xl border border-mia-border bg-mia-surface/30 p-4">
                    <p className="mb-3 font-bold text-mia-cream">{index + 1}. {question.questionText}</p>
                    <div className="grid gap-2">
                      {question.options.map(option => {
                        const selected = answers[question.id] === option
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => !attempt && setAnswers(current => ({ ...current, [question.id]: option }))}
                            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${selected ? 'border-mf-coral bg-mf-coral/15 text-mia-cream' : 'border-mia-border bg-mia-black/20 text-neutral hover:border-mf-coral/40'}`}
                          >
                            {option}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {attempt && (
                <div className={`mt-6 rounded-3xl border p-5 ${attempt.passed ? 'border-gain/30 bg-gain/10 text-gain' : 'border-mf-orange/30 bg-mf-orange/10 text-mf-orange'}`}>
                  <div className="flex items-start gap-3">
                    {attempt.passed ? <Trophy className="mt-1 h-6 w-6" /> : <RotateCcw className="mt-1 h-6 w-6" />}
                    <div>
                      <p className="font-heading text-xl font-bold">{attempt.passed ? '¡Aprobado! Curso actualizado automáticamente.' : 'Inténtalo de nuevo para desbloquear el diploma.'}</p>
                      <p className="mt-1 text-sm">Puntaje: {attempt.score}%. {attempt.passed ? 'Si completaste todas las lecciones, tu certificado/diploma queda emitido por backend.' : `Necesitas ${quiz.passingScore}% o más.`}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button onClick={submitQuiz} disabled={!profile?.id || !quizComplete || saving || Boolean(attempt?.passed)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf px-5 py-4 text-sm font-bold text-white disabled:opacity-50"><Award className="h-5 w-5" /> Enviar quiz</button>
                {attempt && !attempt.passed && <button onClick={() => { setAttempt(null); setAnswers({}) }} className="rounded-xl border border-mia-border px-5 py-4 text-sm font-bold text-neutral hover:text-mia-cream">Reintentar</button>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <ControlledAcademyVideo lesson={lesson} profile={profile} onProgress={payload => setLesson(current => current ? { ...current, progress: payload.progress || current.progress } : current)} />
          <div className="rounded-3xl border border-gain/30 bg-gain/10 p-4 text-sm text-gain">
            <ShieldCheck className="mr-2 inline h-4 w-4" /> Video alojado en YouTube y protegido por acceso de plataforma, watermark y trazabilidad. Para protección premium futura se puede migrar a Bunny/Cloudflare Stream sin cambiar la lógica de cursos.
          </div>
          <button onClick={markCompleted} disabled={!profile?.id || saving || lesson.progress.status === 'completed'} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-mf px-5 py-4 text-sm font-bold text-white disabled:opacity-50 sm:w-auto"><CheckCircle2 className="h-5 w-5" /> {lesson.progress.status === 'completed' ? 'Lección completada' : 'Marcar como completada'}</button>
        </div>
      )}
    </section>
  )
}


function ControlledAcademyVideo({ lesson, profile, onProgress }: { lesson: AcademyLesson; profile: ReturnType<typeof useUserStore.getState>['profile']; onProgress?: (payload: any) => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const video = useMemo(() => resolveLessonVideo(lesson), [lesson])
  const embedSrc = useMemo(() => video.provider === 'youtube' && video.videoId ? buildControlledYoutubeUrl(video.videoId, loaded) : video.embedUrl, [loaded, video])

  function sendYoutubeCommand(command: 'playVideo' | 'pauseVideo') {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: command, args: [] }), '*')
  }

  async function trackVideoEvent(eventName: string, progressPercent: number, status = 'in_progress') {
    if (!profile?.id) return
    try {
      const payload = await academyApi.trackLessonProgress({ userId: profile.id, lessonId: lesson.id, progressPercent, status, eventName })
      onProgress?.(payload)
    } catch {
      // El tracking no debe romper la reproducción.
    }
  }

  function togglePlayback() {
    if (!embedSrc) return
    if (!loaded) {
      setLoaded(true)
      setPlaying(true)
      if (!hasStarted) {
        setHasStarted(true)
        void trackVideoEvent('video_started', Math.max(lesson.progress.progressPercent || 0, 1))
      }
      return
    }

    if (playing) {
      sendYoutubeCommand('pauseVideo')
      setPlaying(false)
      void trackVideoEvent('video_paused', Math.max(lesson.progress.progressPercent || 0, hasStarted ? 10 : 1))
    } else {
      sendYoutubeCommand('playVideo')
      setPlaying(true)
      if (!hasStarted) {
        setHasStarted(true)
        void trackVideoEvent('video_started', Math.max(lesson.progress.progressPercent || 0, 1))
      } else {
        void trackVideoEvent('video_resumed', Math.max(lesson.progress.progressPercent || 0, 10))
      }
    }
  }

  if (!embedSrc || (video.provider === 'youtube' && !video.videoId)) {
    return <div className="flex aspect-video items-center justify-center rounded-3xl border border-mia-border bg-black text-neutral"><PlayCircle className="mr-2 h-6 w-6" /> Video pendiente</div>
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-mia-border bg-black shadow-2xl shadow-mf-coral/10">
      {loaded ? (
        <iframe
          ref={iframeRef}
          src={embedSrc}
          title={lesson.title}
          className="aspect-video w-full pointer-events-none"
          allow="autoplay; encrypted-media; picture-in-picture"
          tabIndex={-1}
        />
      ) : (
        <div className="relative aspect-video w-full bg-cover bg-center" style={{ backgroundImage: `url(${video.thumbnailUrl})` }}>
          <div className="absolute inset-0 bg-black/25" />
        </div>
      )}

      <button
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? 'Pausar video' : 'Reproducir video'}
        className="absolute inset-0 z-10 flex items-center justify-center bg-transparent text-white outline-none"
      >
        {!playing && (
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-mf-coral text-white shadow-2xl shadow-black/30 transition hover:scale-105">
            <PlayCircle className="h-11 w-11" />
          </span>
        )}
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4">
        <button
          type="button"
          onClick={togglePlayback}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-mf-coral"
        >
          {playing ? <PauseCircle className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
          {playing ? 'Pausar' : 'Reproducir'}
        </button>
        <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-bold text-white/70 backdrop-blur">Academia Financieramente</span>
      </div>

      {profile?.email && (
        <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-full bg-black/45 px-3 py-1 text-[11px] font-bold text-white/70 backdrop-blur">
          {profile.email} · {profile.id.slice(0, 8)}
        </div>
      )}
    </div>
  )
}

type ResolvedAcademyVideo = {
  provider: 'youtube' | 'external'
  videoId: string | null
  embedUrl: string | null
  thumbnailUrl: string
}

function resolveLessonVideo(lesson: AcademyLesson): ResolvedAcademyVideo {
  const provider = lesson.videoProvider === 'youtube' || lesson.youtubeVideoId || lesson.youtubeUrl ? 'youtube' : 'external'
  const videoId = lesson.youtubeVideoId || extractYoutubeVideoId(lesson.embedUrl || lesson.youtubeUrl || '')
  return {
    provider,
    videoId,
    embedUrl: provider === 'youtube' && videoId ? null : lesson.embedUrl || lesson.youtubeUrl || null,
    thumbnailUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : '/key-visuals/money-flow-01.jpg',
  }
}

function buildControlledYoutubeUrl(videoId: string, loaded: boolean) {
  const origin = typeof window === 'undefined' ? 'https://vortex.financieramentecu.co' : window.location.origin
  const params = new URLSearchParams({
    autoplay: loaded ? '1' : '0',
    controls: '0',
    disablekb: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    cc_load_policy: '0',
    fs: '0',
    playsinline: '1',
    enablejsapi: '1',
    origin,
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

function extractYoutubeVideoId(url: string) {
  return url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube(?:-nocookie)?\.com\/embed\/)([a-zA-Z0-9_-]{6,})/)?.[1] || null
}
