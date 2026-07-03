'use client'

import Link from 'next/link'
import type { ElementType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, Calculator, Clock, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { adminApi } from '@/services/api/admin.api'
import type { AdminUserSummary, Simulator } from '@/types/rentabilidad'
import StatusBadge from '@/components/admin/StatusBadge'
import { formatDate } from '@/lib/formatters'

const CHART_COLORS = ['#FF5A3C', '#FF8A3D', '#F5A623', '#22C55E', '#60A5FA', '#A78BFA']

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

  const dashboard = useMemo(() => buildDashboardData(users, simulators), [users, simulators])

  const stats = useMemo(() => {
    const activeUsers = users.filter(u => (u.status || 'active') === 'active' || u.status === 'paid').length
    const demoUsers = users.filter(u => u.status === 'demo' || u.accesses?.some(a => a.accessType === 'demo' && a.status === 'active')).length
    const activeSimulators = simulators.filter(s => s.status === 'active').length
    const totalUsage = dashboard.usageBySimulator.reduce((sum, item) => sum + item.eventos, 0)
    return { activeUsers, demoUsers, activeSimulators, totalUsage }
  }, [users, simulators, dashboard.usageBySimulator])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-3xl font-bold text-mia-cream">Resumen operativo</h2>
        <p className="max-w-3xl text-sm text-neutral">
          Dashboard de usuarios, accesos, calculadoras activas y señales de uso para tomar decisiones rápidas sobre la plataforma.
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

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardPanel title="Uso por calculadora" subtitle="Usuarios con acceso/respuesta y señales de actividad guardadas.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.usageBySimulator} margin={{ top: 10, right: 12, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.22)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value, name === 'usuarios' ? 'Usuarios' : 'Eventos']} />
                <Bar dataKey="usuarios" name="Usuarios" fill="#FF5A3C" radius={[8, 8, 0, 0]} maxBarSize={42} />
                <Bar dataKey="eventos" name="Eventos" fill="#F5A623" radius={[8, 8, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Usuarios por estado" subtitle="Distribución actual de estados comerciales/acceso.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboard.usersByStatus} dataKey="value" nameKey="name" innerRadius={62} outerRadius={105} paddingAngle={3}>
                  {dashboard.usersByStatus.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend data={dashboard.usersByStatus} />
        </DashboardPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardPanel title="Tipos de acceso" subtitle="Accesos asignados por tipo: free, demo, pago o admin.">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.accessTypes} margin={{ top: 10, right: 12, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.22)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Accesos" radius={[8, 8, 0, 0]} maxBarSize={52}>
                  {dashboard.accessTypes.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Registros recientes" subtitle="Nuevos usuarios registrados en los últimos 8 días.">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.registrations} margin={{ top: 10, right: 12, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.22)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Registros" fill="#22C55E" radius={[8, 8, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass overflow-hidden rounded-2xl border border-mia-border">
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

        <section className="glass overflow-hidden rounded-2xl border border-mia-border">
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

const tooltipStyle = {
  background: 'rgba(20,20,20,0.94)',
  border: '1px solid rgba(255,90,60,0.25)',
  borderRadius: 14,
  color: '#fff',
}

function buildDashboardData(users: AdminUserSummary[], simulators: Simulator[]) {
  const statusLabels: Record<string, string> = {
    active: 'Activos',
    paid: 'Pago',
    demo: 'Demo',
    expired: 'Expirados',
    blocked: 'Bloqueados',
  }

  const usersByStatus = Object.entries(
    users.reduce<Record<string, number>>((acc, user) => {
      const key = user.status || 'active'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}),
  ).map(([key, value]) => ({ name: statusLabels[key] || key, value }))

  const accessTypes = Object.entries(
    users.flatMap(user => user.accesses || []).reduce<Record<string, number>>((acc, access) => {
      const key = access.accessType || 'free'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}),
  ).map(([key, value]) => ({ name: getAccessTypeLabel(key), value }))

  const simulatorNames = new Map<string, string>()
  simulators.forEach(simulator => simulatorNames.set(simulator.slug, simulator.name))
  simulatorNames.set('rentabilidad', simulatorNames.get('rentabilidad') || 'Rentabilidad')
  simulatorNames.set('perfil-riesgo', simulatorNames.get('perfil-riesgo') || 'Perfil Riesgo')
  simulatorNames.set('numero-dorado', simulatorNames.get('numero-dorado') || 'Número Dorado')
  simulatorNames.set('desafio-mundial', simulatorNames.get('desafio-mundial') || 'Reto de Ahorro Mundial')

  const usage = new Map<string, { users: Set<string>; eventos: number }>()
  const ensureUsage = (slug: string) => {
    if (!usage.has(slug)) usage.set(slug, { users: new Set<string>(), eventos: 0 })
    return usage.get(slug)!
  }

  users.forEach(user => {
    ;(user.accesses || []).forEach(access => {
      const slug = access.toolName || access.simulatorSlug || access.simulatorId
      if (!slug) return
      ensureUsage(slug).users.add(user.id)
    })

    ;(user.simulatorResponses || []).forEach(response => {
      const item = ensureUsage(response.simulatorKey)
      item.users.add(user.id)
      item.eventos += response.status === 'completed' ? 1 : 0
    })

    const rentabilidadEvents = (user.investmentCount || 0) + (user.transactionCount || 0) + (user.snapshotCount || 0)
    if (rentabilidadEvents > 0) {
      const item = ensureUsage('rentabilidad')
      item.users.add(user.id)
      item.eventos += rentabilidadEvents
    }

    if (user.worldCupParticipant) {
      const item = ensureUsage('desafio-mundial')
      item.users.add(user.id)
      item.eventos += Array.isArray(user.worldCupSavings) ? user.worldCupSavings.length : 1
    }
  })

  const usageBySimulator = Array.from(simulatorNames.entries()).map(([slug, name]) => {
    const item = usage.get(slug)
    return {
      slug,
      name: shortSimulatorName(name),
      usuarios: item?.users.size || 0,
      eventos: item?.eventos || 0,
    }
  }).filter(item => item.usuarios > 0 || item.eventos > 0 || simulators.some(sim => sim.slug === item.slug))

  const registrations = buildRegistrationsSeries(users)

  return {
    usersByStatus: usersByStatus.length ? usersByStatus : [{ name: 'Sin usuarios', value: 0 }],
    accessTypes: accessTypes.length ? accessTypes : [{ name: 'Sin accesos', value: 0 }],
    usageBySimulator,
    registrations,
  }
}

function buildRegistrationsSeries(users: AdminUserSummary[]) {
  const days = Array.from({ length: 8 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (7 - index))
    const key = date.toISOString().slice(0, 10)
    return { key, name: date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }), value: 0 }
  })

  const byKey = new Map(days.map(day => [day.key, day]))
  users.forEach(user => {
    if (!user.registeredAt) return
    const key = new Date(user.registeredAt).toISOString().slice(0, 10)
    const item = byKey.get(key)
    if (item) item.value += 1
  })

  return days
}

function getAccessTypeLabel(value: string) {
  if (value === 'paid') return 'Pago'
  if (value === 'demo') return 'Demo'
  if (value === 'admin_only') return 'Admin'
  if (value === 'free') return 'Free'
  return value
}

function shortSimulatorName(name: string) {
  return name
    .replace('Calculadora de ', '')
    .replace('Calculadora ', '')
    .replace('Perfil de Riesgo', 'Perfil Riesgo')
}

function DashboardPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl border border-mia-border p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex rounded-xl bg-mf-coral/10 p-2 text-mf-coral">
            <BarChart3 className="h-4 w-4" />
          </div>
          <h3 className="font-heading text-xl font-bold text-mia-cream">{title}</h3>
          <p className="mt-1 text-sm text-neutral">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function ChartLegend({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      {data.map((item, index) => (
        <div key={item.name} className="flex items-center justify-between rounded-xl border border-mia-border bg-mia-surface/30 px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-2 text-neutral">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
            {item.name}
          </span>
          <span className="font-bold text-mia-cream">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl border border-mia-border p-5">
      <div className="mb-4 inline-flex rounded-xl bg-mf-coral/10 p-2 text-mf-coral">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-heading text-3xl font-bold text-mia-cream">{value}</p>
      <p className="mt-1 text-sm text-neutral">{label}</p>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-5 py-8 text-center text-sm text-neutral">{text}</div>
}
