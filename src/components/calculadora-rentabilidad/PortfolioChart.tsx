'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import type { InvestmentResult } from '@/types/rentabilidad'
import { formatCurrency } from '@/lib/formatters'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'

const COLORS = ['#F04E37', '#5C8BC4', '#3ABFAA', '#FF8C42', '#C4488A', '#C9A84C', '#7B52C4']

interface Props {
  results: InvestmentResult[]
  isAnimationActive?: boolean
}

export default function PortfolioChart({ results, isAnimationActive = true }: Props) {
  const baseCurrency = useRentabilidadStore(s => s.config.baseCurrency)

  // Group by pilar
  const byPilar: Record<string, number> = {}
  results.forEach(r => {
    const pilar = r.investment.pilar
    const value = r.currentValueLocal ?? r.currentValueUSDtoLocal ?? 0
    byPilar[pilar] = (byPilar[pilar] ?? 0) + value
  })

  const data = Object.entries(byPilar)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-neutral">
        No hay datos suficientes para la gráfica.
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-6 border border-mia-border">
      <h3 className="font-heading font-semibold text-mia-cream mb-6">Portafolio por Pilar</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#A1A1AA', fontSize: 11 }}
            angle={-30}
            textAnchor="end"
            interval={0}
            height={80}
          />
          <YAxis
            tick={{ fill: '#A1A1AA', fontSize: 11 }}
            tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1A1A1A',
              border: '1px solid #333',
              borderRadius: 12,
              color: '#F5F3EE',
              fontSize: 13,
            }}
            formatter={(value: number) => [formatCurrency(value, baseCurrency), 'Valor actual']}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={isAnimationActive}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
