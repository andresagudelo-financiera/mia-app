import { NextResponse } from 'next/server'
import { isAcademyEnabled } from '@/lib/feature-flags'
import { postGraphQL } from '../graphql'

export const dynamic = 'force-dynamic'

const GET_QUIZ = `query AcademyQuiz($lessonId: String!) { academyQuiz(lessonId: $lessonId) { id courseId lessonId title description passingScore maxAttempts questions { id quizId questionText questionType options questionOrder points explanation } } }`
const SUBMIT_QUIZ = `mutation SubmitQuiz($userId: String!, $quizId: String!, $answers: JSON!) { submitAcademyQuizAttempt(userId: $userId, quizId: $quizId, answers: $answers) { id quizId userId score passed answers feedback createdAt } }`

export async function GET(request: Request) {
  if (!isAcademyEnabled()) return NextResponse.json({ error: 'Academia en construcción.' }, { status: 404 })
  const { searchParams } = new URL(request.url)
  const lessonId = searchParams.get('lessonId')
  const userId = searchParams.get('userId') || undefined
  if (!lessonId) return NextResponse.json({ error: 'Falta lessonId.' }, { status: 400 })
  if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión para acceder al quiz.' }, { status: 401 })
  try {
    const data = await postGraphQL<{ academyQuiz: unknown }>(GET_QUIZ, { lessonId })
    return NextResponse.json({ quiz: data.academyQuiz })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'No se pudo cargar el quiz.' }, { status: 503 })
  }
}

export async function POST(request: Request) {
  if (!isAcademyEnabled()) return NextResponse.json({ error: 'Academia en construcción.' }, { status: 404 })
  const body = await request.json().catch(() => null)
  if (!body?.userId || !body?.quizId || !body?.answers) return NextResponse.json({ error: 'Datos de quiz incompletos.' }, { status: 400 })
  try {
    const data = await postGraphQL<{ submitAcademyQuizAttempt: unknown }>(SUBMIT_QUIZ, { userId: body.userId, quizId: body.quizId, answers: body.answers })
    return NextResponse.json({ attempt: data.submitAcademyQuizAttempt })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'No se pudo enviar el quiz.' }, { status: 503 })
  }
}
