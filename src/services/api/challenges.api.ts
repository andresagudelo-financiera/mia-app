import type { Challenge } from '@/types/rentabilidad'

export const challengesApi = {
  async getChallenge(challengeKey: string, userId?: string) {
    const params = new URLSearchParams({ challengeKey })
    if (userId) params.set('userId', userId)
    params.set('ts', String(Date.now()))
    const response = await fetch(`/api/challenges?${params.toString()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el reto.')
    return payload.challenge as Challenge
  },
}
