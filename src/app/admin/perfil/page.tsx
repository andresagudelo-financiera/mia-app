'use client'

import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, Mail, ShieldCheck, UserCircle } from 'lucide-react'
import { adminApi, type SystemAdminUser } from '@/services/api/admin.api'
import StatusBadge from '@/components/admin/StatusBadge'

export default function AdminProfilePage() {
  const { data: session } = useSession()
  const [admin, setAdmin] = useState<SystemAdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadAdminProfile() {
      try {
        setLoading(true)
        const data = await adminApi.me()
        if (!active) return
        setAdmin(data)
        setError(null)
      } catch {
        if (active) setError('No se pudo validar el perfil del administrador con el backend.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadAdminProfile()
    return () => {
      active = false
    }
  }, [])

  const currentAdmin = admin || {
    id: session?.user?.id || '',
    name: session?.user?.name || 'Administrador',
    email: session?.user?.email || '',
    role: session?.user?.role || 'admin',
    isActive: Boolean(session?.user?.isActive),
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-3xl font-bold text-mia-cream">Mi perfil administrador</h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral">
          Perfil de la sesión admin actual. Estos datos se validan contra el MIA API mediante NextAuth.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-mf-orange/30 bg-mf-orange/10 p-4 text-sm text-mf-orange">
          {error}
        </div>
      )}

      <section className="glass overflow-hidden rounded-3xl border border-mia-border">
        <div className="border-b border-mia-border bg-mia-surface/40 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-mf-coral/10 text-mf-coral">
                <UserCircle className="h-9 w-9" />
              </div>
              <div>
                <h3 className="font-heading text-2xl font-bold text-mia-cream">
                  {loading ? 'Cargando perfil…' : currentAdmin.name}
                </h3>
                <p className="text-sm text-neutral">{currentAdmin.email || 'Sin email en sesión'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={currentAdmin.role || 'admin'} />
              <StatusBadge value={currentAdmin.isActive ? 'active' : 'blocked'} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <ProfileField icon={Mail} label="Email" value={currentAdmin.email || '—'} />
          <ProfileField icon={ShieldCheck} label="Rol" value={currentAdmin.role || 'admin'} />
          <ProfileField icon={ShieldCheck} label="Estado" value={currentAdmin.isActive ? 'Administrador activo' : 'Administrador inactivo'} />
          <ProfileField icon={UserCircle} label="ID admin" value={currentAdmin.id || '—'} />
        </div>

        <div className="border-t border-mia-border p-6">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/admin' })}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm font-bold text-loss transition-colors hover:bg-loss/20"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión admin
          </button>
        </div>
      </section>
    </div>
  )
}

function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-mia-border bg-mia-surface/30 p-4">
      <div className="mb-3 flex items-center gap-2 text-mf-coral">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="break-words text-sm font-medium text-mia-cream">{value}</p>
    </div>
  )
}
