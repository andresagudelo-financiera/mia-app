'use client'

let isHandlingSessionExpiration = false

export function isMiaSessionExpiredResponse(status: number, message?: string | null) {
  if (status === 401) return true
  if (status !== 403) return false

  const normalized = String(message || '').toLowerCase()
  return [
    'no autorizado',
    'unauthorized',
    'token',
    'sesión',
    'session',
    'permiso',
    'forbidden',
  ].some((fragment) => normalized.includes(fragment))
}

export async function handleMiaSessionExpired() {
  if (typeof window === 'undefined' || isHandlingSessionExpiration) return
  isHandlingSessionExpiration = true

  try {
    await fetch('/api/users/logout', { method: 'POST', cache: 'no-store' }).catch(() => null)
    window.localStorage.removeItem('mia-user')
    window.localStorage.removeItem('mia-desafio-mundial')
    window.dispatchEvent(new Event('mia-session-expired'))
  } finally {
    const currentPath = window.location.pathname + window.location.search
    const target = `/calculadoras?session=expired&next=${encodeURIComponent(currentPath)}`
    window.location.assign(target)
  }
}
