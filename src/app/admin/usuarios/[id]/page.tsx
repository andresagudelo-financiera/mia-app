'use client'


import Link from 'next/link'
import type { ElementType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Activity, ArrowLeft, ArrowRightLeft, CalendarClock, Database, FileText, Plus, RefreshCw, Scissors, Settings, TrendingUp } from 'lucide-react'
import { adminApi } from '@/services/api/admin.api'
import type { AdminUserDetail, Simulator, SimulatorAccessType, UserAccess, UserAccessStatus } from '@/types/rentabilidad'
import StatusBadge from '@/components/admin/StatusBadge'
import { formatDate, formatRelativeTime } from '@/lib/formatters'

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const userId = params.id
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [simulators, setSimulators] = useState<Simulator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [grantSimulatorId, setGrantSimulatorId] = useState('')
  const [grantAccessType, setGrantAccessType] = useState<SimulatorAccessType>('demo')
  const [grantDays, setGrantDays] = useState(7)
  const [selectedSimulator, setSelectedSimulator] = useState('all')

  const load = async () => {
    try {
      setLoading(true)
      const [detail, sims] = await Promise.all([
        adminApi.getUserDetail(userId),
        adminApi.listSimulators(),
      ])
      setUser(detail)
      setSimulators(sims || [])
      setGrantSimulatorId((sims || [])[0]?.id || '')
      setError(null)
    } catch {
      setError('No se pudo cargar el detalle del usuario. Verifica las queries adminUser/adminSimulators en backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const simulatorSections = buildSimulatorSections(user, simulators)
  const visibleSimulatorSections = selectedSimulator === 'all'
    ? simulatorSections
    : simulatorSections.filter(section => section.slug === selectedSimulator)
  const metrics = useMemo(() => ({
    investments: user?.investmentCount ?? user?.rentabilidadData?.investments?.length ?? 0,
    transactions: user?.transactionCount ?? user?.rentabilidadData?.transactions?.length ?? 0,
    snapshots: user?.snapshotCount ?? user?.rentabilidadData?.snapshots?.length ?? 0,
    pdfs: user?.pdfDownloadCount ?? user?.usageEvents?.filter(e => e.eventName === 'pdf_downloaded').length ?? 0,
  }), [user])

  const grantAccess = async () => {
    if (!grantSimulatorId) return
    const expiresAt = grantAccessType === 'demo'
      ? new Date(Date.now() + grantDays * 24 * 60 * 60 * 1000).toISOString()
      : null
    try {
      await adminApi.grantAccess({
        userId,
        simulatorId: grantSimulatorId,
        accessType: grantAccessType,
        status: 'active',
        expiresAt,
        notes: grantAccessType === 'demo' ? `Demo de ${grantDays} días asignado desde admin.` : 'Acceso asignado desde admin.',
      })
      await load()
    } catch {
      alert('No se pudo asignar el acceso.')
    }
  }

  const updateAccessStatus = async (access: UserAccess, status: UserAccessStatus) => {
    try {
      if (status === 'revoked') {
        await adminApi.revokeAccess(userId, access.toolName || access.simulatorSlug || access.simulatorId || 'rentabilidad')
      } else {
        await adminApi.grantAccess({
          userId,
          simulatorId: access.toolName || access.simulatorSlug || access.simulatorId || 'rentabilidad',
          accessType: access.accessType,
          status,
          expiresAt: access.expiresAt,
        })
      }
      await load()
    } catch {
      alert('No se pudo actualizar el acceso.')
    }
  }

  if (loading) return <div className="py-16 text-center text-neutral">Cargando usuario…</div>

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Link href="/admin/usuarios" className="inline-flex items-center gap-2 text-sm text-mf-coral"><ArrowLeft className="h-4 w-4" /> Volver</Link>
        <div className="rounded-2xl border border-mf-orange/30 bg-mf-orange/10 p-5 text-sm text-mf-orange">{error || 'Usuario no encontrado.'}</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Link href="/admin/usuarios" className="inline-flex items-center gap-2 text-sm font-semibold text-mf-coral hover:opacity-80"><ArrowLeft className="h-4 w-4" /> Usuarios</Link>

      <section className="glass rounded-2xl border border-mia-border p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge value={user.role || 'user'} />
              <StatusBadge value={user.status || 'active'} />
            </div>
            <h2 className="font-heading text-3xl font-bold text-mia-cream">{user.name}</h2>
            <p className="text-sm text-neutral">{user.email} {user.phone ? `· ${user.phone}` : ''}</p>
            <p className="mt-2 text-xs text-neutral/70">ID: {user.id}</p>
          </div>
          <div className="grid gap-2 text-sm text-neutral sm:grid-cols-2 md:text-right">
            <p>Registro: <span className="text-mia-cream">{user.registeredAt ? formatDate(user.registeredAt) : '—'}</span></p>
            <p>Último acceso: <span className="text-mia-cream">{user.lastSeenAt ? formatRelativeTime(user.lastSeenAt) : '—'}</span></p>
            <p>Moneda base: <span className="text-mia-cream">{user.baseCurrency}</span></p>
            <p>Onboarding: <span className="text-mia-cream">{user.hasCompletedOnboarding ? 'Completo' : 'Pendiente'}</span></p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Database} label="Inversiones" value={metrics.investments} />
        <Metric icon={RefreshCw} label="Transacciones" value={metrics.transactions} />
        <Metric icon={CalendarClock} label="Cortes" value={metrics.snapshots} />
        <Metric icon={FileText} label="PDFs" value={metrics.pdfs} />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="font-heading text-2xl font-bold text-mia-cream">Simuladores usados por este usuario</h3>
            <p className="text-sm text-neutral">
              Se detectan por accesos asignados y por información guardada con este correo/usuario.
            </p>
          </div>
          <label className="min-w-[260px] space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral">Filtrar por simulador</span>
            <select
              value={selectedSimulator}
              onChange={event => setSelectedSimulator(event.target.value)}
              className="w-full rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream outline-none focus:border-mf-coral"
            >
              <option value="all">Todos los simuladores usados</option>
              {simulatorSections.map(section => (
                <option key={section.slug} value={section.slug}>{section.title}</option>
              ))}
            </select>
          </label>
        </div>
        {visibleSimulatorSections.map(section => (
          <CalculatorResponses
            key={section.slug}
            title={section.title}
            slug={section.slug}
            data={section.data}
            access={section.access}
          />
        ))}
        {simulatorSections.length === 0 && (
          <div className="glass rounded-2xl border border-mia-border p-8 text-center text-sm text-neutral">
            Este usuario todavía no tiene simuladores usados ni accesos asignados.
          </div>
        )}
        {simulatorSections.length > 0 && visibleSimulatorSections.length === 0 && (
          <div className="glass rounded-2xl border border-mia-border p-8 text-center text-sm text-neutral">
            No hay información para el simulador seleccionado.
          </div>
        )}
      </section>

      <section className="glass rounded-2xl border border-mia-border p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-xl font-bold text-mia-cream">Accesos del usuario</h3>
            <p className="text-sm text-neutral">Asigna demos de 7 días, acceso pago o revoca simuladores.</p>
          </div>
        </div>

        <div className="mb-6 grid gap-3 rounded-2xl border border-mia-border bg-mia-surface/30 p-4 md:grid-cols-[1fr_160px_130px_auto]">
          <select value={grantSimulatorId} onChange={e => setGrantSimulatorId(e.target.value)} className="rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream">
            {simulators.map(sim => <option key={sim.id} value={sim.id}>{sim.name}</option>)}
          </select>
          <select value={grantAccessType} onChange={e => setGrantAccessType(e.target.value as SimulatorAccessType)} className="rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream">
            <option value="demo">demo</option>
            <option value="paid">paid</option>
            <option value="free">free</option>
            <option value="admin_only">admin_only</option>
          </select>
          <input type="number" min={1} value={grantDays} onChange={e => setGrantDays(Number(e.target.value))} disabled={grantAccessType !== 'demo'} className="rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream disabled:opacity-40" />
          <button onClick={grantAccess} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf px-4 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50" disabled={!grantSimulatorId}>
            <Plus className="h-4 w-4" /> Asignar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-mia-surface/50 text-xs uppercase text-neutral">
              <tr>
                <th className="px-4 py-3 text-left">Simulador</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Expira</th>
                <th className="px-4 py-3 text-left">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mia-border">
              {(user.accesses || []).map(access => (
                <tr key={access.id}>
                  <td className="px-4 py-4 text-mia-cream">{access.simulatorName || access.toolName || access.simulatorSlug || 'Simulador'}</td>
                  <td className="px-4 py-4"><StatusBadge value={access.accessType} /></td>
                  <td className="px-4 py-4"><StatusBadge value={access.status} /></td>
                  <td className="px-4 py-4 text-neutral">{access.expiresAt ? formatDate(access.expiresAt) : 'Sin expiración'}</td>
                  <td className="px-4 py-4">
                    <select value={access.status} onChange={e => updateAccessStatus(access, e.target.value as UserAccessStatus)} className="rounded-lg border border-mia-border bg-mia-surface px-2 py-1 text-xs text-mia-cream">
                      <option value="active">active</option>
                      <option value="expired">expired</option>
                      <option value="revoked">revoked</option>
                    </select>
                  </td>
                </tr>
              ))}
              {(user.accesses || []).length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-neutral">Este usuario aún no tiene accesos asignados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl border border-mia-border p-6">
          <h3 className="mb-4 font-heading text-xl font-bold text-mia-cream">Uso reciente</h3>
          <div className="space-y-3">
            {(user.usageEvents || []).slice(0, 12).map(event => (
              <div key={event.id} className="rounded-xl border border-mia-border bg-mia-surface/30 p-3">
                <p className="font-medium text-mia-cream">{event.eventName}</p>
                <p className="text-xs text-neutral">{formatRelativeTime(event.createdAt)} · {event.simulatorSlug || 'mia'}</p>
              </div>
            ))}
            {(user.usageEvents || []).length === 0 && <p className="text-sm text-neutral">Sin eventos de uso registrados.</p>}
          </div>
        </div>

        <div className="glass rounded-2xl border border-mia-border p-6">
          <h3 className="mb-4 font-heading text-xl font-bold text-mia-cream">Resumen de simuladores</h3>
          <div className="space-y-3 text-sm text-neutral">
            {simulatorSections.map(section => (
              <div key={section.slug} className="rounded-xl border border-mia-border bg-mia-surface/30 p-3">
                <p className="font-medium text-mia-cream">{section.title}</p>
                <p className="text-xs text-neutral">
                  {section.hasData ? 'Con información guardada' : 'Sin respuestas guardadas'}
                  {section.data?.lastUpdated ? ` · ${formatRelativeTime(section.data.lastUpdated)}` : ''}
                </p>
              </div>
            ))}
            {simulatorSections.length === 0 && <p className="text-sm text-neutral">Sin simuladores registrados.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: ElementType; label: string; value: number }) {
  return (
    <div className="glass rounded-2xl border border-mia-border p-5">
      <Icon className="mb-3 h-5 w-5 text-mf-coral" />
      <p className="font-heading text-3xl font-bold text-mia-cream">{value}</p>
      <p className="text-sm text-neutral">{label}</p>
    </div>
  )
}


type SimulatorSection = {
  slug: string
  title: string
  data: any
  access?: UserAccess
  hasData: boolean
}

function buildSimulatorSections(user: AdminUserDetail | null, simulators: Simulator[]): SimulatorSection[] {
  if (!user) return []

  const bySlug = new Map<string, SimulatorSection>()

  const addSection = (slug: string, input: Partial<SimulatorSection>) => {
    const normalizedSlug = normalizeSimulatorSlug(slug)
    const simulator = simulators.find(item => normalizeSimulatorSlug(item.slug || item.id) === normalizedSlug)
    const current = bySlug.get(normalizedSlug)
    bySlug.set(normalizedSlug, {
      slug: normalizedSlug,
      title: input.title || current?.title || simulator?.name || getSimulatorTitle(normalizedSlug),
      data: input.data ?? current?.data ?? null,
      access: input.access ?? current?.access,
      hasData: Boolean(input.hasData ?? current?.hasData),
    })
  }

  ;(user.accesses || []).forEach(access => {
    const slug = access.toolName || access.simulatorSlug || access.simulatorId
    if (!slug) return
    addSection(slug, {
      title: access.simulatorName,
      access,
      hasData: Boolean(access.notes),
    })
  })

  if (user.rentabilidadData) {
    addSection('rentabilidad', {
      title: 'Calculadora de Rentabilidad',
      data: user.rentabilidadData,
      hasData: hasSimulatorData(user.rentabilidadData),
    })
  }

  return Array.from(bySlug.values()).sort((a, b) => Number(b.hasData) - Number(a.hasData) || a.title.localeCompare(b.title))
}

function normalizeSimulatorSlug(value: string) {
  return value.toLowerCase().trim()
}

function getSimulatorTitle(slug: string) {
  if (slug === 'rentabilidad') return 'Calculadora de Rentabilidad'
  return slug.replace(/[-_]/g, ' ').replace(/\w/g, char => char.toUpperCase())
}

function hasSimulatorData(data: any) {
  return Boolean(
    data?.config ||
    (Array.isArray(data?.investments) && data.investments.length > 0) ||
    (Array.isArray(data?.transactions) && data.transactions.length > 0) ||
    (Array.isArray(data?.snapshots) && data.snapshots.length > 0),
  )
}

function CalculatorResponses({
  title,
  slug,
  data,
  access,
}: {
  title: string
  slug: string
  data: any
  access?: UserAccess
}) {
  const config = data?.config || {}
  const investments = Array.isArray(data?.investments) ? data.investments : []
  const transactions = Array.isArray(data?.transactions) ? data.transactions : []
  const snapshots = Array.isArray(data?.snapshots) ? data.snapshots : []
  const hasResponses = investments.length > 0 || transactions.length > 0 || snapshots.length > 0 || Boolean(data?.config)

  return (
    <section className="glass rounded-2xl border border-mia-border p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge value={slug} />
            {access?.accessType && <StatusBadge value={access.accessType} />}
            {access?.status && <StatusBadge value={access.status} />}
          </div>
          <h3 className="font-heading text-2xl font-bold text-mia-cream">Respuestas y actividad por calculadora</h3>
          <p className="mt-1 text-sm text-neutral">
            {title}: configuración, respuestas capturadas y movimientos guardados por autosync.
          </p>
        </div>
        <div className="rounded-xl border border-mia-border bg-mia-surface/40 px-4 py-3 text-xs text-neutral md:text-right">
          <p>Última actualización</p>
          <p className="font-semibold text-mia-cream">{data?.lastUpdated ? formatRelativeTime(data.lastUpdated) : 'Sin datos'}</p>
          {access?.expiresAt && <p className="mt-1">Expira: {formatDate(access.expiresAt)}</p>}
        </div>
      </div>

      {!hasResponses ? (
        <div className="rounded-2xl border border-mia-border bg-mia-surface/30 p-8 text-center text-sm text-neutral">
          Este usuario todavía no tiene respuestas guardadas para esta calculadora.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <ResponseMetric icon={Settings} label="Moneda base" value={config.baseCurrency || '—'} />
            <ResponseMetric icon={TrendingUp} label="Inversiones" value={investments.length} />
            <ResponseMetric icon={ArrowRightLeft} label="Flujos" value={transactions.length} />
            <ResponseMetric icon={Scissors} label="Cortes" value={snapshots.length} />
          </div>

          <AdminDataTable
            title="A · Inversiones registradas"
            empty="Sin inversiones registradas."
            columns={["Nombre", "Pilar", "Entidad", "Moneda", "Monto", "Creación"]}
            rows={investments.map((investment: any) => [
              investment.name || '—',
              investment.pilar || '—',
              investment.entity || '—',
              investment.currency || config.baseCurrency || '—',
              formatAmount(investment.amount, investment.currency || config.baseCurrency),
              investment.createdAt ? formatDate(investment.createdAt) : '—',
            ])}
          />

          <AdminDataTable
            title="B · Respuestas de entradas y salidas"
            empty="Sin transacciones registradas."
            columns={["Fecha", "Inversión", "Entidad", "Monto", "TRM", "Nota"]}
            rows={transactions.map((transaction: any) => [
              transaction.date ? formatDate(transaction.date) : '—',
              transaction.investmentName || '—',
              transaction.entity || '—',
              formatAmount(transaction.amountLocal ?? transaction.amount, transaction.currency || config.baseCurrency),
              transaction.trm ? formatAmount(transaction.trm, 'COP') : '—',
              transaction.note || transaction.description || '—',
            ])}
          />

          <AdminDataTable
            title="C · Respuestas de cortes / valores actuales"
            empty="Sin cortes registrados."
            columns={["Fecha corte", "Inversión", "Valor local", "Valor USD", "TRM corte"]}
            rows={snapshots.map((snapshot: any) => [
              snapshot.cutDate || snapshot.date ? formatDate(snapshot.cutDate || snapshot.date) : '—',
              snapshot.investmentName || '—',
              formatAmount(snapshot.valueLocal ?? snapshot.totalValue, config.baseCurrency),
              snapshot.valueUSD !== undefined ? formatAmount(snapshot.valueUSD, 'USD') : '—',
              snapshot.trmCut ? formatAmount(snapshot.trmCut, 'COP') : '—',
            ])}
          />
        </div>
      )}
    </section>
  )
}

function ResponseMetric({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-mia-border bg-mia-surface/30 p-4">
      <Icon className="mb-3 h-5 w-5 text-mf-coral" />
      <p className="font-heading text-2xl font-bold text-mia-cream">{value}</p>
      <p className="text-xs text-neutral">{label}</p>
    </div>
  )
}

function AdminDataTable({
  title,
  empty,
  columns,
  rows,
}: {
  title: string
  empty: string
  columns: string[]
  rows: Array<Array<React.ReactNode>>
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-mia-border">
      <div className="flex items-center gap-2 border-b border-mia-border bg-mia-surface/40 px-4 py-3">
        <Activity className="h-4 w-4 text-mf-coral" />
        <h4 className="font-heading text-sm font-bold text-mia-cream">{title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-mia-surface/30 text-xs uppercase text-neutral">
            <tr>
              {columns.map(column => <th key={column} className="px-4 py-3 text-left">{column}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-mia-border">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-neutral first:text-mia-cream">{cell}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-neutral">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatAmount(value: unknown, currency?: string) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(numeric)} ${currency || ''}`.trim()
}
