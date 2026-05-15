import { gql } from 'graphql-request'
import { apiClient } from './client'
import type {
  AdminUserDetail,
  AdminUserSummary,
  Simulator,
  SimulatorAccessType,
  SimulatorStatus,
  UserAccess,
  UserAccessStatus,
  UserStatus,
} from '@/types/rentabilidad'

export type SystemAdminUser = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

type AdminGraphQLResponse<TData> = {
  data?: TData
  errors?: Array<{ message?: string }>
}

const ADMIN_ME = gql`
  query AdminMe {
    adminMe {
      id
      name
      email
      role
      isActive
    }
  }
`

const LIST_MIA_USERS = gql`
  query AdminMiaUsers($search: String) {
    adminMiaUsers(search: $search) {
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
      configs {
        id
        userId
        pillars
        entities
        currencies
        updatedAt
      }
      simulatorResponses {
        id
        userId
        simulatorKey
        input
        result
        status
        completedAt
        createdAt
        updatedAt
      }
    }
  }
`


const LIST_MIA_USERS_LEGACY = gql`
  query AdminMiaUsersLegacy($search: String) {
    adminMiaUsers(search: $search) {
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
      configs {
        id
        userId
        pillars
        entities
        currencies
        updatedAt
      }
    }
  }
`

const GET_MIA_USER = gql`
  query AdminMiaUser($userId: String!) {
    adminMiaUser(userId: $userId) {
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
      configs {
        id
        userId
        pillars
        entities
        currencies
        updatedAt
      }
      simulatorResponses {
        id
        userId
        simulatorKey
        input
        result
        status
        completedAt
        createdAt
        updatedAt
      }
      rentabilidadData
    }
  }
`


const GET_MIA_USER_LEGACY = gql`
  query AdminMiaUserLegacy($userId: String!) {
    adminMiaUser(userId: $userId) {
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
      configs {
        id
        userId
        pillars
        entities
        currencies
        updatedAt
      }
      rentabilidadData
    }
  }
`

const UPDATE_MIA_USER = gql`
  mutation AdminUpdateMiaUser(
    $userId: String!
    $name: String
    $email: String
    $phone: String
    $baseCurrency: String
    $hasCompletedOnboarding: Boolean
  ) {
    adminUpdateMiaUser(
      userId: $userId
      name: $name
      email: $email
      phone: $phone
      baseCurrency: $baseCurrency
      hasCompletedOnboarding: $hasCompletedOnboarding
    ) {
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
    }
  }
`

const CREATE_MIA_USER = gql`
  mutation AdminCreateMiaUser(
    $email: String!
    $name: String
    $phone: String
    $baseCurrency: String
  ) {
    adminCreateMiaUser(
      email: $email
      name: $name
      phone: $phone
      baseCurrency: $baseCurrency
    ) {
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
    }
  }
`

const GRANT_MIA_TOOL_ACCESS = gql`
  mutation AdminGrantMiaToolAccess(
    $userId: String!
    $toolName: String!
    $accessType: String!
    $days: Float
  ) {
    adminGrantMiaToolAccess(
      userId: $userId
      toolName: $toolName
      accessType: $accessType
      days: $days
    )
  }
`

const REVOKE_MIA_TOOL_ACCESS = gql`
  mutation AdminRevokeMiaToolAccess($userId: String!, $toolName: String!) {
    adminRevokeMiaToolAccess(userId: $userId, toolName: $toolName)
  }
`

const ADMIN_SIMULATORS = gql`
  query AdminSimulators {
    adminSimulators {
      id
      key
      name
      description
      status
      accessType
      demoDays
      updatedAt
    }
  }
`

const ADMIN_UPDATE_SIMULATOR = gql`
  mutation AdminUpdateSimulator(
    $id: String!
    $status: String
    $accessType: String
    $demoDays: Float
  ) {
    adminUpdateSimulator(
      id: $id
      status: $status
      accessType: $accessType
      demoDays: $demoDays
    ) {
      id
      key
      name
      description
      status
      accessType
      demoDays
      updatedAt
    }
  }
`

const PUBLIC_SIMULATORS = gql`
  query PublicSimulators {
    simulators {
      id
      key
      name
      description
      status
      accessType
      demoDays
    }
  }
`

function mapSimulator(sim: any): Simulator {
  return {
    id: sim.id || sim.key || sim.slug,
    slug: sim.key || sim.slug,
    name: sim.name,
    description: sim.description,
    status: sim.status as SimulatorStatus,
    accessType: normalizeAccessType(sim.accessType),
    demoDays: sim.demoDays,
    updatedAt: sim.updatedAt,
  }
}

async function adminGraphQLRequest<TData>(query: string, variables?: Record<string, unknown>): Promise<TData> {
  const response = await fetch('/api/admin/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as AdminGraphQLResponse<TData> | null

  if (!response.ok || payload?.errors?.length || !payload?.data) {
    throw new Error(payload?.errors?.[0]?.message || `No se pudo consultar el admin API (${response.status})`)
  }

  return payload.data
}

function getSimulatorLabel(slug?: string) {
  const labels: Record<string, string> = {
    rentabilidad: 'Calculadora de Rentabilidad',
    'perfil-riesgo': 'Perfil de Riesgo',
    'numero-dorado': 'Número Dorado',
  }
  return labels[String(slug || '').toLowerCase()] || slug || 'Simulador'
}

function normalizeAccessType(accessType?: string): SimulatorAccessType {
  const value = (accessType || '').toLowerCase()
  if (value === 'demo') return 'demo'
  if (value === 'paid' || value === 'full') return 'paid'
  if (value === 'admin_only') return 'admin_only'
  return 'free'
}

function normalizeAccessStatus(status?: string, expiresAt?: string | null): UserAccessStatus {
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return 'expired'
  }

  const value = (status || '').toLowerCase()
  if (value === 'enabled' || value === 'active') return 'active'
  if (value === 'expired') return 'expired'
  return 'revoked'
}

function mapAccess(access: any, userId: string): UserAccess {
  return {
    id: access.id,
    userId,
    simulatorId: access.toolName,
    simulatorSlug: access.toolName,
    simulatorName: getSimulatorLabel(access.toolName),
    toolName: access.toolName,
    accessType: normalizeAccessType(access.accessType),
    status: normalizeAccessStatus(access.status, access.expiresAt),
    expiresAt: access.expiresAt ?? null,
    notes: access.usageCount !== undefined ? `Uso: ${access.usageCount}` : undefined,
  }
}

function deriveUserStatusFromAccesses(accesses: UserAccess[]): UserStatus {
  if (accesses.length === 0) return 'blocked'

  const activeAccesses = accesses.filter(access => access.status === 'active')
  if (activeAccesses.some(access => access.accessType === 'paid')) return 'paid'
  if (activeAccesses.some(access => access.accessType === 'demo')) return 'demo'
  if (activeAccesses.length > 0) return 'active'

  if (accesses.some(access => access.status === 'expired')) return 'expired'
  return 'blocked'
}

function mapMiaUser(user: any): AdminUserSummary {
  const config = user.configs
  const accesses = (user.accesses || []).map((access: any) => mapAccess(access, user.id))

  return {
    id: user.id,
    name: user.name || 'Sin nombre',
    email: user.email,
    phone: user.phone || '',
    baseCurrency: user.baseCurrency || 'COP',
    role: 'user',
    status: deriveUserStatusFromAccesses(accesses),
    registeredAt: user.registeredAt,
    lastSeenAt: user.updatedAt,
    hasCompletedOnboarding: Boolean(user.hasCompletedOnboarding),
    accesses,
    simulatorResponses: Array.isArray(user.simulatorResponses) ? user.simulatorResponses : [],
    investmentCount: Array.isArray(user.rentabilidadData?.investments) ? user.rentabilidadData.investments.length : 0,
    transactionCount: Array.isArray(user.rentabilidadData?.transactions) ? user.rentabilidadData.transactions.length : 0,
    snapshotCount: Array.isArray(user.rentabilidadData?.snapshots) ? user.rentabilidadData.snapshots.length : 0,
    pdfDownloadCount: 0,
    rentabilidadData: user.rentabilidadData
      ? {
          config: {
            baseCurrency: user.rentabilidadData.config?.baseCurrency || user.baseCurrency || 'COP',
            pillars: Array.isArray(user.rentabilidadData.config?.pillars) ? user.rentabilidadData.config.pillars : [],
            entities: Array.isArray(user.rentabilidadData.config?.entities) ? user.rentabilidadData.config.entities : [],
            currencies: Array.isArray(user.rentabilidadData.config?.currencies) ? user.rentabilidadData.config.currencies : [],
          },
          investments: Array.isArray(user.rentabilidadData.investments) ? user.rentabilidadData.investments : [],
          transactions: Array.isArray(user.rentabilidadData.transactions) ? user.rentabilidadData.transactions : [],
          snapshots: Array.isArray(user.rentabilidadData.snapshots) ? user.rentabilidadData.snapshots : [],
          lastUpdated: user.rentabilidadData.lastUpdated || config?.updatedAt || user.updatedAt,
        }
      : config
        ? {
            config: {
              baseCurrency: user.baseCurrency || 'COP',
              pillars: Array.isArray(config.pillars) ? config.pillars : [],
              entities: Array.isArray(config.entities) ? config.entities : [],
              currencies: Array.isArray(config.currencies) ? config.currencies : [],
            },
            investments: [],
            transactions: [],
            snapshots: [],
            lastUpdated: config.updatedAt || user.updatedAt,
          }
        : null,
  } as AdminUserSummary
}

function getToolNameFromSimulatorId(simulatorId: string): string {
  return simulatorId === 'rentabilidad' ? 'rentabilidad' : simulatorId
}

export const adminApi = {
  async me() {
    const response = await adminGraphQLRequest<{ adminMe: SystemAdminUser }>(ADMIN_ME)
    return response.adminMe
  },

  async listUsers(filters?: { search?: string; status?: string; role?: string }) {
    const variables = { search: filters?.search || undefined }

    try {
      const response = await adminGraphQLRequest<{ adminMiaUsers: any[] }>(LIST_MIA_USERS, variables)
      return (response.adminMiaUsers || []).map(mapMiaUser) as AdminUserSummary[]
    } catch (error) {
      const response = await adminGraphQLRequest<{ adminMiaUsers: any[] }>(LIST_MIA_USERS_LEGACY, variables)
      return (response.adminMiaUsers || []).map(mapMiaUser) as AdminUserSummary[]
    }
  },

  async getUserDetail(id: string) {
    try {
      const response = await adminGraphQLRequest<{ adminMiaUser: any | null }>(GET_MIA_USER, { userId: id })
      return response.adminMiaUser ? (mapMiaUser(response.adminMiaUser) as AdminUserDetail) : null
    } catch (error) {
      const response = await adminGraphQLRequest<{ adminMiaUser: any | null }>(GET_MIA_USER_LEGACY, { userId: id })
      return response.adminMiaUser ? (mapMiaUser(response.adminMiaUser) as AdminUserDetail) : null
    }
  },

  async createUser(input: { email: string; name?: string; phone?: string; baseCurrency?: string }) {
    const response = await adminGraphQLRequest<{ adminCreateMiaUser: any }>(CREATE_MIA_USER, {
      ...input,
    })
    return mapMiaUser(response.adminCreateMiaUser) as AdminUserSummary
  },

  async updateUser(
    id: string,
    input: {
      name?: string
      email?: string
      phone?: string
      baseCurrency?: string
      hasCompletedOnboarding?: boolean
      role?: string
      status?: string
    },
  ) {
    const { role: _role, status: _status, ...supportedInput } = input
    const response = await adminGraphQLRequest<{ adminUpdateMiaUser: any }>(UPDATE_MIA_USER, {
      userId: id,
      ...supportedInput,
    })
    return mapMiaUser(response.adminUpdateMiaUser) as AdminUserSummary
  },

  async listSimulators() {
    try {
      const response = await adminGraphQLRequest<{ adminSimulators: any[] }>(ADMIN_SIMULATORS)
      return (response.adminSimulators || []).map(mapSimulator)
    } catch (error) {
      return adminApi.listPublicSimulators()
    }
  },

  async updateSimulator(
    id: string,
    input: { status?: SimulatorStatus; accessType?: SimulatorAccessType; demoDays?: number | null },
  ) {
    const response = await adminGraphQLRequest<{ adminUpdateSimulator: any }>(ADMIN_UPDATE_SIMULATOR, {
      id,
      status: input.status,
      accessType: input.accessType === 'paid' ? 'FULL' : input.accessType?.toUpperCase(),
      demoDays: input.demoDays,
    })
    return mapSimulator(response.adminUpdateSimulator)
  },

  async listPublicSimulators() {
    const response = await fetch('/api/simulators', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(payload?.error || 'No se pudo cargar el catálogo de simuladores.')
    }

    return (payload?.simulators || []).map(mapSimulator)
  },

  async grantAccess(input: {
    userId: string
    simulatorId: string
    accessType: SimulatorAccessType
    status?: UserAccessStatus
    expiresAt?: string | null
    notes?: string
  }) {
    const toolName = getToolNameFromSimulatorId(input.simulatorId)
    const days = input.status === 'expired'
      ? -1
      : input.expiresAt
      ? Math.max(1, Math.ceil((new Date(input.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : undefined

    await adminGraphQLRequest<{ adminGrantMiaToolAccess: boolean }>(GRANT_MIA_TOOL_ACCESS, {
      userId: input.userId,
      toolName,
      accessType: input.accessType === 'paid' ? 'FULL' : input.accessType.toUpperCase(),
      days,
    })

    return {
      id: `${input.userId}-${toolName}`,
      userId: input.userId,
      simulatorId: toolName,
      simulatorSlug: toolName,
      simulatorName: toolName === 'rentabilidad' ? 'Calculadora de Rentabilidad' : toolName,
      toolName,
      accessType: input.accessType,
      status: input.status || 'active',
      expiresAt: input.expiresAt ?? null,
      notes: input.notes,
    } as UserAccess
  },

  async updateAccess(id: string, input: { status?: UserAccessStatus; expiresAt?: string | null; notes?: string; userId?: string; toolName?: string }) {
    // El backend actual solo tiene grant/revoke por userId + toolName.
    // La página de detalle recarga el usuario después de llamar esta acción.
    return { id, status: input.status || 'active', expiresAt: input.expiresAt ?? null, notes: input.notes }
  },

  async revokeAccess(userId: string, toolName: string) {
    const response = await adminGraphQLRequest<{ adminRevokeMiaToolAccess: boolean }>(REVOKE_MIA_TOOL_ACCESS, {
      userId,
      toolName,
    })
    return Boolean(response.adminRevokeMiaToolAccess)
  },
}
