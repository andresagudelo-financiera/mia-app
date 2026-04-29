'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { computeInvestmentResult } from '@/lib/financial-calculations'
import { pushEvent } from '@/lib/analytics'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/formatters'
import TRMBadge from './TRMBadge'
import SummaryCards from './SummaryCards'
import PortfolioChart from './PortfolioChart'
import ExportPDFButton from './ExportPDFButton'
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

  const handleTRMChange = useCallback((rate: number) => setTrm(rate), [])

  if (investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-neutral text-lg mb-2 font-heading font-semibold text-mia-cream">Sin datos aún</p>
        <p className="text-neutral text-sm max-w-sm">
          Agrega inversiones, transacciones y cortes para ver tus resultados de rentabilidad.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* TRM + Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <TRMBadge onTRMChange={handleTRMChange} />
        <ExportPDFButton results={results} trm={trm} />
      </div>

      {/* Summary */}
      <SummaryCards results={results} trm={trm} />

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
