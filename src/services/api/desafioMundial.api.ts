import type { DesafioMundialProfile } from '@/stores/desafioMundial.store'

export const desafioMundialApi = {
  async register(profile: DesafioMundialProfile): Promise<{ userId?: string }> {
    try {
      const response = await fetch('/api/desafio-mundial/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
        cache: 'no-store',
      })
      const data = await response.json().catch(() => ({}))
      return { userId: data.userId ?? undefined }
    } catch {
      return {}
    }
  },

  async registrarAporte(params: { email: string; nombre: string; fecha: string; userId?: string }): Promise<void> {
    try {
      await fetch('/api/desafio-mundial/aporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        cache: 'no-store',
      })
    } catch {
      // fire and forget — localStorage is source of truth
    }
  },
}
