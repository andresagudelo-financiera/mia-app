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
