'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { academyApi } from '@/services/api/academy.api'
import { useUserStore } from '@/stores/user.store'
import type { AcademyLearningPath } from '@/types/rentabilidad'
import DiplomaCard from './DiplomaCard'

export default function DiplomaViewer({ verificationCode }: { verificationCode: string }) {
  const { profile } = useUserStore()
  const [paths, setPaths] = useState<AcademyLearningPath[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    setLoading(true)
    academyApi.listLearningPaths(profile.id)
      .then(setPaths)
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [profile?.id])

  const path = useMemo(() => paths.find(item => item.certificate?.verificationCode === verificationCode), [paths, verificationCode])

  if (loading) return <div className="rounded-3xl border border-mia-border bg-mia-card p-6 text-neutral">Cargando diploma...</div>
  if (error) return <div className="rounded-3xl border border-loss/30 bg-loss/10 p-6 text-loss">{error}</div>
  if (!path?.certificate) {
    return (
      <div className="rounded-3xl border border-mf-orange/30 bg-mf-orange/10 p-8 text-mf-orange">
        <AlertTriangle className="mb-3 h-8 w-8" />
        <h1 className="font-heading text-2xl font-bold">Diploma no encontrado</h1>
        <p className="mt-2 text-sm">No encontramos un diploma emitido para este código con tu usuario. Vuelve a Academia y valida que la ruta esté al 100%.</p>
      </div>
    )
  }

  return <DiplomaCard path={path} studentName={profile?.name} studentEmail={profile?.email} />
}
