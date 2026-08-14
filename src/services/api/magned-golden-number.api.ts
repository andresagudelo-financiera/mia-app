type MagnedSnapshot = { input?: unknown; status?: string } | null

type ApiPayload = { simulatorResponse?: MagnedSnapshot; result?: unknown; error?: string }

async function request(path: string, init?: RequestInit): Promise<ApiPayload> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null) as ApiPayload | null
  if (!response.ok) throw new Error(payload?.error || 'No pudimos guardar tu avance.')
  return payload || {}
}

/**
 * Browser-facing anonymous-session adapter. The server route owns the opaque cookie;
 * neither user ids nor anonymous ids are ever exposed to the browser.
 */
export const magnedGoldenNumberApi = {
  async getSnapshot() { return (await request('/api/magned/numero-dorado')).simulatorResponse || null },
  async reset() {
    const payload = await request('/api/magned/numero-dorado', { method: 'POST', body: JSON.stringify({ action: 'reset' }) })
    if (!payload.simulatorResponse) throw new Error('No pudimos reiniciar esta simulación.')
    return payload.simulatorResponse
  },
  async save(input: unknown, status: 'draft' | 'completed') {
    const payload = await request('/api/magned/numero-dorado', { method: 'POST', body: JSON.stringify({ action: 'save', input, status }) })
    if (!payload.simulatorResponse) throw new Error('No pudimos guardar tu avance.')
    return payload.simulatorResponse
  },
  async calculate(input: unknown) {
    const payload = await request('/api/magned/numero-dorado', { method: 'POST', body: JSON.stringify({ action: 'calculate', input }) })
    if (!payload.result) throw new Error('No pudimos calcular tu número dorado.')
    return payload.result
  },
  async saveContact(contact: { email: string; phone: string; country?: string }) {
    // Contact details are required to save the requested plan, but marketing consent
    // is not collected on this form and must never be inferred.
    return request('/api/magned/numero-dorado', { method: 'POST', body: JSON.stringify({ action: 'contact', contact }) })
  },
  async downloadPdf(plan: unknown) {
    const response = await fetch('/api/magned/numero-dorado/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) })
    if (!response.ok) throw new Error('No pudimos generar tu PDF.')
    return response.blob()
  },
}
