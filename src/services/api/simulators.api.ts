export type SimulatorResponse = {
  id: string
  userId: string
  simulatorKey: string
  input?: unknown
  result?: any
  status: 'draft' | 'completed' | string
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

type SimulatorApiPayload = {
  simulatorResponse?: SimulatorResponse | null
  error?: string
}

async function requestSimulatorResponse(path: string, init?: RequestInit): Promise<SimulatorApiPayload> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as SimulatorApiPayload | null

  if (!response.ok) {
    throw new Error(payload?.error || 'No se pudo guardar la información del simulador.')
  }

  return payload || {}
}

export const simulatorsApi = {
  async getResponse(userId: string, simulatorKey: string) {
    const params = new URLSearchParams({ userId, simulatorKey })
    const payload = await requestSimulatorResponse(`/api/simulators/response?${params.toString()}`)
    return payload.simulatorResponse ?? null
  },

  async saveRiskProfile(userId: string, input: unknown) {
    const payload = await requestSimulatorResponse('/api/simulators/response', {
      method: 'POST',
      body: JSON.stringify({ action: 'saveRiskProfile', userId, input }),
    })

    if (!payload.simulatorResponse) {
      throw new Error('No se pudo guardar el perfil de riesgo.')
    }

    return payload.simulatorResponse
  },

  async saveGoldenNumber(userId: string, input: unknown) {
    const payload = await requestSimulatorResponse('/api/simulators/response', {
      method: 'POST',
      body: JSON.stringify({ action: 'saveGoldenNumber', userId, input }),
    })

    if (!payload.simulatorResponse) {
      throw new Error('No se pudo guardar el número dorado.')
    }

    return payload.simulatorResponse
  },
}
