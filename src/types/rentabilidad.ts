// ============================================================
// MIA Platform — Core TypeScript Types
// ============================================================

export type Config = {
  baseCurrency: string
  pillars: string[]
  entities: string[]
  currencies: string[]
}

export type Investment = {
  id: string
  pilar: string
  name: string
  entity: string
  currency: string
  createdAt: string // ISO string
}

export type Transaction = {
  id: string
  investmentName: string
  entity: string
  currency: string
  date: string // ISO string
  amountLocal: number
  trm?: number
  note?: string
}

export type Snapshot = {
  id: string
  investmentName: string
  entity: string
  currency: string
  cutDate: string // ISO string
  valueLocal?: number
  valueUSD?: number
  trmCut?: number
}

export type InvestmentResult = {
  investment: Investment
  // Dimensión A — Moneda local
  totalInvestedLocal?: number
  currentValueLocal?: number
  gainLossLocal?: number
  irrLocal?: number | null
  // Dimensión B — USD
  totalInvestedUSD?: number
  currentValueUSD?: number
  gainLossUSD?: number
  irrUSD?: number | null
  // Dimensión C — USD → local
  currentTRM: number
  totalInvestedUSDtoLocal?: number
  currentValueUSDtoLocal?: number
  gainLossUSDtoLocal?: number
  irrUSDtoLocal?: number | null
}

export type UserProfile = {
  id: string
  name: string
  email: string
  phone: string
  baseCurrency: string
  role?: UserRole
  status?: UserStatus
  registeredAt: string
  lastSeenAt?: string
  hasCompletedOnboarding: boolean
  hasPassword?: boolean
  accesses?: UserAccess[]
}

export type RegisterInput = {
  name: string
  email: string
  phone: string
  baseCurrency: string
  password: string
}

export type RentabilidadStoreData = {
  config: Config
  investments: Investment[]
  transactions: Transaction[]
  snapshots: Snapshot[]
  lastUpdated: string
}

export type AnalyticsEvent =
  | 'cta_hero_click'
  | 'calculator_started'
  | 'investment_added'
  | 'transaction_added'
  | 'snapshot_added'
  | 'results_viewed'
  | 'pdf_downloaded'
  | 'user_registered'
  | 'user_password_created'
  | 'user_login'
  | 'trm_manual_override'

// Computed flow fields (derived, not stored)
export type ComputedFlows = {
  flowLocal?: number
  flowUSD?: number
  flowLocalAsUSD?: number
}

// ============================================================
// Admin / Access Control Types
// ============================================================

export type UserRole = 'user' | 'admin'

export type UserStatus = 'active' | 'demo' | 'expired' | 'blocked' | 'paid'

export type SimulatorStatus = 'active' | 'disabled' | 'coming_soon' | 'hidden'

export type SimulatorAccessType = 'free' | 'demo' | 'paid' | 'admin_only'

export type UserAccessStatus = 'active' | 'expired' | 'revoked'

export type Simulator = {
  id: string
  slug: string
  name: string
  description?: string
  status: SimulatorStatus
  accessType: SimulatorAccessType
  demoDays?: number | null
  createdAt?: string
  updatedAt?: string
}

export type UserAccess = {
  id: string
  userId: string
  simulatorId?: string
  simulatorSlug?: string
  simulatorName?: string
  toolName?: string
  accessType: SimulatorAccessType
  status: UserAccessStatus
  startsAt?: string
  expiresAt?: string | null
  createdAt?: string
  createdBy?: string
  notes?: string
}

export type UsageEvent = {
  id: string
  userId: string
  simulatorId?: string
  simulatorSlug?: string
  eventName: AnalyticsEvent | string
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export type AdminUserSummary = UserProfile & {
  investmentCount?: number
  transactionCount?: number
  snapshotCount?: number
  pdfDownloadCount?: number
  lastSimulatorUsed?: string
}

export type AdminUserDetail = AdminUserSummary & {
  usageEvents?: UsageEvent[]
  rentabilidadData?: RentabilidadStoreData | null
}
