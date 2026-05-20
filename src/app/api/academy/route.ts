import { NextResponse } from 'next/server'
import { ACADEMY_COURSE_FIELDS, postGraphQL } from './graphql'

export const dynamic = 'force-dynamic'

const LIST_COURSES = `
  query AcademyCourses($userId: String) {
    academyCourses(userId: $userId) { ${ACADEMY_COURSE_FIELDS} }
  }
`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || undefined
  if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión para acceder a Academia.' }, { status: 401 })
  try {
    const data = await postGraphQL<{ academyCourses: unknown[] }>(LIST_COURSES, { userId })
    return NextResponse.json({ courses: data.academyCourses })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'No se pudo cargar la academia.' }, { status: 503 })
  }
}
