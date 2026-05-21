'use client'

import { useEffect } from 'react'
import Clarity from '@microsoft/clarity'

declare global {
  interface Window {
    __miaClarityInitialized?: boolean
  }
}

export default function ClarityProvider({ projectId }: { projectId?: string }) {
  useEffect(() => {
    const normalizedProjectId = projectId?.trim()

    if (!normalizedProjectId || window.__miaClarityInitialized) {
      return
    }

    Clarity.init(normalizedProjectId)
    Clarity.setTag('app', 'mia-app')
    window.__miaClarityInitialized = true
  }, [projectId])

  return null
}
