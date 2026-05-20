export const MIA_API_URL = process.env.MIA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql'

export const ACADEMY_COURSE_FIELDS = `
  id
  key
  slug
  title
  description
  status
  accessType
  level
  coverImageUrl
  estimatedMinutes
  publishedAt
  metadata
  createdAt
  updatedAt
  access { hasAccess reason accessType expiresAt lockedMessage }
  progress { enrollmentId status progressPercent completedLessons totalLessons startedAt completedAt lastActivityAt }
  modules {
    id courseId title description moduleOrder status unlockRule unlocksAt isUnlocked lockedReason metadata createdAt updatedAt
    lessons {
      id courseId moduleId slug title description lessonType lessonOrder status accessType isDemo isLive videoProvider youtubeVideoId youtubeUrl embedUrl liveStartsAt liveEndsAt replayAvailable durationSeconds linkedSimulatorKey linkedChallengeKey isUnlocked lockedReason metadata createdAt updatedAt
      progress { id status progressPercent lastPositionSeconds startedAt completedAt lastActivityAt }
      resources { id lessonId title resourceType url resourceOrder metadata }
    }
  }
`

export async function postGraphQL<T>(query: string, variables: Record<string, unknown>) {
  let response: Response
  try {
    response = await fetch(MIA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
    })
  } catch {
    throw new Error(`MIA API no está disponible en ${MIA_API_URL}. Enciende Docker/backend y ejecuta el seed de Academia.`)
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.errors?.length) {
    throw new Error(payload?.errors?.[0]?.message || 'MIA API no respondió correctamente.')
  }
  return payload.data as T
}
