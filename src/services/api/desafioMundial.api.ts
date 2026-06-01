export const desafioMundialApi = {
  async getDashboard(userId: string): Promise<any> {
    try {
      const response = await fetch(`/api/desafio-mundial/response?userId=${encodeURIComponent(userId)}`, {
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))
      return payload.dashboard ?? null
    } catch {
      return null
    }
  },

  async registerParticipant(
    userId: string,
    data: { displayName: string; country: string; phone?: string; email: string }
  ): Promise<any> {
    try {
      // 1. Guardar en base de datos principal (Prisma)
      const dbResponse = await fetch('/api/desafio-mundial/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          userId,
          displayName: data.displayName,
          country: data.country,
          phone: data.phone,
        }),
        cache: 'no-store',
      })
      const dbPayload = await dbResponse.json().catch(() => ({}))

      // 2. Registrar en MIA core y enviar a GHL para remarketing
      await fetch('/api/desafio-mundial/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: data.displayName,
          email: data.email,
          telefono: data.phone,
          pais: data.country,
          bandera: '🌎', // por defecto o procesada
        }),
        cache: 'no-store',
      }).catch(() => null)

      return dbPayload.participant ?? null
    } catch (err) {
      console.error('Error al registrar participante:', err)
      return null
    }
  },

  async logSaving(
    userId: string,
    data: { amount: number; date: string; currency: string; email: string; nombre: string }
  ): Promise<any> {
    try {
      // 1. Guardar en base de datos principal (Prisma)
      const dbResponse = await fetch('/api/desafio-mundial/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logSaving',
          userId,
          amount: data.amount,
          date: data.date,
          currency: data.currency,
        }),
        cache: 'no-store',
      })
      const dbPayload = await dbResponse.json().catch(() => ({}))

      // 2. Enviar evento a GHL
      await fetch('/api/desafio-mundial/aporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          nombre: data.nombre,
          fecha: data.date,
          userId,
          monto: data.amount,
          moneda: data.currency,
        }),
        cache: 'no-store',
      }).catch(() => null)

      return dbPayload.saving ?? null
    } catch (err) {
      console.error('Error al registrar ahorro:', err)
      return null
    }
  },

  async deleteSaving(userId: string, id: string): Promise<boolean> {
    try {
      const response = await fetch('/api/desafio-mundial/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteSaving',
          userId,
          id,
        }),
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))
      return !!payload.success
    } catch {
      return false
    }
  },
}

