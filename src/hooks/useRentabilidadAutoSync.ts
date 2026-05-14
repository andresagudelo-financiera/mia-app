'use client'

import { useEffect, useRef } from 'react'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'

type UseRentabilidadAutoSyncOptions = {
  enabled: boolean
  userId?: string
  debounceMs?: number
}

export function useRentabilidadAutoSync({
  enabled,
  userId,
  debounceMs = 1200,
}: UseRentabilidadAutoSyncOptions) {
  const lastUpdated = useRentabilidadStore(s => s.lastUpdated)
  const syncWithBackend = useRentabilidadStore(s => s.syncWithBackend)
  const lastSyncedVersionRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !userId || !lastUpdated) return

    if (lastSyncedVersionRef.current === lastUpdated) return

    const versionToSync = lastUpdated
    const timer = window.setTimeout(async () => {
      try {
        await syncWithBackend(userId)
        lastSyncedVersionRef.current = versionToSync
      } catch (error) {
        console.error('Rentabilidad auto-sync failed:', error)
      }
    }, debounceMs)

    return () => window.clearTimeout(timer)
  }, [debounceMs, enabled, lastUpdated, syncWithBackend, userId])
}
