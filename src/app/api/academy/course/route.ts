import { NextResponse } from 'next/server'
import { isAcademyEnabled } from '@/lib/feature-flags'
import { ACADEMY_COURSE_FIELDS, postGraphQL } from '../graphql'

export const dynamic = 'force-dynamic'

const GET_COURSE = `
  query AcademyCourse($slug: String!, $userId: String) {
    academyCourse(slug: $slug, userId: $userId) { ${ACADEMY_COURSE_FIELDS} }
  }
`

export async function GET(request: Request) {
  if (!isAcademyEnabled()) return NextResponse.json({ error: 'Academia en construcción.' }, { status: 404 })
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const userId = searchParams.get('userId') || undefined
  if (!slug) return NextResponse.json({ error: 'Falta slug del curso.' }, { status: 400 })
  if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión para acceder al curso.' }, { status: 401 })
  try {
    const data = await postGraphQL<{ academyCourse: unknown }>(GET_COURSE, { slug, userId })
    return NextResponse.json({ course: data.academyCourse })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'No se pudo cargar el curso.' }, { status: 503 })
  }
}
