import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'

const CHALLENGE_FIELDS = `
  id
  key
  name
  description
  status
  accessType
  startsAt
  endsAt
  metadata
  createdAt
  updatedAt
  progress {
    id
    userId
    challengeKey
    currentStep
    completedSteps
    unlockedSteps
    progressPercent
    completedCount
    totalSteps
    status
    startedAt
    completedAt
    lastActivityAt
  }
  steps {
    id
    challengeKey
    simulatorKey
    title
    description
    stepOrder
    status
    unlockRule
    unlocksAt
    requiredSimulatorKey
    requiredStatus
    isUnlocked
    isCompleted
    lockedReason
    availableAt
    simulator
    metadata
    createdAt
    updatedAt
  }
  stats
`

const GET_CHALLENGE = `
  query Challenge($challengeKey: String!, $userId: String) {
    challenge(challengeKey: $challengeKey, userId: $userId) {
      ${CHALLENGE_FIELDS}
    }
  }
`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const challengeKey = searchParams.get('challengeKey') || 'reto-anti-deuda'
  const userId = searchParams.get('userId') || undefined

  try {
    const response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: GET_CHALLENGE, variables: { challengeKey, userId } }),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || payload?.errors?.length || !payload?.data?.challenge) {
      return NextResponse.json({ error: payload?.errors?.[0]?.message || 'No se pudo cargar el reto.' }, { status: response.ok ? 502 : response.status })
    }

    return NextResponse.json({ challenge: payload.data.challenge })
  } catch {
    return NextResponse.json({ error: 'MIA API no está disponible para cargar retos.' }, { status: 503 })
  }
}
