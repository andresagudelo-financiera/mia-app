'use client'

import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { aggregatePortfolioTotals } from '@/lib/financial-calculations'
import { computeInvestmentResult } from '@/lib/financial-calculations'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react'
import type { InvestmentResult } from '@/types/rentabilidad'

interface Props {
  results: InvestmentResult[]
  trm: number
}

export default function SummaryCards({ results, trm }: Props) {
  const baseCurrency = useRentabilidadStore(s => s.config.baseCurrency)
  const totals = aggregatePortfolioTotals(results)
  const gainLoss = totals.currentValue - totals.totalInvested
  const gainLossPct = totals.totalInvested > 0 ? (gainLoss / totals.totalInvested) * 100 : 0

  const cards = [
    {
      icon: DollarSign,
      label: 'Total Invertido',
      value: formatCurrency(totals.totalInvested, baseCurrency),
      color: 'text-mia-blue',
      bg: 'bg-mia-blue/10',
      border: 'border-mia-blue/20',
    },
    {
      icon: BarChart2,
      label: 'Valor Actual',
      value: formatCurrency(totals.currentValue, baseCurrency),
      color: 'text-mia-teal',
      bg: 'bg-mia-teal/10',
      border: 'border-mia-teal/20',
    },
    {
      icon: gainLoss >= 0 ? TrendingUp : TrendingDown,
      label: 'Ganancia / Pérdida',
      value: `${gainLoss >= 0 ? '+' : ''}${formatCurrency(gainLoss, baseCurrency)}`,
      sub: `${gainLossPct >= 0 ? '+' : ''}${gainLossPct.toFixed(2)}%`,
      color: gainLoss >= 0 ? 'text-gain' : 'text-loss',
      bg: gainLoss >= 0 ? 'bg-gain/10' : 'bg-loss/10',
      border: gainLoss >= 0 ? 'border-gain/20' : 'border-loss/20',
    },
    {
      icon: DollarSign,
      label: 'TRM Hoy',
      value: `${formatNumber(Math.round(trm))} ${baseCurrency}/USD`,
      color: 'text-neutral',
      bg: 'bg-mia-surface',
      border: 'border-mia-border',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className={`glass rounded-2xl p-5 border ${card.border} transition-all hover:border-opacity-60`}
          >
            <div className={`inline-flex p-2.5 rounded-xl ${card.bg} mb-4`}>
              <Icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-xs text-neutral mb-1">{card.label}</p>
            <p className={`text-lg font-heading font-bold ${card.color} leading-tight`}>
              {card.value}
            </p>
            {card.sub && (
              <p className={`text-xs mt-0.5 ${card.color} opacity-70`}>{card.sub}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
