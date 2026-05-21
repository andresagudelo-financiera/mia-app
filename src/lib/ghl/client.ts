import 'server-only'

const GHL_API_BASE_URL = 'https://services.leadconnectorhq.com'
const DEFAULT_GHL_VERSION = '2021-07-28'
const DEFAULT_GHL_LEAD_SOURCE = 'Simulador de inversión'

export type GhlStaffMapping = {
  assignedTo: string
  locationId?: string
}

export type GhlContactSearchParams = {
  assignedTo?: string
  locationId: string
  page?: number
  pageLimit?: number
  source?: string
  query?: string
}

export type GhlOpportunitySearchParams = {
  assignedTo: string
  locationId: string
  limit?: number
  startAfter?: string | number
  startAfterId?: string
}

export type GhlClientConfig = {
  token?: string
  version: string
  defaultLocationId?: string
  defaultLeadSource: string
  staffMap: Record<string, GhlStaffMapping>
}

export type GhlContact = Record<string, any>

export function getGhlClientConfig(): GhlClientConfig {
  return {
    token: process.env.GHL_PRIVATE_INTEGRATION_TOKEN,
    version: process.env.GHL_API_VERSION || DEFAULT_GHL_VERSION,
    defaultLocationId: process.env.GHL_LOCATION_ID,
    defaultLeadSource: process.env.GHL_DEFAULT_LEAD_SOURCE || DEFAULT_GHL_LEAD_SOURCE,
    staffMap: parseStaffMap(process.env.GHL_COACH_USER_MAP_JSON),
  }
}

export function getGhlStaffMapping(email?: string | null, config = getGhlClientConfig()): GhlStaffMapping | null {
  if (!email) return null
  const mapping = config.staffMap[email.trim().toLowerCase()] || null
  if (!mapping?.assignedTo || mapping.assignedTo.includes('USER_ID_DEL_MS')) return null
  return mapping
}

export async function resolveGhlStaffMapping(email: string | null | undefined, locationId: string | undefined, config = getGhlClientConfig()): Promise<GhlStaffMapping | null> {
  const configured = getGhlStaffMapping(email, config)
  if (configured) return configured
  if (!email || !locationId) return null

  const payload = await listGhlLocationUsers(locationId, config)
  const users = getUsersFromPayload(payload)
  const normalizedEmail = email.trim().toLowerCase()
  const user = users.find((item: any) => String(item?.email || '').trim().toLowerCase() === normalizedEmail)
  const assignedTo = user?.id || user?._id || user?.userId
  return assignedTo ? { assignedTo: String(assignedTo), locationId } : null
}

export function extractMiaUserIdFromGhlContact(contact: GhlContact | null | undefined): string | null {
  if (!contact) return null

  const directCandidates = [
    contact.miaUserId,
    contact.mia_user_id,
    contact.MIA_USER_ID,
    contact.customField?.miaUserId,
    contact.customField?.mia_user_id,
    contact.customFields?.miaUserId,
    contact.customFields?.mia_user_id,
  ]

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }

  const customFields = Array.isArray(contact.customFields) ? contact.customFields : []
  for (const field of customFields) {
    const key = String(field?.fieldKey || field?.key || field?.name || field?.id || '').toLowerCase()
    if (['miauserid', 'mia_user_id', 'contact.mia_user_id', 'custom.mia_user_id'].includes(key)) {
      const value = field?.value || field?.fieldValue
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
  }

  return null
}

export async function listGhlLocationUsers(locationId: string, config = getGhlClientConfig()) {
  assertGhlConfigured(config)
  return ghlFetch(`/users/?locationId=${encodeURIComponent(locationId)}`, { method: 'GET' }, config)
}

export async function searchGhlContacts(params: GhlContactSearchParams, config = getGhlClientConfig()) {
  assertGhlConfigured(config)

  const page = Math.max(1, Number(params.page || 1))
  const pageLimit = Math.min(100, Math.max(1, Number(params.pageLimit || 100)))
  const filters: Array<Record<string, unknown>> = []

  if (params.assignedTo) {
    filters.push({ field: 'assignedTo', operator: 'eq', value: params.assignedTo })
  }

  if (params.source) {
    filters.push({ field: 'source', operator: 'eq', value: params.source })
  }

  return ghlFetch('/contacts/search', {
    method: 'POST',
    body: JSON.stringify({
      locationId: params.locationId,
      page,
      pageLimit,
      filters,
    }),
  }, config)
}

export async function searchGhlOpportunities(params: GhlOpportunitySearchParams, config = getGhlClientConfig()) {
  assertGhlConfigured(config)
  const search = new URLSearchParams({
    location_id: params.locationId,
    assigned_to: params.assignedTo,
    limit: String(Math.min(100, Math.max(1, Number(params.limit || 100)))),
  })
  if (params.startAfter !== undefined) search.set('startAfter', String(params.startAfter))
  if (params.startAfterId) search.set('startAfterId', params.startAfterId)
  return ghlFetch(`/opportunities/search?${search.toString()}`, { method: 'GET' }, config)
}

export async function getGhlOpportunity(opportunityId: string, config = getGhlClientConfig()) {
  assertGhlConfigured(config)
  return ghlFetch(`/opportunities/${encodeURIComponent(opportunityId)}`, { method: 'GET' }, config)
}

export async function getGhlContact(contactId: string, config = getGhlClientConfig()) {
  assertGhlConfigured(config)
  return ghlFetch(`/contacts/${encodeURIComponent(contactId)}`, { method: 'GET' }, config)
}

export async function getGhlContactNotes(contactId: string, config = getGhlClientConfig()) {
  assertGhlConfigured(config)
  return ghlFetch(`/contacts/${encodeURIComponent(contactId)}/notes`, { method: 'GET' }, config)
}

export async function getGhlContactTasks(contactId: string, config = getGhlClientConfig()) {
  assertGhlConfigured(config)
  return ghlFetch(`/contacts/${encodeURIComponent(contactId)}/tasks`, { method: 'GET' }, config)
}

function assertGhlConfigured(config: GhlClientConfig) {
  if (!config.token) throw new GhlConfigurationError('Falta configurar GHL_PRIVATE_INTEGRATION_TOKEN.')
}

async function ghlFetch(path: string, init: RequestInit, config: GhlClientConfig) {
  const response = await fetch(`${GHL_API_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${config.token}`,
      Version: config.version,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  const text = await response.text()
  const payload = text ? safeJsonParse(text) : null

  if (!response.ok) {
    const detail = payload?.message || payload?.error || text || `GHL respondió ${response.status}`
    throw new GhlApiError(detail, response.status, payload)
  }

  return payload
}

function getUsersFromPayload(payload: any): any[] {
  return Array.isArray(payload?.users)
    ? payload.users
    : Array.isArray(payload?.data?.users)
      ? payload.data.users
      : Array.isArray(payload)
        ? payload
        : []
}

function parseStaffMap(raw?: string): Record<string, GhlStaffMapping> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, string | GhlStaffMapping>
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([email, value]) => {
        const normalizedEmail = email.trim().toLowerCase()
        if (!normalizedEmail) return []
        if (typeof value === 'string') return [[normalizedEmail, { assignedTo: value }]]
        if (value?.assignedTo) return [[normalizedEmail, value]]
        return []
      }),
    )
  } catch {
    return {}
  }
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

export class GhlConfigurationError extends Error {
  code = 'GHL_CONFIGURATION_ERROR'
}

export class GhlApiError extends Error {
  code = 'GHL_API_ERROR'
  constructor(message: string, public status: number, public payload: unknown) {
    super(message)
  }
}
