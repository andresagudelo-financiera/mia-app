'use client'


import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Download, Loader2, Plus, Search, ShieldCheck } from 'lucide-react'
import { adminApi } from '@/services/api/admin.api'
import type { AdminUserDetail, AdminUserSummary, UserRole, UserStatus } from '@/types/rentabilidad'
import StatusBadge from '@/components/admin/StatusBadge'
import { formatDate, formatRelativeTime } from '@/lib/formatters'
import AdminCreateUserModal from '@/components/admin/AdminCreateUserModal'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | 'all'>('all')
  const [status, setStatus] = useState<UserStatus | 'all'>('all')
  const [simulatorFilter, setSimulatorFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        const data = await adminApi.listUsers({ search: search.trim() || undefined, role, status })
        if (!active) return
        setUsers(data || [])
        setError(null)
      } catch {
        if (active) setError('No se pudieron cargar los usuarios adminUsers desde GraphQL.')
      } finally {
        if (active) setLoading(false)
      }
    }
    const timer = setTimeout(load, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [search, role, status])

  const simulatorOptions = useMemo(() => getSimulatorOptions(users), [users])

  const filteredUsers = useMemo(() => (
    users.filter(user => {
      const matchesRole = role === 'all' || (user.role || 'user') === role
      const matchesStatus = status === 'all' || (user.status || 'active') === status
      const matchesSimulator = simulatorFilter === 'all' || getUserSimulatorSlugs(user).includes(simulatorFilter)
      return matchesRole && matchesStatus && matchesSimulator
    })
  ), [role, simulatorFilter, status, users])

  const totals = useMemo(() => ({
    admins: filteredUsers.filter(u => u.role === 'admin').length,
    demos: filteredUsers.filter(u => u.status === 'demo' || u.accesses?.some(a => a.accessType === 'demo' && a.status === 'active')).length,
    blocked: filteredUsers.filter(u => u.status === 'blocked').length,
  }), [filteredUsers])

  const changeRole = async (user: AdminUserSummary, nextRole: UserRole) => {
    const previous = users
    setUsers(current => current.map(u => u.id === user.id ? { ...u, role: nextRole } : u))
    try {
      await adminApi.updateUser(user.id, { role: nextRole })
    } catch {
      setUsers(previous)
      alert('No se pudo actualizar el rol del usuario.')
    }
  }

  const changeStatus = async (user: AdminUserSummary, nextStatus: UserStatus) => {
    const previous = users
    setUsers(current => current.map(u => u.id === user.id ? {
      ...u,
      status: nextStatus,
      accesses: nextStatus === 'blocked' || nextStatus === 'expired'
        ? u.accesses?.map(access => ({ ...access, status: nextStatus === 'expired' ? 'expired' : 'revoked' }))
        : u.accesses,
    } : u))

    try {
      if (nextStatus === 'blocked') {
        const toolNames = Array.from(new Set((user.accesses || []).map(getAccessToolName).filter(Boolean)))
        await Promise.all(toolNames.map(toolName => adminApi.revokeAccess(user.id, toolName)))
      } else {
        const accessType = getAccessTypeForUserStatus(nextStatus, user)
        const toolNames = Array.from(new Set((user.accesses || []).map(getAccessToolName).filter(Boolean)))
        const targets = toolNames.length > 0 ? toolNames : ['rentabilidad']

        await Promise.all(targets.map(toolName => adminApi.grantAccess({
          userId: user.id,
          simulatorId: toolName,
          accessType,
          status: nextStatus === 'expired' ? 'expired' : 'active',
          expiresAt: nextStatus === 'expired'
            ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            : nextStatus === 'demo'
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : null,
          notes: `Estado actualizado a ${nextStatus} desde listado de usuarios.`,
        })))
      }

      const refreshed = await adminApi.getUserDetail(user.id)
      if (refreshed) {
        setUsers(current => current.map(u => u.id === user.id ? { ...u, ...refreshed } : u))
      }
    } catch {
      setUsers(previous)
      alert('No se pudo actualizar el estado del usuario.')
    }
  }

  const downloadExcelReport = async () => {
    try {
      setExporting(true)
      const allUsers = await adminApi.listUsers({ role: 'all', status: 'all' })
      const details = await Promise.all(
        (allUsers || []).map(async user => {
          try {
            return (await adminApi.getUserDetail(user.id)) || user
          } catch {
            return user
          }
        }),
      )

      const workbook = buildUsersWorkbook(details as AdminUserDetail[])
      const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `reporte-usuarios-mia-${new Date().toISOString().slice(0, 10)}.xls`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export users report:', error)
      alert('No se pudo descargar el reporte de usuarios.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-3xl font-bold text-mia-cream">Usuarios</h2>
          <p className="text-sm text-neutral">Los administradores son usuarios normales con <strong>role: admin</strong>.</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="flex gap-2 text-xs text-neutral">
            <span>{filteredUsers.length} usuarios</span>
            <span>·</span>
            <span>{totals.admins} admins</span>
            <span>·</span>
            <span>{totals.demos} demos</span>
          </div>
          <div className="flex flex-wrap gap-3 sm:items-end">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-mf-coral/30 bg-mf-coral/10 px-4 py-2 text-xs font-bold text-mf-coral transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Nuevo Usuario
            </button>
            <button
              type="button"
              onClick={downloadExcelReport}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? 'Generando reporte...' : 'Descargar Excel'}
            </button>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl border border-mia-border p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_220px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email o celular"
              className="w-full rounded-xl border border-mia-border bg-mia-surface px-10 py-3 text-sm text-mia-cream outline-none focus:border-mf-coral"
            />
          </label>
          <select value={role} onChange={e => setRole(e.target.value as UserRole | 'all')} className="rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream outline-none focus:border-mf-coral">
            <option value="all">Todos los roles</option>
            <option value="user">Usuarios</option>
            <option value="admin">Admins</option>
          </select>
          <select value={status} onChange={e => setStatus(e.target.value as UserStatus | 'all')} className="rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream outline-none focus:border-mf-coral">
            <option value="all">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="demo">Demo</option>
            <option value="paid">Pago</option>
            <option value="expired">Expirado</option>
            <option value="blocked">Bloqueado</option>
          </select>
          <select value={simulatorFilter} onChange={e => setSimulatorFilter(e.target.value)} className="rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream outline-none focus:border-mf-coral">
            <option value="all">Todas las calculadoras</option>
            {simulatorOptions.map(option => (
              <option key={option.slug} value={option.slug}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-mf-orange/30 bg-mf-orange/10 p-4 text-sm text-mf-orange">{error}</div>}

      <div className="glass overflow-hidden rounded-2xl border border-mia-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-mia-surface/60 text-xs uppercase tracking-wider text-neutral">
              <tr>
                <th className="px-4 py-3 text-left">Usuario</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Uso simulador</th>
                <th className="px-4 py-3 text-left">Registro</th>
                <th className="px-4 py-3 text-left">Último acceso</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mia-border">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-mia-surface/30">
                  <td className="px-4 py-4">
                    <Link href={`/admin/usuarios/${user.id}`} className="font-semibold text-mia-cream hover:text-mf-coral">{user.name}</Link>
                    <p className="text-xs text-neutral">{user.email}</p>
                    {user.phone && <p className="text-xs text-neutral/70">{user.phone}</p>}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <StatusBadge value={user.role || 'user'} />
                      <select value={user.role || 'user'} onChange={e => changeRole(user, e.target.value as UserRole)} className="rounded-lg border border-mia-border bg-mia-surface px-2 py-1 text-xs text-mia-cream">
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <StatusBadge value={user.status || 'active'} />
                      <select value={user.status || 'active'} onChange={e => changeStatus(user, e.target.value as UserStatus)} className="rounded-lg border border-mia-border bg-mia-surface px-2 py-1 text-xs text-mia-cream">
                        <option value="active">active</option>
                        <option value="demo">demo</option>
                        <option value="paid">paid</option>
                        <option value="expired">expired</option>
                        <option value="blocked">blocked</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-neutral">
                    <div className="mb-2 flex max-w-xs flex-wrap gap-1.5">
                      {getUserSimulatorBadges(user).map(simulator => (
                        <span key={simulator.slug} className="rounded-full border border-mf-coral/30 bg-mf-coral/10 px-2 py-1 text-[10px] font-semibold text-mf-coral">
                          {simulator.label}
                        </span>
                      ))}
                      {getUserSimulatorBadges(user).length === 0 && <span className="text-xs text-neutral/70">Sin simuladores</span>}
                    </div>
                    <p>{user.investmentCount || 0} inversiones</p>
                    <p>{user.transactionCount || 0} flujos · {user.snapshotCount || 0} cortes</p>
                    <p>{user.pdfDownloadCount || 0} PDFs</p>
                  </td>
                  <td className="px-4 py-4 text-neutral">{user.registeredAt ? formatDate(user.registeredAt) : '—'}</td>
                  <td className="px-4 py-4 text-neutral">{user.lastSeenAt ? formatRelativeTime(user.lastSeenAt) : '—'}</td>
                  <td className="px-4 py-4">
                    <Link href={`/admin/usuarios/${user.id}`} className="inline-flex items-center gap-2 rounded-xl border border-mf-coral/30 bg-mf-coral/10 px-3 py-2 text-xs font-bold text-mf-coral hover:opacity-80">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Revisar
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filteredUsers.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral">No hay usuarios con esos filtros.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral">Cargando usuarios…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showCreateModal && (
        <AdminCreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(user) => {
            setUsers(current => [user, ...current])
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}


type SheetDefinition = {
  name: string
  rows: Array<Array<string | number | boolean | null | undefined>>
}

function buildUsersWorkbook(users: AdminUserDetail[]) {
  const sheets: SheetDefinition[] = [
    {
      name: 'Usuarios',
      rows: [
        ['ID', 'Nombre', 'Email', 'Teléfono', 'Rol', 'Estado', 'Moneda base', 'Registro', 'Último acceso', 'Onboarding', 'Inversiones', 'Flujos', 'Cortes', 'PDFs'],
        ...users.map(user => {
          const rentabilidad = user.rentabilidadData
          return [
            user.id,
            user.name,
            user.email,
            user.phone,
            user.role || 'user',
            user.status || 'active',
            user.baseCurrency,
            user.registeredAt,
            user.lastSeenAt,
            user.hasCompletedOnboarding ? 'Completo' : 'Pendiente',
            rentabilidad?.investments?.length ?? user.investmentCount ?? 0,
            rentabilidad?.transactions?.length ?? user.transactionCount ?? 0,
            rentabilidad?.snapshots?.length ?? user.snapshotCount ?? 0,
            user.pdfDownloadCount ?? 0,
          ]
        }),
      ],
    },
    {
      name: 'Accesos',
      rows: [
        ['Usuario ID', 'Nombre', 'Email', 'Simulador', 'Tipo acceso', 'Estado', 'Expira', 'Uso'],
        ...users.flatMap(user => (user.accesses || []).map(access => [
          user.id,
          user.name,
          user.email,
          access.simulatorName || access.toolName || access.simulatorSlug || access.simulatorId || 'Simulador',
          access.accessType,
          access.status,
          access.expiresAt || '',
          access.notes || '',
        ])),
      ],
    },
    {
      name: 'Configuracion',
      rows: [
        ['Usuario ID', 'Email', 'Calculadora', 'Moneda base', 'Pilares', 'Entidades', 'Monedas', 'Última actualización'],
        ...users.map(user => {
          const rentabilidad = user.rentabilidadData
          return [
            user.id,
            user.email,
            'rentabilidad',
            rentabilidad?.config?.baseCurrency || user.baseCurrency || '',
            joinValues(rentabilidad?.config?.pillars),
            joinValues(rentabilidad?.config?.entities),
            joinValues(rentabilidad?.config?.currencies),
            rentabilidad?.lastUpdated || '',
          ]
        }),
      ],
    },
    {
      name: 'Inversiones',
      rows: [
        ['Usuario ID', 'Email', 'Calculadora', 'Inversión ID', 'Nombre', 'Pilar', 'Entidad', 'Moneda', 'Monto', 'Creación'],
        ...users.flatMap(user => (user.rentabilidadData?.investments || []).map((investment: any) => [
          user.id,
          user.email,
          'rentabilidad',
          investment.id,
          investment.name,
          investment.pilar,
          investment.entity,
          investment.currency,
          investment.amount ?? 0,
          investment.createdAt,
        ])),
      ],
    },
    {
      name: 'Flujos',
      rows: [
        ['Usuario ID', 'Email', 'Calculadora', 'Flujo ID', 'Fecha', 'Inversión', 'Entidad', 'Moneda', 'Monto local', 'TRM', 'Nota', 'Tipo'],
        ...users.flatMap(user => (user.rentabilidadData?.transactions || []).map((transaction: any) => [
          user.id,
          user.email,
          'rentabilidad',
          transaction.id,
          transaction.date,
          transaction.investmentName,
          transaction.entity,
          transaction.currency,
          transaction.amountLocal ?? transaction.amount ?? 0,
          transaction.trm ?? '',
          transaction.note || transaction.description || '',
          transaction.type || 'investment_flow',
        ])),
      ],
    },
    {
      name: 'Cortes',
      rows: [
        ['Usuario ID', 'Email', 'Calculadora', 'Corte ID', 'Fecha corte', 'Inversión', 'Entidad', 'Moneda', 'Valor local', 'Valor USD', 'TRM corte'],
        ...users.flatMap(user => (user.rentabilidadData?.snapshots || []).map((snapshot: any) => [
          user.id,
          user.email,
          'rentabilidad',
          snapshot.id,
          snapshot.cutDate || snapshot.date,
          snapshot.investmentName,
          snapshot.entity,
          snapshot.currency || user.rentabilidadData?.config?.baseCurrency || user.baseCurrency,
          snapshot.valueLocal ?? snapshot.totalValue ?? '',
          snapshot.valueUSD ?? '',
          snapshot.trmCut ?? '',
        ])),
      ],
    },
  ]

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#222222" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:Bold="1"/></Style>
 </Styles>
 ${sheets.map(sheetToXml).join('\n')}
</Workbook>`
}

function sheetToXml(sheet: SheetDefinition) {
  return `<Worksheet ss:Name="${escapeXml(sheet.name.slice(0, 31))}"><Table>${sheet.rows.map((row, index) => rowToXml(row, index === 0)).join('')}</Table></Worksheet>`
}

function rowToXml(row: Array<string | number | boolean | null | undefined>, isHeader: boolean) {
  return `<Row>${row.map(value => cellToXml(value, isHeader)).join('')}</Row>`
}

function cellToXml(value: string | number | boolean | null | undefined, isHeader: boolean) {
  const isNumber = typeof value === 'number' && Number.isFinite(value)
  const type = isNumber ? 'Number' : 'String'
  const content = isNumber ? String(value) : escapeXml(value === null || value === undefined ? '' : String(value))
  return `<Cell${isHeader ? ' ss:StyleID="Header"' : ''}><Data ss:Type="${type}">${content}</Data></Cell>`
}

function joinValues(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).map(String).join(', ') : ''
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}


type SimulatorOption = {
  slug: string
  label: string
}

function getSimulatorOptions(users: AdminUserSummary[]): SimulatorOption[] {
  const options = new Map<string, string>()
  users.forEach(user => {
    getUserSimulatorBadges(user).forEach(simulator => options.set(simulator.slug, simulator.label))
  })
  return Array.from(options.entries())
    .map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function getUserSimulatorBadges(user: AdminUserSummary): SimulatorOption[] {
  const options = new Map<string, string>()

  ;(user.accesses || []).forEach(access => {
    const slug = normalizeSimulatorSlug(access.toolName || access.simulatorSlug || access.simulatorId || '')
    if (!slug) return
    options.set(slug, access.simulatorName || getSimulatorLabel(slug))
  })

  if ((user as AdminUserDetail).rentabilidadData || (user.investmentCount || 0) > 0 || (user.transactionCount || 0) > 0 || (user.snapshotCount || 0) > 0) {
    options.set('rentabilidad', 'Rentabilidad')
  }

  return Array.from(options.entries()).map(([slug, label]) => ({ slug, label }))
}

function getUserSimulatorSlugs(user: AdminUserSummary) {
  return getUserSimulatorBadges(user).map(simulator => simulator.slug)
}

function getAccessToolName(access: NonNullable<AdminUserSummary['accesses']>[number]) {
  return access.toolName || access.simulatorSlug || access.simulatorId || ''
}

function getAccessTypeForUserStatus(status: UserStatus, user: AdminUserSummary) {
  if (status === 'paid') return 'paid'
  if (status === 'demo') return 'demo'
  return user.accesses?.find(access => access.accessType !== 'admin_only')?.accessType || 'free'
}

function normalizeSimulatorSlug(value: string) {
  return value.toLowerCase().trim()
}

function getSimulatorLabel(slug: string) {
  if (slug === 'rentabilidad') return 'Rentabilidad'
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}
