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
  registeredAt: string
  hasCompletedOnboarding: boolean
}

export type RegisterInput = {
  name: string
  email: string
  phone: string
  baseCurrency: string
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
  | 'trm_manual_override'

// Computed flow fields (derived, not stored)
export type ComputedFlows = {
  flowLocal?: number
  flowUSD?: number
  flowLocalAsUSD?: number
}
