import { NextResponse } from 'next/server'
import { postGraphQL } from '../graphql'

export const dynamic = 'force-dynamic'

const GET_LESSON = `
  query AcademyLesson($courseSlug: String!, $lessonSlug: String!, $userId: String) {
    academyLesson(courseSlug: $courseSlug, lessonSlug: $lessonSlug, userId: $userId) {
      id courseId moduleId slug title description lessonType lessonOrder status accessType isDemo isLive videoProvider youtubeVideoId youtubeUrl embedUrl liveStartsAt liveEndsAt replayAvailable durationSeconds linkedSimulatorKey linkedChallengeKey isUnlocked lockedReason metadata createdAt updatedAt
      progress { id status progressPercent lastPositionSeconds startedAt completedAt lastActivityAt }
      resources { id lessonId title resourceType url resourceOrder metadata }
    }
  }
`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const courseSlug = searchParams.get('courseSlug')
  const lessonSlug = searchParams.get('lessonSlug')
  const userId = searchParams.get('userId') || undefined
  if (!courseSlug || !lessonSlug) return NextResponse.json({ error: 'Faltan parámetros de lección.' }, { status: 400 })
  if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión para acceder a la lección.' }, { status: 401 })
  try {
    const data = await postGraphQL<{ academyLesson: unknown }>(GET_LESSON, { courseSlug, lessonSlug, userId })
    return NextResponse.json({ lesson: data.academyLesson })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'No se pudo cargar la lección.' }, { status: 503 })
  }
}
