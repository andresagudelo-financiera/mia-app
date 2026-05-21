import type { Investment, Transaction, Snapshot, InvestmentResult } from '@/types/rentabilidad'
import { xirr, buildXIRRDimA, buildXIRRDimB, buildXIRRDimC } from '@/lib/xirr'

// ============================================================
// Computed flow fields
// ============================================================

export function computeFlowLocal(amountLocal: number): number {
  return -amountLocal
}

export function computeFlowUSD(amountLocal: number, trm: number): number {
  return -(amountLocal / trm)
}

export function computeFlowLocalAsUSD(amountLocal: number): number {
  return -amountLocal
}

export function computeValueLocalFromUSD(valueUSD: number, trmCut: number): number {
  return valueUSD * trmCut
}

// ============================================================
// Transaction computed flows
// ============================================================

export function getTransactionFlows(
  tx: Transaction,
  baseCurrency: string
): { flowLocal?: number; flowUSD?: number; flowLocalAsUSD?: number } {
  if (tx.currency === baseCurrency) {
    return { flowLocal: computeFlowLocal(tx.amountLocal) }
  } else if (tx.currency === 'USD' && tx.trm) {
    return {
      flowUSD: computeFlowUSD(tx.amountLocal, tx.trm),
      flowLocalAsUSD: computeFlowLocalAsUSD(tx.amountLocal),
    }
  }
  return {}
}

// ============================================================
// Snapshot helpers
// ============================================================

export function getLatestSnapshot(
  snapshots: Snapshot[],
  investmentName: string
): Snapshot | null {
  const invSnaps = snapshots
    .filter(s => s.investmentName === investmentName)
    .sort((a, b) => new Date(b.cutDate).getTime() - new Date(a.cutDate).getTime())
  return invSnaps[0] ?? null
}

// ============================================================
// Investment result computation
// ============================================================

export function computeInvestmentResult(
  inv: Investment,
  transactions: Transaction[],
  snapshots: Snapshot[],
  trm: number,
  baseCurrency: string
): InvestmentResult {
  const invTxs = transactions.filter(t => t.investmentName === inv.name)
  const latestSnap = getLatestSnapshot(snapshots, inv.name)

  const result: InvestmentResult = {
    investment: inv,
    currentTRM: trm,
  }

  if (!latestSnap) return result

  // Enrich transactions with computed flows
  const enrichedTxs = invTxs.map(tx => ({
    ...tx,
    ...getTransactionFlows(tx, baseCurrency),
  }))

  if (inv.currency === baseCurrency) {
    // Dimension A — Local currency
    const dimA = buildXIRRDimA(enrichedTxs, latestSnap)
    result.totalInvestedLocal = invTxs.reduce((sum, t) => sum + t.amountLocal, 0)
    result.currentValueLocal = latestSnap.valueLocal
    if (result.totalInvestedLocal !== undefined && result.currentValueLocal !== undefined) {
      result.gainLossLocal = result.currentValueLocal - result.totalInvestedLocal
    }
    result.irrLocal = dimA ? xirr(dimA.flows, dimA.dates) : null
  } else if (inv.currency === 'USD') {
    // Dimension B — USD
    const dimB = buildXIRRDimB(enrichedTxs, latestSnap)
    result.totalInvestedUSD = invTxs.reduce((sum, t) => {
      if (t.trm) return sum + t.amountLocal / t.trm
      return sum
    }, 0)
    result.currentValueUSD = latestSnap.valueUSD
    if (result.totalInvestedUSD !== undefined && result.currentValueUSD !== undefined) {
      result.gainLossUSD = result.currentValueUSD - result.totalInvestedUSD
    }
    result.irrUSD = dimB ? xirr(dimB.flows, dimB.dates) : null

    // Dimension C — USD expressed in local currency
    const dimC = buildXIRRDimC(enrichedTxs, latestSnap)
    result.totalInvestedUSDtoLocal = invTxs.reduce((sum, t) => sum + t.amountLocal, 0)
    result.currentValueUSDtoLocal = latestSnap.valueUSD !== undefined
      ? latestSnap.valueUSD * trm
      : undefined
    if (result.totalInvestedUSDtoLocal !== undefined && result.currentValueUSDtoLocal !== undefined) {
      result.gainLossUSDtoLocal = result.currentValueUSDtoLocal - result.totalInvestedUSDtoLocal
    }
    result.irrUSDtoLocal = dimC ? xirr(dimC.flows, dimC.dates) : null
  }

  return result
}

// ============================================================
// Portfolio aggregation
// ============================================================

export function aggregatePortfolioTotals(results: InvestmentResult[]) {
  return results.reduce(
    (acc, r) => {
      acc.totalInvested += r.totalInvestedLocal ?? r.totalInvestedUSDtoLocal ?? 0
      acc.currentValue += r.currentValueLocal ?? r.currentValueUSDtoLocal ?? 0
      return acc
    },
    { totalInvested: 0, currentValue: 0, gainLoss: 0 }
  )
}

// ============================================================
// Dashboard aggregation helpers — inspired by the Excel dashboard
// ============================================================

export type PillarDashboardRow = {
  pilar: string
  totalInvested: number
  currentValue: number
  gainLoss: number
  roi: number | null
  target?: number
  gap?: number
  progressPct?: number
  investmentCount: number
}

export type PortfolioQualityCheck = {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
}

export type AnnualPillarPoint = {
  year: number
  [pillar: string]: number
}

function resultInvested(result: InvestmentResult): number {
  return result.totalInvestedLocal ?? result.totalInvestedUSDtoLocal ?? 0
}

function resultCurrentValue(result: InvestmentResult): number {
  return result.currentValueLocal ?? result.currentValueUSDtoLocal ?? 0
}

export function aggregateByPillar(
  results: InvestmentResult[],
  pillarTargets: Record<string, number> = {},
): PillarDashboardRow[] {
  const grouped = new Map<string, PillarDashboardRow>()

  for (const result of results) {
    const pilar = result.investment.pilar || 'Sin pilar'
    const invested = resultInvested(result)
    const currentValue = resultCurrentValue(result)
    const existing = grouped.get(pilar) ?? {
      pilar,
      totalInvested: 0,
      currentValue: 0,
      gainLoss: 0,
      roi: null,
      target: undefined,
      gap: undefined,
      progressPct: undefined,
      investmentCount: 0,
    }

    existing.totalInvested += invested
    existing.currentValue += currentValue
    existing.investmentCount += 1
    grouped.set(pilar, existing)
  }

  return [...grouped.values()]
    .map((row) => {
      const target = Number(pillarTargets[row.pilar] ?? 0)
      const hasTarget = Number.isFinite(target) && target > 0
      const gainLoss = row.currentValue - row.totalInvested
      return {
        ...row,
        gainLoss,
        roi: row.totalInvested > 0 ? (gainLoss / row.totalInvested) * 100 : null,
        target: hasTarget ? target : undefined,
        gap: hasTarget ? Math.max(target - row.currentValue, 0) : undefined,
        progressPct: hasTarget ? Math.min((row.currentValue / target) * 100, 100) : undefined,
      }
    })
    .sort((a, b) => b.currentValue - a.currentValue)
}

export function getPortfolioDashboardTotals(
  results: InvestmentResult[],
  goldenNumberTarget?: number,
) {
  const totals = aggregatePortfolioTotals(results)
  const gainLoss = totals.currentValue - totals.totalInvested
  const roi = totals.totalInvested > 0 ? (gainLoss / totals.totalInvested) * 100 : null
  const target = Number(goldenNumberTarget ?? 0)
  const hasTarget = Number.isFinite(target) && target > 0

  return {
    ...totals,
    gainLoss,
    roi,
    goldenNumberTarget: hasTarget ? target : undefined,
    goldenNumberGap: hasTarget ? Math.max(target - totals.currentValue, 0) : undefined,
    goldenNumberProgressPct: hasTarget ? Math.min((totals.currentValue / target) * 100, 100) : undefined,
  }
}

export function buildAnnualPillarSeries(
  investments: Investment[],
  snapshots: Snapshot[],
  trm: number,
  baseCurrency: string,
): AnnualPillarPoint[] {
  const dates = snapshots
    .map((snapshot) => new Date(snapshot.cutDate || (snapshot as any).date))
    .filter((date) => Number.isFinite(date.getTime()))

  if (dates.length === 0) return []

  const minYear = Math.min(...dates.map((date) => date.getFullYear()))
  const maxYear = Math.max(new Date().getFullYear(), ...dates.map((date) => date.getFullYear()))

  const investmentByName = new Map(investments.map((investment) => [investment.name, investment]))
  const series: AnnualPillarPoint[] = []

  for (let year = minYear; year <= maxYear; year += 1) {
    const point: AnnualPillarPoint = { year }

    for (const investment of investments) {
      const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`).getTime()
      const latestSnapshot = snapshots
        .filter((snapshot) => {
          const snapDate = new Date(snapshot.cutDate || (snapshot as any).date).getTime()
          return snapshot.investmentName === investment.name && Number.isFinite(snapDate) && snapDate <= yearEnd
        })
        .sort((a, b) => new Date(b.cutDate || (b as any).date).getTime() - new Date(a.cutDate || (a as any).date).getTime())[0]

      if (!latestSnapshot) continue

      const currentInvestment = investmentByName.get(investment.name)
      const pilar = currentInvestment?.pilar || 'Sin pilar'
      const value = investment.currency === baseCurrency
        ? Number(latestSnapshot.valueLocal ?? (latestSnapshot as any).totalValue ?? 0)
        : Number(latestSnapshot.valueUSD ?? 0) * Number(latestSnapshot.trmCut ?? trm)

      if (!Number.isFinite(value) || value <= 0) continue
      point[pilar] = Number(point[pilar] ?? 0) + value
    }

    series.push(point)
  }

  return series
}

export function getPortfolioQualityChecks(
  investments: Investment[],
  transactions: Transaction[],
  snapshots: Snapshot[],
  pillarTargets: Record<string, number> = {},
  goldenNumberTarget?: number,
): PortfolioQualityCheck[] {
  const checks: PortfolioQualityCheck[] = []
  const transactionInvestmentNames = new Set(transactions.map((transaction) => transaction.investmentName))
  const snapshotInvestmentNames = new Set(snapshots.map((snapshot) => snapshot.investmentName))

  const investmentsWithoutTransactions = investments.filter((investment) => !transactionInvestmentNames.has(investment.name))
  if (investmentsWithoutTransactions.length > 0) {
    checks.push({
      id: 'missing-transactions',
      severity: 'warning',
      title: 'Inversiones sin aportes registrados',
      description: `${investmentsWithoutTransactions.length} inversión(es) no tienen movimientos. Agrega aportes/retiros para calcular rentabilidad real.`,
    })
  }

  const investmentsWithoutSnapshots = investments.filter((investment) => !snapshotInvestmentNames.has(investment.name))
  if (investmentsWithoutSnapshots.length > 0) {
    checks.push({
      id: 'missing-snapshots',
      severity: 'critical',
      title: 'Faltan cortes de inversión',
      description: `${investmentsWithoutSnapshots.length} inversión(es) no tienen corte actual. El valor actual y la TIR pueden verse incompletos.`,
    })
  }

  const usdTransactionsWithoutTrm = transactions.filter((transaction) => transaction.currency === 'USD' && !transaction.trm)
  if (usdTransactionsWithoutTrm.length > 0) {
    checks.push({
      id: 'missing-trm',
      severity: 'critical',
      title: 'TRM faltante en movimientos USD',
      description: `${usdTransactionsWithoutTrm.length} movimiento(s) en USD no tienen TRM. Completa la TRM para evitar distorsiones.`,
    })
  }

  const pillars = [...new Set(investments.map((investment) => investment.pilar).filter(Boolean))]
  const pillarsWithoutTarget = pillars.filter((pillar) => !pillarTargets[pillar])
  if (pillarsWithoutTarget.length > 0) {
    checks.push({
      id: 'missing-pillar-targets',
      severity: 'info',
      title: 'Objetivos por pilar pendientes',
      description: `Configura metas para: ${pillarsWithoutTarget.join(', ')}. Así el dashboard puede medir faltante y progreso por pilar.`,
    })
  }

  if (!goldenNumberTarget || goldenNumberTarget <= 0) {
    checks.push({
      id: 'missing-golden-number',
      severity: 'info',
      title: 'Número Dorado sin configurar',
      description: 'Agrega tu meta patrimonial total en Configuración para ver avance global y brecha de libertad financiera.',
    })
  }

  if (checks.length === 0) {
    checks.push({
      id: 'healthy-portfolio',
      severity: 'info',
      title: 'Dashboard listo para análisis',
      description: 'Tienes aportes, cortes y objetivos suficientes para medir tu rentabilidad y avance patrimonial.',
    })
  }

  return checks
}
