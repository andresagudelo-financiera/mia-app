'use client'


import Link from 'next/link'
import type { ElementType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Activity, Calculator, Clock, Users } from 'lucide-react'
import { adminApi } from '@/services/api/admin.api'
import type { AdminUserSummary, Simulator } from '@/types/rentabilidad'
import StatusBadge from '@/components/admin/StatusBadge'
import { formatDate } from '@/lib/formatters'

export default function AdminHomePage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [simulators, setSimulators] = useState<Simulator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        const [usersData, simulatorsData] = await Promise.all([
          adminApi.listUsers({ role: 'all', status: 'all' }),
          adminApi.listSimulators(),
        ])
        if (!active) return
        setUsers(usersData || [])
        setSimulators(simulatorsData || [])
        setError(null)
      } catch {
        if (active) setError('No se pudo cargar el panel admin. Verifica que el backend GraphQL tenga las queries admin habilitadas.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const stats = useMemo(() => {
    const activeUsers = users.filter(u => (u.status || 'active') === 'active' || u.status === 'paid').length
    const demoUsers = users.filter(u => u.status === 'demo' || u.accesses?.some(a => a.accessType === 'demo' && a.status === 'active')).length
    const activeSimulators = simulators.filter(s => s.status === 'active').length
    const pdfs = users.reduce((sum, u) => sum + (u.pdfDownloadCount || 0), 0)
    return { activeUsers, demoUsers, activeSimulators, pdfs }
  }, [users, simulators])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-3xl font-bold text-mia-cream">Resumen operativo</h2>
        <p className="max-w-2xl text-sm text-neutral">
          Vista rápida de usuarios, demos, simuladores activos y señales de uso del simulador.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-mf-orange/30 bg-mf-orange/10 p-4 text-sm text-mf-orange">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Usuarios registrados" value={loading ? '…' : users.length.toString()} />
        <StatCard icon={Activity} label="Usuarios activos/pago" value={loading ? '…' : stats.activeUsers.toString()} />
        <StatCard icon={Clock} label="Demos activos" value={loading ? '…' : stats.demoUsers.toString()} />
        <StatCard icon={Calculator} label="Simuladores activos" value={loading ? '…' : stats.activeSimulators.toString()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-2xl border border-mia-border overflow-hidden">
          <div className="flex items-center justify-between border-b border-mia-border px-5 py-4">
            <h3 className="font-heading font-semibold text-mia-cream">Últimos usuarios</h3>
            <Link href="/admin/usuarios" className="text-sm font-semibold text-mf-coral hover:opacity-80">Ver todos</Link>
          </div>
          <div className="divide-y divide-mia-border">
            {users.slice(0, 6).map(user => (
              <Link key={user.id} href={`/admin/usuarios/${user.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-mia-surface/40">
                <div>
                  <p className="font-medium text-mia-cream">{user.name}</p>
                  <p className="text-xs text-neutral">{user.email}</p>
                </div>
                <div className="text-right">
                  <StatusBadge value={user.status || 'active'} />
                  <p className="mt-1 text-xs text-neutral">{user.registeredAt ? formatDate(user.registeredAt) : '—'}</p>
                </div>
              </Link>
            ))}
            {!loading && users.length === 0 && <EmptyRow text="No hay usuarios para mostrar." />}
          </div>
        </section>

        <section className="glass rounded-2xl border border-mia-border overflow-hidden">
          <div className="flex items-center justify-between border-b border-mia-border px-5 py-4">
            <h3 className="font-heading font-semibold text-mia-cream">Simuladores</h3>
            <Link href="/admin/simuladores" className="text-sm font-semibold text-mf-coral hover:opacity-80">Configurar</Link>
          </div>
          <div className="divide-y divide-mia-border">
            {simulators.slice(0, 6).map(sim => (
              <div key={sim.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-medium text-mia-cream">{sim.name}</p>
                  <p className="text-xs text-neutral">/{sim.slug}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <StatusBadge value={sim.status} />
                  <StatusBadge value={sim.accessType} />
                </div>
              </div>
            ))}
            {!loading && simulators.length === 0 && <EmptyRow text="No hay simuladores configurados." />}
          </div>
        </section>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl border border-mia-border p-5">
      <div className="mb-4 inline-flex rounded-xl bg-mf-coral/10 p-2 text-mf-coral">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-3xl font-heading font-bold text-mia-cream">{value}</p>
      <p className="mt-1 text-sm text-neutral">{label}</p>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-5 py-8 text-center text-sm text-neutral">{text}</div>
}
