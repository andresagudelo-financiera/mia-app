import type { Challenge } from '@/types/rentabilidad'

export const challengesApi = {
  async getChallenge(challengeKey: string, userId?: string) {
    const params = new URLSearchParams({ challengeKey })
    if (userId) params.set('userId', userId)
    const response = await fetch(`/api/challenges?${params.toString()}`, { cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el reto.')
    return payload.challenge as Challenge
  },
}
