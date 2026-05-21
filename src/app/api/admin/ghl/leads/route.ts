import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { miaAdminGraphQL } from '@/lib/mia-admin-client'
import {
  GhlApiError,
  GhlConfigurationError,
  extractMiaUserIdFromGhlContact,
  getGhlClientConfig,
  resolveGhlStaffMapping,
  searchGhlOpportunities,
} from '@/lib/ghl/client'

export const dynamic = 'force-dynamic'

const STAFF_PANEL_ROLES = new Set(['admin', 'coach', 'money_strategist'])

function getOpportunitiesFromPayload(payload: any) {
  return Array.isArray(payload?.opportunities)
    ? payload.opportunities
    : Array.isArray(payload?.data?.opportunities)
      ? payload.data.opportunities
      : Array.isArray(payload)
        ? payload
        : []
}

const DEFAULT_SIMULATOR_SOURCES = ['rentabilidad']

function normalizeSource(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function parseAllowedSources(value?: string | null) {
  return String(value || '')
    .split(',')
    .map(item => normalizeSource(item))
    .filter(Boolean)
}


async function findMiaUsersByEmails(emails: string[], adminToken?: string | null) {
  const normalizedEmails = Array.from(new Set(emails.map(email => email.trim().toLowerCase()).filter(Boolean)))
  if (!normalizedEmails.length || !adminToken) return new Map<string, any>()

  const userFields = `
    id
    name
    email
    phone
    baseCurrency
    registeredAt
    hasCompletedOnboarding
    updatedAt
    accesses {
      id
      toolName
      status
      accessType
      expiresAt
      usageCount
    }
    simulatorResponses {
      id
      simulatorKey
      status
      completedAt
      createdAt
      updatedAt
    }
  `

  try {
    const data = await miaAdminGraphQL<{ adminMiaUsersByEmails: any[] }>(`
      query AdminMiaUsersByEmails($emails: [String!]!) {
        adminMiaUsersByEmails(emails: $emails) {
          ${userFields}
        }
      }
    `, { emails: normalizedEmails }, adminToken)

    return new Map((data.adminMiaUsersByEmails || []).map(user => [String(user.email || '').toLowerCase(), user]))
  } catch (error) {
    // Backward-compatible fallback for running backends that do not yet expose adminMiaUsersByEmails.
    const users: any[] = []
    await Promise.all(normalizedEmails.map(async (email) => {
      try {
        const data = await miaAdminGraphQL<{ adminMiaUsers: any[] }>(`
          query AdminMiaUsers($search: String) {
            adminMiaUsers(search: $search) {
              ${userFields}
            }
          }
        `, { search: email }, adminToken)
        users.push(...(data.adminMiaUsers || []).filter(user => String(user.email || '').toLowerCase() === email))
      } catch (fallbackError) {
        console.warn('Could not resolve MIA user by email:', email, fallbackError instanceof Error ? fallbackError.message : fallbackError)
      }
    }))

    return new Map(users.map(user => [String(user.email || '').toLowerCase(), user]))
  }
}

function mapOpportunityToLead(opportunity: any, miaUser?: any) {
  const contact = opportunity.contact || {}
  const contactId = opportunity.contactId || contact.id || null
  const contactName = contact.name || contact.contactName || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || 'Lead sin nombre'

  return {
    id: contactId || opportunity.id,
    contactId,
    opportunityId: opportunity.id,
    name: contactName,
    contactName,
    firstName: contact.firstName || null,
    lastName: contact.lastName || null,
    email: contact.email || null,
    phone: contact.phone || null,
    source: opportunity.source || null,
    assignedTo: opportunity.assignedTo || null,
    dateAdded: opportunity.createdAt || opportunity.lastStageChangeAt || null,
    dateUpdated: opportunity.updatedAt || opportunity.lastStatusChangeAt || null,
    tags: contact.tags || [],
    miaUserId: miaUser?.id || extractMiaUserIdFromGhlContact(contact),
    miaUser: miaUser ? {
      id: miaUser.id,
      name: miaUser.name,
      email: miaUser.email,
      phone: miaUser.phone,
      baseCurrency: miaUser.baseCurrency,
      registeredAt: miaUser.registeredAt,
      hasCompletedOnboarding: miaUser.hasCompletedOnboarding,
      updatedAt: miaUser.updatedAt,
      accesses: miaUser.accesses || [],
      simulatorResponses: miaUser.simulatorResponses || [],
    } : null,
    opportunity: {
      id: opportunity.id,
      name: opportunity.name || '',
      source: opportunity.source || null,
      status: opportunity.status || null,
      monetaryValue: opportunity.monetaryValue ?? 0,
      pipelineId: opportunity.pipelineId || null,
      pipelineStageId: opportunity.pipelineStageId || opportunity.pipelineStageUId || null,
      assignedTo: opportunity.assignedTo || null,
      createdAt: opportunity.createdAt || null,
      updatedAt: opportunity.updatedAt || null,
      lastStageChangeAt: opportunity.lastStageChangeAt || null,
      lastStatusChangeAt: opportunity.lastStatusChangeAt || null,
    },
  }
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (!token || !STAFF_PANEL_ROLES.has(String(token.role || '')) || token.isActive !== true) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const config = getGhlClientConfig()
  const isAdmin = token.role === 'admin'
  const searchParams = request.nextUrl.searchParams
  const requestedLocationId = (isAdmin ? searchParams.get('locationId') : null) || config.defaultLocationId

  if (!requestedLocationId) {
    return NextResponse.json({
      error: 'Falta configurar locationId de GHL.',
      code: 'GHL_LOCATION_MISSING',
      requiredEnv: 'GHL_LOCATION_ID',
    }, { status: 412 })
  }

  try {
    const mapping = await resolveGhlStaffMapping(String(token.email || ''), requestedLocationId, config)
    const assignedTo = isAdmin ? (searchParams.get('assignedTo') || mapping?.assignedTo || undefined) : mapping?.assignedTo
    const locationId = (isAdmin ? searchParams.get('locationId') : null) || mapping?.locationId || requestedLocationId

    if (!assignedTo) {
      return NextResponse.json({
        contacts: [],
        meta: {
          assignedTo: null,
          locationId,
          source: searchParams.get('source') || null,
          total: 0,
          warning: 'No encontramos en GHL un usuario staff con el email de esta sesión.',
        },
      })
    }

    const requestedSource = searchParams.get('source')
    const allowedSources = parseAllowedSources(process.env.GHL_ALLOWED_SIMULATOR_SOURCES).length > 0
      ? parseAllowedSources(process.env.GHL_ALLOWED_SIMULATOR_SOURCES)
      : DEFAULT_SIMULATOR_SOURCES
    const source = requestedSource && requestedSource !== 'all' ? requestedSource : null
    const effectiveSources = source ? [normalizeSource(source)] : allowedSources

    const payload = await searchGhlOpportunities({
      assignedTo,
      locationId,
      limit: Number(searchParams.get('pageLimit') || 100),
      startAfter: searchParams.get('startAfter') || undefined,
      startAfterId: searchParams.get('startAfterId') || undefined,
    }, config)

    const opportunities = getOpportunitiesFromPayload(payload)
    const filteredOpportunities = opportunities.filter((opportunity: any) => effectiveSources.includes(normalizeSource(opportunity.source)))
    const emails = filteredOpportunities.map((opportunity: any) => opportunity.contact?.email).filter(Boolean)
    const miaUsersByEmail = await findMiaUsersByEmails(emails, String(token.adminToken || ''))
    const contacts = filteredOpportunities.map((opportunity: any) => {
      const email = String(opportunity.contact?.email || '').toLowerCase()
      return mapOpportunityToLead(opportunity, miaUsersByEmail.get(email))
    })

    return NextResponse.json({
      contacts,
      opportunities: filteredOpportunities,
      meta: {
        assignedTo,
        locationId,
        source: source || effectiveSources.join(','),
        pageLimit: Number(searchParams.get('pageLimit') || 100),
        total: contacts.length,
        rawTotal: payload?.meta?.total || opportunities.length,
        nextPageUrl: payload?.meta?.nextPageUrl || null,
        startAfter: payload?.meta?.startAfter || null,
        startAfterId: payload?.meta?.startAfterId || null,
      },
      raw: process.env.NODE_ENV === 'development' ? payload : undefined,
    })
  } catch (error) {
    if (error instanceof GhlConfigurationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }
    if (error instanceof GhlApiError) {
      return NextResponse.json({ error: error.message, code: error.code, details: error.payload }, { status: error.status || 502 })
    }
    const message = error instanceof Error ? error.message : 'Error consultando oportunidades GHL'
    return NextResponse.json({ error: message, code: 'GHL_UNKNOWN_ERROR' }, { status: 502 })
  }
}
