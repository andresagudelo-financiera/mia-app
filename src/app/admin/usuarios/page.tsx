'use client'


import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Download, Loader2, Plus, Search, ShieldCheck } from 'lucide-react'
import { adminApi } from '@/services/api/admin.api'
import type { AdminUserDetail, AdminUserSummary, Simulator, SimulatorAccessType, UserRole, UserStatus } from '@/types/rentabilidad'
import StatusBadge from '@/components/admin/StatusBadge'
import { formatDate, formatRelativeTime } from '@/lib/formatters'
import AdminCreateUserModal from '@/components/admin/AdminCreateUserModal'
import GhlAssignedLeadsPanel from '@/components/admin/GhlAssignedLeadsPanel'

export default function AdminUsersPage() {
  const { data: session, status: sessionStatus } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [simulators, setSimulators] = useState<Simulator[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedSimulatorSlugs, setSelectedSimulatorSlugs] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<'grant' | 'revoke'>('grant')
  const [bulkAccessType, setBulkAccessType] = useState<SimulatorAccessType>('free')
  const [bulkDays, setBulkDays] = useState(7)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | 'all'>('all')
  const [status, setStatus] = useState<UserStatus | 'all'>('all')
  const [simulatorFilter, setSimulatorFilter] = useState('all')
  const [registeredFrom, setRegisteredFrom] = useState('')
  const [registeredTo, setRegisteredTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showBulkAccess, setShowBulkAccess] = useState(false)
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let active = true

    if (sessionStatus === 'loading') return () => { active = false }

    if (!isAdmin) {
      setUsers([])
      setSimulators([])
      setSelectedUserIds([])
      setError(null)
      setLoading(false)
      return () => { active = false }
    }

    async function load() {
      try {
        setLoading(true)
        const [data, sims] = await Promise.all([
          adminApi.listUsers({ search: search.trim() || undefined, role, status }),
          adminApi.listSimulators(),
        ])
        if (!active) return
        setUsers(data || [])
        setSimulators(sims || [])
        setError(null)
      } catch {
        if (active) setError('No se pudieron cargar los usuarios adminUsers desde GraphQL.')
      } finally {
        if (active) setLoading(false)
      }
    }
    const timer = setTimeout(load, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [isAdmin, role, search, sessionStatus, status])

  const simulatorOptions = useMemo(() => getSimulatorOptions(users, simulators), [users, simulators])

  const filteredUsers = useMemo(() => (
    users.filter(user => {
      const matchesRole = role === 'all' || (user.role || 'user') === role
      const matchesStatus = status === 'all' || (user.status || 'active') === status
      const matchesSimulator = simulatorFilter === 'all' || getUserSimulatorSlugs(user).includes(simulatorFilter)
      const matchesRegistrationDate = isDateWithinRange(user.registeredAt, registeredFrom, registeredTo)
      return matchesRole && matchesStatus && matchesSimulator && matchesRegistrationDate
    })
  ), [registeredFrom, registeredTo, role, simulatorFilter, status, users])

  useEffect(() => {
    setCurrentPage(1)
  }, [registeredFrom, registeredTo, role, search, simulatorFilter, status])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredUsers.length / pageSize)), [filteredUsers.length, pageSize])

  useEffect(() => {
    setCurrentPage(page => Math.min(Math.max(page, 1), totalPages))
  }, [totalPages])

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [currentPage, filteredUsers, pageSize])

  const paginationStart = filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const paginationEnd = Math.min(currentPage * pageSize, filteredUsers.length)

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

  const selectedVisibleUserIds = useMemo(
    () => paginatedUsers.filter(user => selectedUserIds.includes(user.id)).map(user => user.id),
    [paginatedUsers, selectedUserIds],
  )

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(current => current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId])
  }

  const toggleAllVisibleUsers = () => {
    const visibleIds = paginatedUsers.map(user => user.id)
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedUserIds.includes(id))
    setSelectedUserIds(current => allSelected
      ? current.filter(id => !visibleIds.includes(id))
      : Array.from(new Set([...current, ...visibleIds])))
  }

  const toggleSimulatorSelection = (slug: string) => {
    setSelectedSimulatorSlugs(current => current.includes(slug)
      ? current.filter(item => item !== slug)
      : [...current, slug])
  }

  const applyBulkAccess = async () => {
    if (selectedUserIds.length === 0 || selectedSimulatorSlugs.length === 0) {
      alert('Selecciona al menos un usuario y una calculadora.')
      return
    }

    const confirmMessage = bulkAction === 'grant'
      ? `¿Dar acceso a ${selectedUserIds.length} usuario(s) para ${selectedSimulatorSlugs.length} calculadora(s)?`
      : `¿Quitar acceso a ${selectedUserIds.length} usuario(s) para ${selectedSimulatorSlugs.length} calculadora(s)?`

    if (!window.confirm(confirmMessage)) return

    try {
      setBulkProcessing(true)
      if (bulkAction === 'grant') {
        const expiresAt = bulkAccessType === 'demo'
          ? new Date(Date.now() + bulkDays * 24 * 60 * 60 * 1000).toISOString()
          : null

        await Promise.all(selectedUserIds.flatMap(userId => selectedSimulatorSlugs.map(simulatorSlug => adminApi.grantAccess({
          userId,
          simulatorId: simulatorSlug,
          accessType: bulkAccessType,
          status: 'active',
          expiresAt,
          notes: `Acceso ${bulkAccessType} asignado en lote desde admin.`,
        }))))
      } else {
        await Promise.all(selectedUserIds.flatMap(userId => selectedSimulatorSlugs.map(simulatorSlug => adminApi.revokeAccess(userId, simulatorSlug))))
      }

      const refreshed = await adminApi.listUsers({ search: search.trim() || undefined, role, status })
      setUsers(refreshed || [])
      setSelectedUserIds([])
    } catch (error) {
      alert('No se pudo actualizar el acceso en lote.')
    } finally {
      setBulkProcessing(false)
    }
  }

  const downloadExcelReport = async () => {
    try {
      setExporting(true)
      const usersToExport = filteredUsers
      if (usersToExport.length === 0) {
        alert('No hay usuarios para descargar con los filtros actuales.')
        return
      }

      const details = await Promise.all(
        usersToExport.map(async user => {
          try {
            return (await adminApi.getUserDetail(user.id)) || user
          } catch {
            return user
          }
        }),
      )

      const reportRows = buildUsersReportRows(details as AdminUserDetail[], {
        search,
        role,
        status,
        simulator: simulatorFilter,
        registeredFrom,
        registeredTo,
        exportedAt: new Date().toISOString(),
      })
      const XLSX = await import('xlsx')
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet(reportRows)
      worksheet['!cols'] = reportRows[reportRows.length - 1]?.map(() => ({ wch: 24 })) || []
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios')
      const report = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([report], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `usuarios-filtrados-mia-${new Date().toISOString().slice(0, 10)}.xlsx`
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
          <h2 className="font-heading text-3xl font-bold text-mia-cream">{isAdmin ? 'Usuarios' : 'Mis leads asignados'}</h2>
          <p className="text-sm text-neutral">{isAdmin ? 'Administra leads, accesos y respuestas.' : 'Modo coach/MS: consulta leads y respuestas guardadas sin editar accesos.'}</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="flex gap-2 text-xs text-neutral">
            <span>{filteredUsers.length} usuarios</span>
            <span>·</span>
            <span>{totals.admins} admins</span>
            <span>·</span>
            <span>{totals.demos} demos</span>
          </div>
          {isAdmin && (
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
          )}
        </div>
      </div>

      {!isAdmin && <GhlAssignedLeadsPanel />}

      {isAdmin && (<>
      <div className="glass rounded-2xl border border-mia-border p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.4fr)_170px_170px_210px_155px_155px]">
          <label className="relative md:col-span-2 xl:col-span-1">
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
            <option value="coach">Coaches</option>
            <option value="money_strategist">Money Strategists</option>
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
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral">Desde</span>
            <input
              type="date"
              value={registeredFrom}
              onChange={e => setRegisteredFrom(e.target.value)}
              className="rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream outline-none focus:border-mf-coral"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral">Hasta</span>
            <input
              type="date"
              value={registeredTo}
              min={registeredFrom || undefined}
              onChange={e => setRegisteredTo(e.target.value)}
              className="rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream outline-none focus:border-mf-coral"
            />
          </label>
        </div>
        {(registeredFrom || registeredTo) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-mf-coral/20 bg-mf-coral/10 px-3 py-2 text-xs text-neutral">
            <span>Filtrando registros {registeredFrom ? `desde ${registeredFrom}` : ''} {registeredTo ? `hasta ${registeredTo}` : ''}</span>
            <button
              type="button"
              onClick={() => { setRegisteredFrom(''); setRegisteredTo('') }}
              className="font-bold text-mf-coral hover:opacity-80"
            >
              Limpiar fechas
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
      <div className="glass overflow-hidden rounded-2xl border border-mia-border">
        <button
          type="button"
          onClick={() => setShowBulkAccess(value => !value)}
          aria-expanded={showBulkAccess}
          aria-controls="bulk-access-panel"
          className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-mia-surface/40"
        >
          <span>
            <span className="block font-heading text-lg font-bold text-mia-cream">Accesos por usuario y calculadora</span>
            <span className="mt-1 block text-xs text-neutral">Abre este panel solo cuando quieras asignar o quitar accesos en lote.</span>
          </span>
          <span className="flex shrink-0 items-center gap-2 rounded-full border border-mia-border bg-mia-surface px-3 py-2 text-xs font-bold text-neutral">
            {showBulkAccess ? 'Ocultar' : 'Configurar'}
            <ChevronDown className={`h-4 w-4 transition-transform ${showBulkAccess ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {showBulkAccess && (
        <div id="bulk-access-panel" className="grid gap-4 border-t border-mia-border p-4 lg:grid-cols-[1fr_1fr_auto]"> 
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral">Calculadoras</p>
            <div className="flex flex-wrap gap-2">
              {simulatorOptions.map(option => {
                const selected = selectedSimulatorSlugs.includes(option.slug)
                return (
                  <button
                    key={option.slug}
                    type="button"
                    onClick={() => toggleSimulatorSelection(option.slug)}
                    className={`rounded-full border px-3 py-2 text-xs font-bold transition ${selected ? 'border-mf-coral bg-mf-coral/15 text-mf-coral' : 'border-mia-border bg-mia-surface text-neutral hover:border-mf-coral/50'}`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral">Acción</span>
              <select value={bulkAction} onChange={event => setBulkAction(event.target.value as 'grant' | 'revoke')} className="w-full rounded-xl border border-mia-border bg-mia-surface px-3 py-3 text-sm text-mia-cream outline-none focus:border-mf-coral">
                <option value="grant">Dar acceso</option>
                <option value="revoke">Quitar acceso</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral">Tipo</span>
              <select value={bulkAccessType} onChange={event => setBulkAccessType(event.target.value as SimulatorAccessType)} disabled={bulkAction === 'revoke'} className="w-full rounded-xl border border-mia-border bg-mia-surface px-3 py-3 text-sm text-mia-cream outline-none focus:border-mf-coral disabled:opacity-50">
                <option value="free">Free</option>
                <option value="demo">Demo</option>
                <option value="paid">Pago</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral">Días demo</span>
              <input value={bulkDays} onChange={event => setBulkDays(Number(event.target.value) || 1)} type="number" min="1" disabled={bulkAction === 'revoke' || bulkAccessType !== 'demo'} className="w-full rounded-xl border border-mia-border bg-mia-surface px-3 py-3 text-sm text-mia-cream outline-none focus:border-mf-coral disabled:opacity-50" />
            </label>
          </div>

          <div className="flex flex-col justify-end gap-2">
            <p className="text-xs text-neutral">{selectedUserIds.length} usuario(s) seleccionado(s)</p>
            <button
              type="button"
              onClick={applyBulkAccess}
              disabled={bulkProcessing || selectedUserIds.length === 0 || selectedSimulatorSlugs.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Aplicar accesos
            </button>
          </div>
        </div>
        )}
      </div>
      )}

      {error && <div className="rounded-2xl border border-mf-orange/30 bg-mf-orange/10 p-4 text-sm text-mf-orange">{error}</div>}


      <div className="glass overflow-hidden rounded-2xl border border-mia-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-mia-surface/60 text-xs uppercase tracking-wider text-neutral">
              <tr>
                {isAdmin && (
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" checked={paginatedUsers.length > 0 && selectedVisibleUserIds.length === paginatedUsers.length} onChange={toggleAllVisibleUsers} aria-label="Seleccionar usuarios visibles" />
                  </th>
                )}
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
              {paginatedUsers.map(user => (
                <tr key={user.id} className="hover:bg-mia-surface/30">
                  {isAdmin && (
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => toggleUserSelection(user.id)} aria-label={`Seleccionar ${user.email}`} />
                    </td>
                  )}
                  <td className="px-4 py-4">
                    <Link href={`/admin/usuarios/${user.id}`} className="font-semibold text-mia-cream hover:text-mf-coral">{user.name}</Link>
                    <p className="text-xs text-neutral">{user.email}</p>
                    {user.phone && <p className="text-xs text-neutral/70">{user.phone}</p>}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <StatusBadge value={user.role || 'user'} />
                      {isAdmin && (
                        <select value={user.role || 'user'} onChange={e => changeRole(user, e.target.value as UserRole)} className="rounded-lg border border-mia-border bg-mia-surface px-2 py-1 text-xs text-mia-cream">
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                          <option value="coach">coach</option>
                          <option value="money_strategist">money_strategist</option>
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <StatusBadge value={user.status || 'active'} />
                      {isAdmin && (
                        <select value={user.status || 'active'} onChange={e => changeStatus(user, e.target.value as UserStatus)} className="rounded-lg border border-mia-border bg-mia-surface px-2 py-1 text-xs text-mia-cream">
                          <option value="active">active</option>
                          <option value="demo">demo</option>
                          <option value="paid">paid</option>
                          <option value="expired">expired</option>
                          <option value="blocked">blocked</option>
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-neutral">
                    <div className="mb-3 flex max-w-xs flex-wrap gap-1.5">
                      {getUserSimulatorBadges(user).map(simulator => (
                        <span key={simulator.slug} className="rounded-full border border-mf-coral/30 bg-mf-coral/10 px-2 py-1 text-[10px] font-semibold text-mf-coral">
                          {simulator.label}
                        </span>
                      ))}
                      {getUserSimulatorBadges(user).length === 0 && <span className="text-xs text-neutral/70">Sin simuladores</span>}
                    </div>
                    <SimulatorUsageSummary user={user} />
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
                <tr><td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-neutral">No hay usuarios con esos filtros.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-neutral">Cargando usuarios…</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredUsers.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-mia-border px-4 py-3 text-sm text-neutral sm:flex-row sm:items-center sm:justify-between">
            <p>Mostrando {paginationStart}-{paginationEnd} de {filteredUsers.length} usuarios</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral">
                Filas
                <select
                  value={pageSize}
                  onChange={event => { setPageSize(Number(event.target.value)); setCurrentPage(1) }}
                  className="rounded-lg border border-mia-border bg-mia-surface px-2 py-2 text-sm normal-case tracking-normal text-mia-cream outline-none focus:border-mf-coral"
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-mia-border bg-mia-surface px-3 py-2 text-xs font-bold text-mia-cream disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <span className="rounded-lg border border-mia-border px-3 py-2 text-xs font-bold text-mia-cream">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-mia-border bg-mia-surface px-3 py-2 text-xs font-bold text-mia-cream disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      </>)}
      {isAdmin && showCreateModal && (
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


type UsersReportFilters = {
  search: string
  role: UserRole | 'all'
  status: UserStatus | 'all'
  simulator: string
  registeredFrom: string
  registeredTo: string
  exportedAt: string
}

function buildUsersReportRows(users: AdminUserDetail[], filters?: UsersReportFilters) {
  return [
    ['Reporte', 'Usuarios MIA filtrados'],
    ['Fecha descarga', filters?.exportedAt || new Date().toISOString()],
    ['Usuarios exportados', users.length],
    ['Búsqueda', filters?.search || 'Todos'],
    ['Rol', filters?.role || 'all'],
    ['Estado', filters?.status || 'all'],
    ['Calculadora', filters?.simulator || 'all'],
    ['Registro desde', filters?.registeredFrom || 'Sin filtro'],
    ['Registro hasta', filters?.registeredTo || 'Sin filtro'],
    [],
    ['ID', 'Nombre', 'Email', 'Teléfono', 'Rol', 'Estado', 'Moneda base', 'Registro', 'Último acceso', 'Onboarding', 'Inversiones', 'Flujos', 'Cortes', 'PDFs', 'Simuladores', 'Accesos'],
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
        getUserSimulatorBadges(user).map(simulator => simulator.label).join(', '),
        formatAccessesForCsv(user),
      ]
    }),
  ]
}

function formatAccessesForCsv(user: AdminUserDetail) {
  return (user.accesses || [])
    .map(access => `${access.simulatorName || access.toolName || access.simulatorSlug || access.simulatorId || 'Simulador'} (${access.accessType}/${access.status}${access.expiresAt ? ` expira ${access.expiresAt}` : ''})`)
    .join(' | ')
}

function isDateWithinRange(value: string | null | undefined, from: string, to: string) {
  if (!from && !to) return true
  if (!value) return false

  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return false

  if (from) {
    const fromTimestamp = new Date(`${from}T00:00:00`).getTime()
    if (Number.isFinite(fromTimestamp) && timestamp < fromTimestamp) return false
  }

  if (to) {
    const toTimestamp = new Date(`${to}T23:59:59.999`).getTime()
    if (Number.isFinite(toTimestamp) && timestamp > toTimestamp) return false
  }

  return true
}


type SimulatorOption = {
  slug: string
  label: string
}

function SimulatorUsageSummary({ user }: { user: AdminUserSummary }) {
  const investments = user.investmentCount || 0
  const flows = user.transactionCount || 0
  const cuts = user.snapshotCount || 0
  const genericResponses = user.simulatorResponses?.filter(response => response.simulatorKey !== 'rentabilidad').length || 0
  const hasRentabilidadActivity = investments > 0 || flows > 0 || cuts > 0

  if (!hasRentabilidadActivity && genericResponses === 0) {
    return <p className="text-xs text-neutral/70">Sin actividad guardada todavía.</p>
  }

  return (
    <div className="space-y-1 text-xs text-neutral">
      {hasRentabilidadActivity && (
        <div>
          <p className="font-semibold text-mia-cream/80">Actividad en Rentabilidad</p>
          <p>{investments} inversiones registradas</p>
          <p>{flows} entradas/salidas · {cuts} cortes de valor</p>
        </div>
      )}
      {genericResponses > 0 && (
        <p>{genericResponses} respuesta{genericResponses === 1 ? '' : 's'} guardada{genericResponses === 1 ? '' : 's'} en otros simuladores</p>
      )}
    </div>
  )
}

function getSimulatorOptions(users: AdminUserSummary[], simulators: Simulator[] = []): SimulatorOption[] {
  const options = new Map<string, string>()
  simulators.forEach(simulator => options.set(normalizeSimulatorSlug(simulator.slug || simulator.id), simulator.name))
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

  ;(user.simulatorResponses || []).forEach(response => {
    const slug = normalizeSimulatorSlug(response.simulatorKey)
    if (slug) options.set(slug, getSimulatorLabel(slug))
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
