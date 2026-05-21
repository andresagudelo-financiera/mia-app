'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { aggregatePortfolioTotals, computeInvestmentResult } from '@/lib/financial-calculations'
import { pushEvent } from '@/lib/analytics'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import TRMBadge from './TRMBadge'
import SummaryCards from './SummaryCards'
import PortfolioChart from './PortfolioChart'
import DashboardPanel from './DashboardPanel'
import ExportPDFButton from './ExportPDFButton'
import SimulatorActionBar from '@/components/simuladores/SimulatorActionBar'
import { Info } from 'lucide-react'

export default function ResultsPanel() {
  const { investments, transactions, snapshots, config } = useRentabilidadStore()
  const [trm, setTrm] = useState<number>(4200)
  const [tracked, setTracked] = useState(false)

  useEffect(() => {
    if (!tracked) {
      pushEvent('results_viewed', {
        has_investments: investments.length > 0,
        has_snapshots: snapshots.length > 0,
      })
      setTracked(true)
    }
  }, [tracked, investments.length, snapshots.length])

  const results = useMemo(
    () => investments.map(inv => computeInvestmentResult(inv, transactions, snapshots, trm, config.baseCurrency)),
    [investments, transactions, snapshots, trm, config.baseCurrency]
  )
  const hasCompletedInputs = investments.length > 0 && transactions.length > 0 && snapshots.length > 0
  const portfolioTotals = useMemo(() => aggregatePortfolioTotals(results), [results])
  const portfolioGainLoss = portfolioTotals.currentValue - portfolioTotals.totalInvested
  const portfolioGainLossPct = portfolioTotals.totalInvested > 0 ? (portfolioGainLoss / portfolioTotals.totalInvested) * 100 : 0

  const downloadableResult = useMemo(() => ({
    baseCurrency: config.baseCurrency,
    trm,
    investments: results.map(result => ({
      investment: result.investment.name,
      pilar: result.investment.pilar,
      currency: result.investment.currency,
      totalInvested: result.totalInvestedLocal ?? result.totalInvestedUSDtoLocal ?? 0,
      currentValue: result.currentValueLocal ?? result.currentValueUSDtoLocal ?? 0,
      irrLocal: result.irrLocal,
      irrUSD: result.irrUSD,
      irrUSDtoLocal: result.irrUSDtoLocal,
    })),
  }), [config.baseCurrency, results, trm])

  const handleTRMChange = useCallback((rate: number) => setTrm(rate), [])

  if (!hasCompletedInputs) {
    const missingStep = investments.length === 0
      ? 'Agrega tu primera inversión.'
      : transactions.length === 0
        ? 'Registra al menos una entrada o salida.'
        : 'Agrega al menos un corte de valor actual.'

    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-neutral text-lg mb-2 font-heading font-semibold text-mia-cream">Resultados bloqueados por ahora</p>
        <p className="text-neutral text-sm max-w-sm">
          {missingStep} Cuando completes inversiones, flujos y cortes, desbloquearemos el dashboard de resultados.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* TRM */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <TRMBadge onTRMChange={handleTRMChange} />
      </div>

      {/* Summary */}
      <SummaryCards results={results} trm={trm} />

      <DashboardPanel
        results={results}
        investments={investments}
        transactions={transactions}
        snapshots={snapshots}
        baseCurrency={config.baseCurrency}
        trm={trm}
        pillarTargets={config.dashboardSettings?.pillarTargets}
        goldenNumberTarget={config.dashboardSettings?.goldenNumberTarget}
      />

      <SimulatorActionBar
        title="Calculadora de Rentabilidad"
        description="TIR multi-moneda para medir el desempeño real de tus inversiones."
        result={downloadableResult}
        fileBaseName="calculadora-rentabilidad"
        showAdvisor={false}
        shareMessage="Estoy usando la Calculadora de Rentabilidad de Moneyflow para medir mejor mis inversiones."
        instagramStory={{
          title: 'Mi rentabilidad real',
          subtitle: 'Calculadora de Rentabilidad · Moneyflow by MIA',
          mention: '@yosoyclaudiauribe',
          metrics: [
            { label: 'Capital aportado', value: formatCurrency(portfolioTotals.totalInvested, config.baseCurrency) },
            { label: 'Valor actual', value: formatCurrency(portfolioTotals.currentValue, config.baseCurrency) },
            {
              label: 'Ganancia / pérdida',
              value: `${portfolioGainLoss >= 0 ? '+' : ''}${formatCurrency(portfolioGainLoss, config.baseCurrency)}`,
              tone: portfolioGainLoss >= 0 ? 'positive' : 'negative',
            },
            {
              label: 'Variación',
              value: `${portfolioGainLossPct >= 0 ? '+' : ''}${portfolioGainLossPct.toFixed(2)}%`,
              tone: portfolioGainLossPct >= 0 ? 'positive' : 'negative',
            },
          ],
        }}
        downloadSlot={<ExportPDFButton results={results} trm={trm} />}
      />

      {/* Results table */}
      <div className="glass rounded-2xl border border-mia-border overflow-hidden">
        <div className="px-6 py-4 border-b border-mia-border">
          <h3 className="font-heading font-semibold text-mia-cream">Resultados por Inversión</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-mia-surface/50">
                {[
                  'Inversión', 'Pilar', 'Moneda',
                  'Total Invertido', 'Valor Actual', 'Ganancia/Pérdida',
                  'TIR Local', 'TIR USD', `TIR USD→${config.baseCurrency}`
                ].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                const inv = r.investment
                const invested = r.totalInvestedLocal ?? r.totalInvestedUSDtoLocal ?? 0
                const value = r.currentValueLocal ?? r.currentValueUSDtoLocal
                const gl = value !== undefined ? value - invested : undefined
                const hasSnap = value !== undefined

                return (
                  <tr key={inv.id} className={`border-t border-mia-border hover:bg-mia-surface/30 transition-colors ${i % 2 === 0 ? '' : 'bg-mia-surface/10'}`}>
                    <td className="px-4 py-4 text-mia-cream font-medium whitespace-nowrap">{inv.name}</td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-mia-blue bg-mia-blue/10 px-2 py-0.5 rounded-full whitespace-nowrap">{inv.pilar}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-mf-coral bg-mf-coral/10 px-2 py-0.5 rounded-full">{inv.currency}</span>
                    </td>
                    <td className="px-4 py-4 text-mia-cream whitespace-nowrap">{formatCurrency(invested, config.baseCurrency)}</td>

                    {/* Valor Actual */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {hasSnap ? (
                        <span className="text-mia-cream">{formatCurrency(value!, config.baseCurrency)}</span>
                      ) : (
                        <NoDataCell />
                      )}
                    </td>

                    {/* G/P */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {gl !== undefined ? (
                        <span className={gl >= 0 ? 'text-gain' : 'text-loss'}>
                          {gl >= 0 ? '+' : ''}{formatCurrency(gl, config.baseCurrency)}
                        </span>
                      ) : <NoDataCell />}
                    </td>

                    {/* TIR Local */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <TIRCell value={r.irrLocal} hasSnap={hasSnap && inv.currency === config.baseCurrency} />
                    </td>

                    {/* TIR USD */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <TIRCell value={r.irrUSD} hasSnap={hasSnap && inv.currency === 'USD'} />
                    </td>

                    {/* TIR USD→Local */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <TIRCell value={r.irrUSDtoLocal} hasSnap={hasSnap && inv.currency === 'USD'} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart */}
      <PortfolioChart results={results} />
    </div>
  )
}

function NoDataCell() {
  return (
    <span className="flex items-center gap-1 text-neutral">
      <span>—</span>
      <span title="Agrega un corte para ver resultados">
        <Info className="w-3 h-3" />
      </span>
    </span>
  )
}

function TIRCell({ value, hasSnap }: { value: number | null | undefined; hasSnap: boolean }) {
  if (!hasSnap) return <NoDataCell />
  if (value === null || value === undefined) {
    return (
      <span className="flex items-center gap-1 text-neutral">
        <span>N/A</span>
        <span title="No se pudo calcular la tasa de retorno">
          <Info className="w-3 h-3" />
        </span>
      </span>
    )
  }
  return (
    <span className={`font-bold ${value >= 0 ? 'text-gain' : 'text-loss'}`}>
      {formatPercent(value)}
    </span>
  )
}
