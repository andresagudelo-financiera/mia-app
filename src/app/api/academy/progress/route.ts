import { NextResponse } from 'next/server'
import { isAcademyEnabled } from '@/lib/feature-flags'
import { ACADEMY_COURSE_FIELDS, postGraphQL } from '../graphql'

export const dynamic = 'force-dynamic'

const START_COURSE = `
  mutation StartAcademyCourse($userId: String!, $courseSlug: String!) {
    startAcademyCourse(userId: $userId, courseSlug: $courseSlug) { ${ACADEMY_COURSE_FIELDS} }
  }
`

const TRACK_LESSON = `
  mutation TrackAcademyLessonProgress($userId: String!, $lessonId: String!, $progressPercent: Float, $lastPositionSeconds: Float, $status: String, $eventName: String) {
    trackAcademyLessonProgress(userId: $userId, lessonId: $lessonId, progressPercent: $progressPercent, lastPositionSeconds: $lastPositionSeconds, status: $status, eventName: $eventName) {
      ok
      progress { id status progressPercent lastPositionSeconds startedAt completedAt lastActivityAt }
    }
  }
`

export async function POST(request: Request) {
  if (!isAcademyEnabled()) return NextResponse.json({ error: 'Academia en construcción.' }, { status: 404 })
  const body = await request.json().catch(() => null)
  if (!body?.action) return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 })
  try {
    if (body.action === 'startCourse') {
      const data = await postGraphQL<{ startAcademyCourse: unknown }>(START_COURSE, { userId: body.userId, courseSlug: body.courseSlug })
      return NextResponse.json({ course: data.startAcademyCourse })
    }
    if (body.action === 'trackLessonProgress') {
      const data = await postGraphQL<{ trackAcademyLessonProgress: unknown }>(TRACK_LESSON, {
        userId: body.userId,
        lessonId: body.lessonId,
        progressPercent: body.progressPercent,
        lastPositionSeconds: body.lastPositionSeconds,
        status: body.status,
        eventName: body.eventName,
      })
      return NextResponse.json(data.trackAcademyLessonProgress)
    }
    return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'No se pudo guardar el progreso.' }, { status: 503 })
  }
}
