// ============================================================
// XIRR — Newton-Raphson Implementation
// Calculates Internal Rate of Return for irregular cash flows
// ============================================================

const MAX_ITERATIONS = 1000
const TOLERANCE = 1e-6
const INITIAL_RATE = 0.1

/**
 * Calculate XIRR for a series of cash flows at given dates.
 * @param flows - Array of amounts (negative = outflows, positive = inflows)
 * @param dates - Array of Date objects corresponding to each flow
 * @returns Annual rate as decimal (e.g., 0.18 = 18%) or null if not calculable
 */
export function xirr(flows: number[], dates: Date[]): number | null {
  if (flows.length < 2 || flows.length !== dates.length) return null

  // Guard: all flows same sign → not calculable
  const hasNegative = flows.some(f => f < 0)
  const hasPositive = flows.some(f => f > 0)
  if (!hasNegative || !hasPositive) return null

  // Guard: all dates the same → not calculable
  const firstTime = dates[0].getTime()
  const allSameDate = dates.every(d => d.getTime() === firstTime)
  if (allSameDate) return null

  let rate = INITIAL_RATE

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let npv = 0
    let dNpv = 0

    for (let k = 0; k < flows.length; k++) {
      const t = (dates[k].getTime() - firstTime) / (365 * 24 * 60 * 60 * 1000)
      const factor = Math.pow(1 + rate, t)
      npv += flows[k] / factor
      dNpv -= (flows[k] * t) / ((1 + rate) * factor)
    }

    if (Math.abs(dNpv) < 1e-10) return null // Avoid division by zero

    const newRate = rate - npv / dNpv

    if (Math.abs(newRate - rate) < TOLERANCE) {
      return newRate
    }

    rate = newRate
  }

  return null // Did not converge
}

/**
 * Build XIRR inputs for Dimension A (local currency investments)
 */
export function buildXIRRDimA(
  transactions: Array<{ flowLocal?: number; date: string }>,
  snapshot: { valueLocal?: number; cutDate: string }
): { flows: number[]; dates: Date[] } | null {
  const txFlows = transactions
    .filter(t => t.flowLocal !== undefined)
    .map(t => ({ flow: t.flowLocal!, date: new Date(t.date) }))

  if (txFlows.length === 0 || snapshot.valueLocal === undefined) return null

  return {
    flows: [...txFlows.map(t => t.flow), snapshot.valueLocal],
    dates: [...txFlows.map(t => t.date), new Date(snapshot.cutDate)],
  }
}

/**
 * Build XIRR inputs for Dimension B (USD investments)
 */
export function buildXIRRDimB(
  transactions: Array<{ flowUSD?: number; date: string }>,
  snapshot: { valueUSD?: number; cutDate: string }
): { flows: number[]; dates: Date[] } | null {
  const txFlows = transactions
    .filter(t => t.flowUSD !== undefined)
    .map(t => ({ flow: t.flowUSD!, date: new Date(t.date) }))

  if (txFlows.length === 0 || snapshot.valueUSD === undefined) return null

  return {
    flows: [...txFlows.map(t => t.flow), snapshot.valueUSD],
    dates: [...txFlows.map(t => t.date), new Date(snapshot.cutDate)],
  }
}

/**
 * Build XIRR inputs for Dimension C (USD expressed in local currency)
 */
export function buildXIRRDimC(
  transactions: Array<{ flowLocalAsUSD?: number; date: string }>,
  snapshot: { valueUSD?: number; trmCut?: number; cutDate: string }
): { flows: number[]; dates: Date[] } | null {
  const txFlows = transactions
    .filter(t => t.flowLocalAsUSD !== undefined)
    .map(t => ({ flow: t.flowLocalAsUSD!, date: new Date(t.date) }))

  const valueLocalFromUSD =
    snapshot.valueUSD !== undefined && snapshot.trmCut !== undefined
      ? snapshot.valueUSD * snapshot.trmCut
      : undefined

  if (txFlows.length === 0 || valueLocalFromUSD === undefined) return null

  return {
    flows: [...txFlows.map(t => t.flow), valueLocalFromUSD],
    dates: [...txFlows.map(t => t.date), new Date(snapshot.cutDate)],
  }
}
