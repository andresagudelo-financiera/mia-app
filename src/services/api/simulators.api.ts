import { handleMiaSessionExpired, isMiaSessionExpiredResponse } from '@/lib/session-expiration'

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
  result?: any
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
    if (isMiaSessionExpiredResponse(response.status, payload?.error)) {
      await handleMiaSessionExpired()
    }
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

  async getGoldenNumberV2() {
    const payload = await requestSimulatorResponse('/api/simulators/response?simulatorKey=numero-dorado-v2')
    return payload.simulatorResponse ?? null
  },

  async saveGoldenNumberV2(
    inputOrLegacyUserId: unknown,
    inputOrStatus?: unknown | 'draft' | 'completed',
    legacyStatus?: 'draft' | 'completed',
  ) {
    // Accept the prior (userId, input, status) signature while identity is now cookie-bound.
    const input = typeof inputOrLegacyUserId === 'string' && inputOrStatus && typeof inputOrStatus === 'object'
      ? inputOrStatus
      : inputOrLegacyUserId
    const status = (typeof inputOrLegacyUserId === 'string' && inputOrStatus && typeof inputOrStatus === 'object'
      ? legacyStatus
      : inputOrStatus) === 'completed' ? 'completed' : 'draft'
    const payload = await requestSimulatorResponse('/api/simulators/response', { method: 'POST', body: JSON.stringify({ action: 'saveGoldenNumberV2', input, status }) })
    if (!payload.simulatorResponse) throw new Error('No se pudo guardar tu avance.')
    return payload.simulatorResponse
  },

  async downloadGoldenNumberV2Pdf() {
    const response = await fetch('/api/simulators/numero-dorado-v2/pdf', { method: 'POST' })
    if (!response.ok) throw new Error('No se pudo generar tu PDF.')
    return response.blob()
  },

  async calculateGoldenNumberV2(input: unknown) {
    const payload = await requestSimulatorResponse('/api/simulators/response', {
      method: 'POST',
      body: JSON.stringify({ action: 'calculateGoldenNumberV2', input }),
    })

    if (!payload.result) throw new Error('No se pudo calcular el número dorado.')
    return payload.result
  },

  async calculateAntiDebtSimulator(simulatorKey: string, input: unknown) {
    const payload = await requestSimulatorResponse('/api/simulators/response', {
      method: 'POST',
      body: JSON.stringify({ action: 'calculateAntiDebtSimulator', simulatorKey, input }),
    })

    if (!payload.result) {
      throw new Error('No se pudo calcular el simulador anti-deuda.')
    }

    return payload.result
  },

  async saveAntiDebtSimulator(userId: string, simulatorKey: string, input: unknown) {
    const payload = await requestSimulatorResponse('/api/simulators/response', {
      method: 'POST',
      body: JSON.stringify({ action: 'saveAntiDebtSimulator', userId, simulatorKey, input }),
    })

    if (!payload.simulatorResponse) {
      throw new Error('No se pudo guardar el simulador anti-deuda.')
    }

    return payload.simulatorResponse
  },
}
