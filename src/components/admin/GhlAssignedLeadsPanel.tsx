'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Loader2, RefreshCw, Search, UserRoundCheck } from 'lucide-react'

type GhlContact = Record<string, any> & {
  id?: string
  name?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  source?: string
  assignedTo?: string
  contactId?: string | null
  opportunityId?: string | null
  dateAdded?: string
  createdAt?: string
  lastActivity?: string
  miaUserId?: string | null
  miaUser?: {
    id: string
    name?: string | null
    email?: string | null
    phone?: string | null
    accesses?: Array<Record<string, any>>
    simulatorResponses?: Array<Record<string, any>>
  } | null
  opportunity?: {
    id?: string
    source?: string | null
    status?: string | null
    monetaryValue?: number
    pipelineId?: string | null
    pipelineStageId?: string | null
    assignedTo?: string | null
    createdAt?: string | null
    updatedAt?: string | null
  }
}

type GhlLeadsResponse = {
  contacts?: GhlContact[]
  meta?: {
    total?: number
    source?: string
    locationId?: string
  }
  error?: string
  code?: string
}

type GhlLeadDetail = {
  contact?: GhlContact
  notes?: Array<Record<string, any>>
  tasks?: Array<Record<string, any>>
  error?: string
}

function contactId(contact: GhlContact) {
  return contact.contactId || contact.id || ''
}

function opportunityId(contact: GhlContact) {
  return contact.opportunityId || contact.opportunity?.id || ''
}

function contactName(contact: GhlContact) {
  return contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || 'Lead sin nombre'
}

function formatGhlDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function GhlAssignedLeadsPanel() {
  const [contacts, setContacts] = useState<GhlContact[]>([])
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<GhlLeadsResponse['meta'] | null>(null)

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ page: '1', pageLimit: '100' })
    return `/api/admin/ghl/leads?${params.toString()}`
  }, [])

  const visibleContacts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return contacts.filter(contact => {
      const matchesSource = sourceFilter === 'all' || String(contact.source || '').toLowerCase() === sourceFilter.toLowerCase()
      if (!normalized) return matchesSource
      const matchesQuery = [contactName(contact), contact.email, contact.phone, contact.source, contact.opportunity?.status].some(value => String(value || '').toLowerCase().includes(normalized))
      return matchesQuery && matchesSource
    })
  }, [contacts, query, sourceFilter])

  const sourceOptions = useMemo(() => Array.from(new Set(contacts.map(contact => String(contact.source || '').trim()).filter(Boolean))).sort(), [contacts])

  async function loadLeads() {
    try {
      setLoading(true)
      const response = await fetch(endpoint, { cache: 'no-store' })
      const payload = (await response.json().catch(() => ({}))) as GhlLeadsResponse
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar los leads de GHL.')
      setContacts(payload.contacts || [])
      setMeta(payload.meta)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los leads de GHL.')
      setContacts([])
    } finally {
      setLoading(false)
    }
  }



  useEffect(() => {
    const timer = setTimeout(loadLeads, 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint])

  return (
    <section className="glass rounded-2xl border border-mf-coral/20 p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-mf-coral/30 bg-mf-coral/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-mf-coral">
            <UserRoundCheck className="h-3.5 w-3.5" />
            GHL asignados
          </div>
          <h3 className="font-heading text-2xl font-bold text-mia-cream">Leads asignados en GoHighLevel</h3>
          <p className="text-sm text-neutral">Solo se consultan los contactos donde GHL asignó el lead a tu usuario Money Strategist.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)} className="rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream outline-none focus:border-mf-coral">
            <option value="all">Todas las fuentes</option>
            {sourceOptions.map(source => <option key={source} value={source}>{source}</option>)}
          </select>
          <label className="relative min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar en GHL por nombre, email o teléfono"
              className="w-full rounded-xl border border-mia-border bg-mia-surface px-10 py-3 text-sm text-mia-cream outline-none focus:border-mf-coral"
            />
          </label>
          <button
            type="button"
            onClick={loadLeads}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-mf-coral/30 bg-mf-coral/10 px-4 py-3 text-xs font-bold text-mf-coral transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-mf-orange/30 bg-mf-orange/10 p-3 text-sm text-mf-orange">
          {error}
          <p className="mt-1 text-xs text-neutral">Configura GHL_PRIVATE_INTEGRATION_TOKEN, GHL_LOCATION_ID y GHL_COACH_USER_MAP_JSON para habilitar esta consulta.</p>
        </div>
      )}

      {!error && (
        <div className="overflow-hidden rounded-2xl border border-mia-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-mia-surface/60 text-xs uppercase tracking-wider text-neutral">
                <tr>
                  <th className="px-4 py-3 text-left">Lead</th>
                  <th className="px-4 py-3 text-left">Contacto</th>
                  <th className="px-4 py-3 text-left">Calculadora/Fuente</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Creado</th>
                  <th className="px-4 py-3 text-left">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mia-border">
                {visibleContacts.map(contact => {
                  const id = contactId(contact)
                  return (
                    <tr key={id || `${contact.email}-${contact.phone}`} className="hover:bg-mia-surface/30">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-mia-cream">{contactName(contact)}</p>
                        {contact.email && <p className="text-xs text-neutral">{contact.email}</p>}
                        {contact.miaUser && (
                          <p className="mt-1 text-[11px] text-gain">
                            MIA: {contact.miaUser.simulatorResponses?.length || 0} respuesta(s) · {contact.miaUser.accesses?.length || 0} acceso(s)
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-neutral">
                        <p>{contact.phone || '—'}</p>
                        <p className="text-xs text-neutral/70">GHL ID: {id || '—'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-mf-coral/30 bg-mf-coral/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-mf-coral">{contact.source || 'Sin fuente'}</span>
                      </td>
                      <td className="px-4 py-4 text-neutral">
                        <StatusPill status={contact.opportunity?.status} />
                      </td>
                      <td className="px-4 py-4 text-neutral">{formatGhlDate(contact.dateAdded || contact.createdAt || contact.lastActivity)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {contact.miaUserId ? (
                            <Link href={`/admin/usuarios/${contact.miaUserId}`} className="inline-flex items-center gap-2 rounded-xl border border-mf-coral/30 bg-mf-coral/10 px-3 py-2 text-xs font-bold text-mf-coral hover:opacity-80">
                              Ver respuestas
                            </Link>
                          ) : (
                            <span className="rounded-xl border border-mia-border px-3 py-2 text-xs text-neutral">No registrado en MIA</span>
                          )}
                          {id && (
                            <a href={buildGhlContactUrl(meta?.locationId, id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-mia-border px-3 py-2 text-xs font-bold text-neutral hover:border-mf-coral/50">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Abrir en GHL
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!loading && visibleContacts.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-neutral">No hay oportunidades/leads GHL asignados con estos filtros.</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-neutral">Cargando oportunidades desde GHL…</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!error && meta && (
        <p className="mt-3 text-xs text-neutral">Total reportado por GHL: {meta.total ?? contacts.length}. Mostrando: {visibleContacts.length}. Fuente: {meta.source || '—'}.</p>
      )}

    </section>
  )
}


function buildGhlContactUrl(locationId?: string | null, contactId?: string | null) {
  if (!contactId) return '#'
  if (!locationId) return `https://app.gohighlevel.com/v2/location/contacts/detail/${contactId}`
  return `https://app.gohighlevel.com/v2/location/${locationId}/contacts/detail/${contactId}`
}


function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-mia-border/60 pb-2 last:border-0">
      <dt className="text-neutral">{label}</dt>
      <dd className="text-right font-semibold text-mia-cream">{value || '—'}</dd>
    </div>
  )
}


function StatusPill({ status }: { status?: string | null }) {
  const value = status || 'sin estado'
  const normalized = value.toLowerCase()
  const tone = normalized === 'open'
    ? 'border-gain/30 bg-gain/10 text-gain'
    : normalized === 'won'
      ? 'border-mia-blue/30 bg-mia-blue/10 text-mia-blue'
      : normalized === 'lost'
        ? 'border-loss/30 bg-loss/10 text-loss'
        : 'border-mia-border bg-mia-surface text-neutral'
  return <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${tone}`}>{value}</span>
}
