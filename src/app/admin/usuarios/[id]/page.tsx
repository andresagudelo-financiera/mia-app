'use client'


import Link from 'next/link'
import { useSession } from 'next-auth/react'
import type { ElementType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Activity, ArrowLeft, ArrowRightLeft, CalendarClock, Database, FileText, Plus, RefreshCw, Scissors, Settings, TrendingUp } from 'lucide-react'
import { adminApi } from '@/services/api/admin.api'
import type { AdminUserDetail, Simulator, SimulatorAccessType, UserAccess, UserAccessStatus } from '@/types/rentabilidad'
import StatusBadge from '@/components/admin/StatusBadge'
import { formatDate, formatRelativeTime } from '@/lib/formatters'

export default function AdminUserDetailPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
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

  const updateAccessType = async (access: UserAccess, accessType: SimulatorAccessType) => {
    try {
      const simulatorId = access.toolName || access.simulatorSlug || access.simulatorId || 'rentabilidad'
      const expiresAt = accessType === 'demo'
        ? access.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null

      await adminApi.grantAccess({
        userId,
        simulatorId,
        accessType,
        status: 'active',
        expiresAt,
        notes: `Tipo de acceso actualizado manualmente a ${accessType} desde admin.`,
      })
      await load()
    } catch {
      alert('No se pudo cambiar el tipo de acceso.')
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
            <p className="text-sm text-neutral">{isAdmin ? 'Asigna, cambia o revoca accesos por calculadora. El acceso pago queda como pago manual hasta integrar pasarela.' : 'Modo coach/MS: consulta accesos sin modificarlos.'}</p>
          </div>
        </div>

        {isAdmin && (
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
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-mia-surface/50 text-xs uppercase text-neutral">
              <tr>
                <th className="px-4 py-3 text-left">Simulador</th>
                <th className="px-4 py-3 text-left">Tipo de acceso</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Expira</th>
                {isAdmin && <th className="px-4 py-3 text-left">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-mia-border">
              {(user.accesses || []).map(access => (
                <tr key={access.id}>
                  <td className="px-4 py-4 text-mia-cream">{access.simulatorName || access.toolName || access.simulatorSlug || 'Simulador'}</td>
                  <td className="px-4 py-4">
                    {isAdmin ? (
                      <select value={access.accessType} onChange={e => updateAccessType(access, e.target.value as SimulatorAccessType)} className="rounded-lg border border-mia-border bg-mia-surface px-2 py-1 text-xs text-mia-cream">
                        <option value="free">free</option>
                        <option value="demo">demo</option>
                        <option value="paid">paid</option>
                        <option value="admin_only">admin_only</option>
                      </select>
                    ) : (
                      <StatusBadge value={access.accessType} />
                    )}
                    {access.accessType === 'paid' && <p className="mt-1 text-[10px] text-neutral">Pago manual</p>}
                  </td>
                  <td className="px-4 py-4"><StatusBadge value={access.status} /></td>
                  <td className="px-4 py-4 text-neutral">{access.expiresAt ? formatDate(access.expiresAt) : 'Sin expiración'}</td>
                  {isAdmin && (
                    <td className="px-4 py-4">
                      <select value={access.status} onChange={e => updateAccessStatus(access, e.target.value as UserAccessStatus)} className="rounded-lg border border-mia-border bg-mia-surface px-2 py-1 text-xs text-mia-cream">
                        <option value="active">active</option>
                        <option value="expired">expired</option>
                        <option value="revoked">revoked</option>
                      </select>
                    </td>
                  )}
                </tr>
              ))}
              {(user.accesses || []).length === 0 && <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-10 text-center text-neutral">Este usuario aún no tiene accesos asignados.</td></tr>}
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

  ;(user.simulatorResponses || []).forEach(response => {
    addSection(response.simulatorKey, {
      data: response,
      hasData: Boolean(response.input || response.result),
    })
  })

  if (user.rentabilidadData) {
    addSection('rentabilidad', {
      title: 'Calculadora de Rentabilidad',
      data: user.rentabilidadData,
      hasData: hasSimulatorData(user.rentabilidadData),
    })
  }

  if (user.worldCupParticipant) {
    addSection('desafio-mundial', {
      title: 'Desafío Mundial 2030 (Reto de Ahorro)',
      data: {
        participant: user.worldCupParticipant,
        savings: user.worldCupSavings || [],
        simulatorKey: 'desafio-mundial',
      },
      hasData: true,
    })
  }

  return Array.from(bySlug.values()).sort((a, b) => Number(b.hasData) - Number(a.hasData) || a.title.localeCompare(b.title))
}

function normalizeSimulatorSlug(value: string) {
  return value.toLowerCase().trim()
}

function getSimulatorTitle(slug: string) {
  if (slug === 'rentabilidad') return 'Calculadora de Rentabilidad'
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function hasSimulatorData(data: any) {
  return Boolean(
    data?.config ||
    data?.input ||
    data?.result ||
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
  const isGenericResponse = Boolean(data?.simulatorKey || data?.input || data?.result) && slug !== 'rentabilidad'
  const hasResponses = investments.length > 0 || transactions.length > 0 || snapshots.length > 0 || Boolean(data?.config) || Boolean(data?.input || data?.result) || slug === 'desafio-mundial'

  if (isGenericResponse) {
    return (
      <section className="glass rounded-2xl border border-mia-border p-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge value={slug} />
              {data?.status && <StatusBadge value={data.status} />}
              {access?.status && <StatusBadge value={access.status} />}
            </div>
            <h3 className="font-heading text-2xl font-bold text-mia-cream">Detalle del lead: respuestas y resultado</h3>
            <p className="mt-1 text-sm text-neutral">{title}: información guardada por el simulador.</p>
          </div>
          <div className="rounded-xl border border-mia-border bg-mia-surface/40 px-4 py-3 text-xs text-neutral md:text-right">
            <p>Última actualización</p>
            <p className="font-semibold text-mia-cream">{data?.updatedAt || data?.participant?.createdAt ? formatRelativeTime(data.updatedAt || data.participant.createdAt) : 'Sin datos'}</p>
            {data?.completedAt && <p className="mt-1">Completado: {formatDate(data.completedAt)}</p>}
          </div>
        </div>
        {!hasResponses ? (
          <div className="rounded-2xl border border-mia-border bg-mia-surface/30 p-8 text-center text-sm text-neutral">
            Este usuario todavía no tiene respuestas guardadas para esta calculadora.
          </div>
        ) : slug === 'numero-dorado' ? (
          <GoldenNumberAdminView data={data} />
        ) : slug === 'perfil-riesgo' ? (
          <RiskProfileAdminView data={data} />
        ) : slug === 'desafio-mundial' ? (
          <WorldCupAdminView data={data} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <JsonPreview title="Respuestas capturadas" value={data.input} />
            <JsonPreview title="Resultado calculado" value={data.result} />
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="glass rounded-2xl border border-mia-border p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge value={slug} />
            {access?.accessType && <StatusBadge value={access.accessType} />}
            {access?.status && <StatusBadge value={access.status} />}
          </div>
          <h3 className="font-heading text-2xl font-bold text-mia-cream">Detalle del lead: respuestas y actividad por calculadora</h3>
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

const RISK_PROFILE_QUESTIONS: Record<string, { label: string; options: Record<string, string> }> = {
  q1: {
    label: 'Horizonte de inversión',
    options: {
      under1: 'Menos de 1 año',
      '1-5': 'Entre 1 y 5 años',
      '5-10': 'Más de 5 años',
    },
  },
  q2: {
    label: 'Reacción si el mercado cae 20%',
    options: {
      low: 'Me preocuparía y vendería rápido',
      medium: 'Mantendría la calma y esperaría',
      high: 'Compraría más aprovechando la caída',
    },
  },
  q3: {
    label: 'Comodidad con productos que fluctúan',
    options: {
      low: 'Muy incómodo, prefiero estabilidad',
      medium: 'Cómodo si tengo información clara',
      high: 'Me gusta asumir riesgo calculado',
    },
  },
  q4: {
    label: 'Tiempo dedicado a investigar inversiones',
    options: {
      low: 'Poco, prefiero que alguien me guíe',
      medium: 'Algunas horas para estar informado',
      high: 'Bastante, quiero entender detalles',
    },
  },
  q5: {
    label: 'Reacción si una inversión cae 30%',
    options: {
      low: 'Vendo para evitar más pérdidas',
      medium: 'Mantengo la estrategia',
      high: 'Compro más si la tesis sigue vigente',
    },
  },
}

function RiskProfileAdminView({ data }: { data: any }) {
  const inputAnswers = data?.input?.answers || data?.result?.answers || {}
  const result = data?.result || {}
  const level = result?.level || {}
  const score = result?.scoreLabel || (result?.score ? `${result.score}/15` : '—')
  const range = getRiskRange(level?.key)

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl border border-mf-coral/30 bg-gradient-to-br from-mf-coral/15 via-mia-surface/40 to-mia-surface p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-mf-coral">Perfil del usuario</p>
          <h4 className="mt-3 font-heading text-4xl font-black text-mia-cream">{level?.label || 'Sin perfil'}</h4>
          <div className="mt-4 inline-flex rounded-full border border-mf-coral/30 bg-mf-coral/10 px-4 py-2 text-sm font-bold text-mf-coral">
            Score: {score} {range !== '—' ? `· ${range}` : ''}
          </div>
          <p className="mt-5 text-sm leading-relaxed text-neutral">{level?.description || 'Sin recomendación guardada.'}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <AdminResultMetric label="Preguntas respondidas" value={`${result?.answered ?? 0}/${result?.totalQuestions ?? 5}`} />
          <AdminResultMetric label="Nivel" value={level?.label || '—'} />
          <AdminResultMetric label="Rango" value={range} />
        </div>
      </div>

      <ReadableKeyValueTable
        title="Respuestas del cuestionario"
        entries={Object.entries(RISK_PROFILE_QUESTIONS).map(([key, question]) => [
          question.label,
          question.options[String(inputAnswers?.[key] || '')] || 'Sin respuesta',
        ])}
      />
    </div>
  )
}

function getRiskRange(key?: string) {
  if (key === 'conservador') return '4.0 – 6.9%'
  if (key === 'moderado') return '7.0 – 8.9%'
  if (key === 'agresivo') return '9.0 – 13.9%'
  if (key === 'arriesgado') return '≥ 14.0%'
  return '—'
}

const GOLDEN_NUMBER_LABELS: Record<string, string> = {
  age: 'Edad actual',
  currency: 'Moneda',
  retirementAge: 'Edad de retiro',
  lifeExpectancy: 'Esperanza de vida',
  desiredPostRetirementIncome: 'Ingreso anual deseado en retiro',
  otherIncomeSources: 'Otros ingresos anuales esperados',
  estimatedInflation: 'Inflación anual estimada',
  expectedReturnRate: 'Rentabilidad esperada anual',
  netReturn: 'Rentabilidad neta objetivo',
  totalSavings: 'Ahorro actual',
  monthlyLivingCost: 'Gasto mensual actual',
  annualExpenses: 'Gastos anuales extra',
  riskScore: 'Score/rentabilidad de referencia',
}

function GoldenNumberAdminView({ data }: { data: any }) {
  const input = data?.input || data?.result?.input || {}
  const result = data?.result || {}
  const results = result?.results || {}
  const assumptions = result?.assumptions || {}
  const currency = input.currency || 'COP'
  const goldenNumber = results.goldenNumber

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/60 bg-[radial-gradient(circle_at_18%_8%,rgba(255,230,150,0.62),transparent_30%),linear-gradient(135deg,#fff8df_0%,#f7e6a4_40%,#c8942e_100%)] p-6 shadow-xl shadow-[#D4AF37]/15">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/30 blur-3xl" />
          <p className="relative text-xs font-black uppercase tracking-[0.28em] text-[#7A4E00]">Número Dorado del usuario</p>
          <p className="relative mt-4 whitespace-nowrap font-sans text-[clamp(1.5rem,4vw,3.1rem)] font-black leading-none tracking-[-0.07em] text-[#201506] [font-variant-numeric:tabular-nums]">
            {formatMoney(goldenNumber, currency)}
          </p>
          <p className="relative mt-4 max-w-xl text-sm font-medium leading-relaxed text-[#5F4A16]">
            Capital objetivo estimado para sostener su retiro según las respuestas guardadas.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <AdminResultMetric label="Total aportado (Bolsillo)" value={formatMoney(results.totalOutPocket, currency)} />
          <AdminResultMetric label="Rendimientos generados" value={formatMoney(results.totalReturns, currency)} />
          <AdminResultMetric label="Ahorro mensual sugerido" value={formatMoney(results.monthlySavingsWithReturn, currency)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReadableKeyValueTable
          title="Supuestos ingresados"
          entries={Object.entries(input).map(([key, value]) => [GOLDEN_NUMBER_LABELS[key] || humanizeKey(key), formatGoldenValue(key, value, currency)])}
        />
        <ReadableKeyValueTable
          title="Variables de cálculo"
          entries={Object.entries(assumptions).map(([key, value]) => [humanizeKey(key), formatResponseValue(value)])}
        />
      </div>
    </div>
  )
}

function AdminResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-mia-border bg-mia-surface/30 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-neutral">{label}</p>
      <p className="mt-2 font-heading text-xl font-bold text-mia-cream">{value}</p>
    </div>
  )
}

function ReadableKeyValueTable({ title, entries }: { title: string; entries: Array<[string, string]> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-mia-border">
      <div className="border-b border-mia-border bg-mia-surface/40 px-4 py-3">
        <h4 className="font-heading text-sm font-bold text-mia-cream">{title}</h4>
      </div>
      <div className="divide-y divide-mia-border">
        {entries.map(([label, value]) => (
          <div key={label} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[220px_1fr]">
            <span className="font-semibold text-mia-cream">{label}</span>
            <span className="break-words text-neutral">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatMoney(value: unknown, currency = 'COP') {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'
  try {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(numeric)
  } catch {
    return `${currency} ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(numeric)}`
  }
}

function formatGoldenValue(key: string, value: unknown, currency: string) {
  if (['desiredPostRetirementIncome', 'otherIncomeSources', 'totalSavings', 'monthlyLivingCost', 'annualExpenses'].includes(key)) {
    return formatMoney(value, currency)
  }
  if (['estimatedInflation', 'expectedReturnRate', 'netReturn', 'riskScore'].includes(key)) {
    return `${formatResponseValue(value)}%`
  }
  return formatResponseValue(value)
}

function humanizeKey(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .trim()
    .replace(/^./, char => char.toUpperCase())
}

function JsonPreview({ title, value }: { title: string; value: unknown }) {
  const entries = value && typeof value === 'object' ? Object.entries(value as Record<string, any>) : []

  return (
    <div className="overflow-hidden rounded-2xl border border-mia-border">
      <div className="border-b border-mia-border bg-mia-surface/40 px-4 py-3">
        <h4 className="font-heading text-sm font-bold text-mia-cream">{title}</h4>
      </div>
      <div className="divide-y divide-mia-border">
        {entries.length === 0 && <p className="px-4 py-8 text-center text-sm text-neutral">Sin datos.</p>}
        {entries.map(([key, raw]) => (
          <div key={key} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[160px_1fr]">
            <span className="font-semibold text-mia-cream">{key}</span>
            <span className="break-words text-neutral">{formatResponseValue(raw)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatResponseValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
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

function WorldCupAdminView({ data }: { data: any }) {
  const participant = data?.participant || {}
  const savings = Array.isArray(data?.savings) ? data.savings : []
  const totalSaved = savings.reduce((acc: number, s: any) => acc + (s.amount || 0), 0)
  const currency = savings[0]?.currency || 'COP'

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/80 via-mia-surface/40 to-mia-surface p-6 shadow-xl">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
          <p className="relative text-xs font-black uppercase tracking-[0.28em] text-emerald-400">Total Ahorrado Desafío</p>
          <p className="relative mt-4 whitespace-nowrap font-sans text-[clamp(1.5rem,4vw,3.1rem)] font-black leading-none tracking-[-0.07em] text-mia-cream [font-variant-numeric:tabular-nums]">
            {formatMoney(totalSaved, currency)}
          </p>
          <p className="relative mt-4 max-w-xl text-sm font-medium leading-relaxed text-neutral">
            Progreso acumulado del participante en el Reto de Ahorro del Mundial FIFA 2030.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <AdminResultMetric label="País registrado" value={participant.country || '—'} />
          <AdminResultMetric label="Celular de contacto" value={participant.phone || '—'} />
          <AdminResultMetric label="Nombre en el Reto" value={participant.displayName || '—'} />
        </div>
      </div>

      <AdminDataTable
        title="Aportes de Ahorro Registrados"
        empty="El participante aún no ha registrado aportes de ahorro."
        columns={["Fecha del aporte", "Monto aportado", "Moneda", "Fecha de creación"]}
        rows={savings.map((s: any) => [
          s.date ? formatDate(s.date) : '—',
          formatAmount(s.amount, s.currency),
          s.currency || '—',
          s.createdAt ? formatDate(s.createdAt) : '—',
        ])}
      />
    </div>
  )
}
