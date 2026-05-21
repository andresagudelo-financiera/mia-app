// ============================================================
// MIA Platform — Core TypeScript Types
// ============================================================

export type DashboardSettings = {
  /** Objetivo configurable por pilar en la moneda base del usuario. */
  pillarTargets?: Record<string, number>
  /** Meta patrimonial global configurable: equivalente al Número Dorado del Excel. */
  goldenNumberTarget?: number
}

export type Config = {
  baseCurrency: string
  pillars: string[]
  entities: string[]
  currencies: string[]
  dashboardSettings?: DashboardSettings
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
  utm_source?: string | null
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
  | 'calculator_shared'
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

export type UserRole = 'user' | 'admin' | 'coach' | 'money_strategist'

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

export type GenericSimulatorResponse = {
  id: string
  userId: string
  simulatorKey: string
  input?: unknown
  result?: unknown
  status: string
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type AdminUserSummary = UserProfile & {
  investmentCount?: number
  transactionCount?: number
  snapshotCount?: number
  pdfDownloadCount?: number
  lastSimulatorUsed?: string
  simulatorResponses?: GenericSimulatorResponse[]
}

export type AdminUserDetail = AdminUserSummary & {
  usageEvents?: UsageEvent[]
  rentabilidadData?: RentabilidadStoreData | null
}

// ============================================================
// Challenges / Retos
// ============================================================

export type ChallengeStep = {
  id: string
  challengeKey: string
  simulatorKey: string
  title: string
  description?: string | null
  stepOrder: number
  status: string
  unlockRule: 'always' | 'complete_previous' | 'complete_specific_simulator' | 'date_based' | 'manual_unlock' | string
  unlocksAt?: string | null
  requiredSimulatorKey?: string | null
  requiredStatus?: string | null
  isUnlocked: boolean
  isCompleted: boolean
  lockedReason?: string | null
  availableAt?: string | null
  simulator?: any
  metadata?: any
  createdAt?: string
  updatedAt?: string
}

export type ChallengeProgress = {
  id?: string | null
  userId?: string | null
  challengeKey: string
  currentStep: number
  completedSteps: string[]
  unlockedSteps: string[]
  progressPercent: number
  completedCount: number
  totalSteps: number
  status: 'not_started' | 'in_progress' | 'completed' | string
  startedAt?: string | null
  completedAt?: string | null
  lastActivityAt?: string | null
}

export type Challenge = {
  id: string
  key: string
  name: string
  description?: string | null
  status: string
  accessType: SimulatorAccessType | string
  startsAt?: string | null
  endsAt?: string | null
  metadata?: any
  steps: ChallengeStep[]
  progress: ChallengeProgress
  stats?: ChallengeStats | null
  createdAt?: string
  updatedAt?: string
}

export type ChallengeStats = {
  challengeKey: string
  startedUsers: number
  completedUsers: number
  completionRate: number
  stepCompletions: Array<{ simulatorKey: string; total: number }>
  eventsByName: Array<{ eventName: string; total: number }>
}

// ============================================================
// Academy / Plataforma de estudio
// ============================================================

export type AcademyAccessState = {
  hasAccess: boolean
  reason: string
  accessType?: string | null
  expiresAt?: string | null
  lockedMessage?: string | null
}

export type AcademyCourseProgress = {
  enrollmentId?: string | null
  status: string
  progressPercent: number
  completedLessons: number
  totalLessons: number
  startedAt?: string | null
  completedAt?: string | null
  lastActivityAt?: string | null
}

export type AcademyLessonProgress = {
  id?: string | null
  status: string
  progressPercent: number
  lastPositionSeconds: number
  startedAt?: string | null
  completedAt?: string | null
  lastActivityAt?: string | null
}

export type AcademyLessonResource = {
  id: string
  lessonId: string
  title: string
  resourceType: string
  url: string
  resourceOrder: number
  metadata?: any
}

export type AcademyLesson = {
  id: string
  courseId: string
  moduleId: string
  slug: string
  title: string
  description?: string | null
  lessonType: string
  lessonOrder: number
  status: string
  accessType: string
  isDemo: boolean
  isLive: boolean
  videoProvider?: string | null
  youtubeVideoId?: string | null
  youtubeUrl?: string | null
  embedUrl?: string | null
  liveStartsAt?: string | null
  liveEndsAt?: string | null
  replayAvailable: boolean
  durationSeconds?: number | null
  linkedSimulatorKey?: string | null
  linkedChallengeKey?: string | null
  isUnlocked: boolean
  lockedReason?: string | null
  progress: AcademyLessonProgress
  resources: AcademyLessonResource[]
  metadata?: any
  createdAt: string
  updatedAt: string
}

export type AcademyModuleItem = {
  id: string
  courseId: string
  title: string
  description?: string | null
  moduleOrder: number
  status: string
  unlockRule: string
  unlocksAt?: string | null
  isUnlocked: boolean
  lockedReason?: string | null
  lessons: AcademyLesson[]
  metadata?: any
  createdAt: string
  updatedAt: string
}

export type AcademyCourse = {
  id: string
  key: string
  slug: string
  title: string
  description?: string | null
  status: string
  accessType: string
  level?: string | null
  coverImageUrl?: string | null
  estimatedMinutes?: number | null
  publishedAt?: string | null
  access: AcademyAccessState
  progress: AcademyCourseProgress
  modules: AcademyModuleItem[]
  metadata?: any
  createdAt: string
  updatedAt: string
}

export type AcademyQuizQuestion = {
  id: string
  quizId: string
  questionText: string
  questionType: string
  options: string[]
  questionOrder: number
  points: number
  explanation?: any
}

export type AcademyQuiz = {
  id: string
  courseId: string
  lessonId: string
  title: string
  description?: string | null
  passingScore: number
  maxAttempts: number
  questions: AcademyQuizQuestion[]
}

export type AcademyQuizAttempt = {
  id: string
  quizId: string
  userId: string
  score: number
  passed: boolean
  answers: Record<string, string>
  feedback?: any
  createdAt: string
}

export type AcademyCertificate = {
  id: string
  userId: string
  subjectType: string
  subjectKey: string
  title: string
  verificationCode: string
  issuedAt: string
}

export type AcademyLearningPath = {
  id: string
  key: string
  slug: string
  title: string
  description?: string | null
  status: string
  accessType: string
  courses: Array<{ courseKey: string; courseOrder: number; title?: string | null; isCompleted: boolean }>
  certificate?: AcademyCertificate | null
}
