import { NextResponse } from 'next/server'
import { isAcademyEnabled } from '@/lib/feature-flags'
import { postGraphQL } from '../graphql'

export const dynamic = 'force-dynamic'

const LIST_PATHS = `query AcademyLearningPaths($userId: String) { academyLearningPaths(userId: $userId) { id key slug title description status accessType courses { courseKey courseOrder title isCompleted } certificate { id title verificationCode issuedAt subjectType subjectKey userId } } }`

export async function GET(request: Request) {
  if (!isAcademyEnabled()) return NextResponse.json({ error: 'Academia en construcción.' }, { status: 404 })
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || undefined
  if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión para acceder a las carreras.' }, { status: 401 })
  try {
    const data = await postGraphQL<{ academyLearningPaths: unknown[] }>(LIST_PATHS, { userId })
    return NextResponse.json({ paths: data.academyLearningPaths })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'No se pudo cargar la carrera.' }, { status: 503 })
  }
}
