import type { AcademyCourse, AcademyLesson, AcademyLearningPath, AcademyQuiz, AcademyQuizAttempt } from '@/types/rentabilidad'

export const academyApi = {
  async listCourses(userId?: string) {
    const params = new URLSearchParams()
    if (userId) params.set('userId', userId)
    const response = await fetch(`/api/academy${params.size ? `?${params.toString()}` : ''}`, { cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la academia.')
    return payload.courses as AcademyCourse[]
  },

  async listLearningPaths(userId?: string) {
    const params = new URLSearchParams()
    if (userId) params.set('userId', userId)
    const response = await fetch(`/api/academy/paths${params.size ? `?${params.toString()}` : ''}`, { cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la carrera.')
    return payload.paths as AcademyLearningPath[]
  },

  async getCourse(slug: string, userId?: string) {
    const params = new URLSearchParams({ slug })
    if (userId) params.set('userId', userId)
    const response = await fetch(`/api/academy/course?${params.toString()}`, { cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el curso.')
    return payload.course as AcademyCourse
  },

  async getLesson(courseSlug: string, lessonSlug: string, userId?: string) {
    const params = new URLSearchParams({ courseSlug, lessonSlug })
    if (userId) params.set('userId', userId)
    const response = await fetch(`/api/academy/lesson?${params.toString()}`, { cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la lección.')
    return payload.lesson as AcademyLesson
  },

  async getQuiz(lessonId: string, userId?: string) {
    const params = new URLSearchParams({ lessonId })
    if (userId) params.set('userId', userId)
    const response = await fetch(`/api/academy/quiz?${params.toString()}`, { cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el quiz.')
    return payload.quiz as AcademyQuiz
  },

  async submitQuizAttempt(input: { userId: string; quizId: string; answers: Record<string, string> }) {
    const response = await fetch('/api/academy/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'No se pudo enviar el quiz.')
    return payload.attempt as AcademyQuizAttempt
  },

  async startCourse(userId: string, courseSlug: string) {
    const response = await fetch('/api/academy/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'startCourse', userId, courseSlug }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'No se pudo iniciar el curso.')
    return payload.course as AcademyCourse
  },

  async trackLessonProgress(input: { userId: string; lessonId: string; progressPercent?: number; lastPositionSeconds?: number; status?: string; eventName?: string }) {
    const response = await fetch('/api/academy/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'trackLessonProgress', ...input }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar el progreso.')
    return payload
  },
}
