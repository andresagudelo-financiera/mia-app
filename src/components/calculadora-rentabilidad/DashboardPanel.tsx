'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Investment, InvestmentResult, Snapshot, Transaction } from '@/types/rentabilidad'
import {
  aggregateByPillar,
  buildAnnualPillarSeries,
  getPortfolioDashboardTotals,
  getPortfolioQualityChecks,
} from '@/lib/financial-calculations'
import { formatCurrency } from '@/lib/formatters'
import { AlertTriangle, BarChart3, CheckCircle2, CircleDollarSign, Target, TrendingUp } from 'lucide-react'

const COLORS = ['#F04E37', '#FF8C42', '#C9A84C', '#5C8BC4', '#3ABFAA', '#C4488A', '#7B52C4']

interface Props {
  results: InvestmentResult[]
  investments: Investment[]
  transactions: Transaction[]
  snapshots: Snapshot[]
  baseCurrency: string
  trm: number
  pillarTargets?: Record<string, number>
  goldenNumberTarget?: number
}

export default function DashboardPanel({
  results,
  investments,
  transactions,
  snapshots,
  baseCurrency,
  trm,
  pillarTargets = {},
  goldenNumberTarget,
}: Props) {
  const totals = useMemo(
    () => getPortfolioDashboardTotals(results, goldenNumberTarget),
    [results, goldenNumberTarget],
  )

  const pillarRows = useMemo(
    () => aggregateByPillar(results, pillarTargets),
    [results, pillarTargets],
  )

  const annualSeries = useMemo(
    () => buildAnnualPillarSeries(investments, snapshots, trm, baseCurrency),
    [investments, snapshots, trm, baseCurrency],
  )

  const qualityChecks = useMemo(
    () => getPortfolioQualityChecks(investments, transactions, snapshots, pillarTargets, goldenNumberTarget),
    [investments, transactions, snapshots, pillarTargets, goldenNumberTarget],
  )

  const pillarChartData = pillarRows.map((row) => ({
    name: row.pilar,
    capital: row.totalInvested,
    rendimiento: row.gainLoss,
    valorActual: row.currentValue,
    objetivo: row.target ?? 0,
  }))

  const pillars = pillarRows.map((row) => row.pilar)

  return (
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-mf-coral/20 bg-gradient-to-br from-mia-surface via-mia-black to-[#1e1714] p-5 md:p-6 shadow-soft">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-mf-coral/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-mf-coral border border-mf-coral/20">
              <BarChart3 className="w-3.5 h-3.5" /> Dashboard ejecutivo
            </span>
            <h3 className="font-heading text-2xl md:text-3xl font-bold text-mia-cream mt-3">
              Visión patrimonial y rentabilidad real
            </h3>
            <p className="text-sm text-neutral max-w-3xl mt-2">
              Consolidado por pilares, avance contra objetivos configurables, alertas de calidad de datos y evolución anual del portafolio.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-300/10 p-4 min-w-[230px]">
            <p className="text-xs text-amber-100/80">Avance al Número Dorado</p>
            <p className="font-heading text-2xl font-bold text-amber-100 mt-1">
              {totals.goldenNumberProgressPct !== undefined ? `${totals.goldenNumberProgressPct.toFixed(1)}%` : 'Configurar'}
            </p>
            <div className="h-2 rounded-full bg-mia-black/50 overflow-hidden mt-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-mf-coral"
                style={{ width: `${totals.goldenNumberProgressPct ?? 0}%` }}
              />
            </div>
            <p className="text-[11px] text-neutral mt-2">
              {totals.goldenNumberGap !== undefined
                ? `Faltan ${formatCurrency(totals.goldenNumberGap, baseCurrency)}`
                : 'Define esta meta en Configuración.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <DashboardMetric icon={CircleDollarSign} label="Capital aportado" value={formatCurrency(totals.totalInvested, baseCurrency)} />
          <DashboardMetric icon={Target} label="Valor actual" value={formatCurrency(totals.currentValue, baseCurrency)} accent="blue" />
          <DashboardMetric
            icon={TrendingUp}
            label="Rentabilidad acumulada"
            value={`${totals.gainLoss >= 0 ? '+' : ''}${formatCurrency(totals.gainLoss, baseCurrency)}`}
            sub={totals.roi !== null ? `${totals.roi >= 0 ? '+' : ''}${totals.roi.toFixed(2)}% ROI` : 'Sin ROI'}
            accent={totals.gainLoss >= 0 ? 'gain' : 'loss'}
          />
          <DashboardMetric
            icon={Target}
            label="Meta patrimonial"
            value={totals.goldenNumberTarget ? formatCurrency(totals.goldenNumberTarget, baseCurrency) : 'Sin meta'}
            sub="Configurable por usuario"
            accent="amber"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3 glass rounded-2xl border border-mia-border p-5">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h4 className="font-heading font-semibold text-mia-cream">Pilares: capital vs rendimientos</h4>
              <p className="text-xs text-neutral">Replica la lectura del Excel: capital aportado, rendimiento y objetivo por pilar.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={pillarChartData} margin={{ left: 0, right: 10, bottom: 54 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 11 }} angle={-25} textAnchor="end" interval={0} height={72} />
              <YAxis tick={{ fill: '#A1A1AA', fontSize: 11 }} tickFormatter={(value) => `${Number(value) / 1_000_000}M`} />
              <Tooltip content={<CurrencyTooltip currency={baseCurrency} />} />
              <Bar dataKey="capital" stackId="a" name="Capital aportado" fill="#5C8BC4" radius={[0, 0, 6, 6]} />
              <Bar dataKey="rendimiento" stackId="a" name="Rendimiento" fill="#F04E37" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="xl:col-span-2 glass rounded-2xl border border-mia-border p-5">
          <h4 className="font-heading font-semibold text-mia-cream mb-1">Alertas y calidad de datos</h4>
          <p className="text-xs text-neutral mb-4">Validaciones para evitar errores como fórmulas rotas, TRM faltante o cortes incompletos.</p>
          <div className="space-y-3">
            {qualityChecks.map((check) => {
              const critical = check.severity === 'critical'
              const warning = check.severity === 'warning'
              const Icon = critical || warning ? AlertTriangle : CheckCircle2
              return (
                <div
                  key={check.id}
                  className={`rounded-2xl border p-3 ${critical ? 'border-loss/30 bg-loss/10' : warning ? 'border-amber-400/30 bg-amber-400/10' : 'border-mia-blue/20 bg-mia-blue/10'}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`w-4 h-4 mt-0.5 ${critical ? 'text-loss' : warning ? 'text-amber-300' : 'text-mia-blue'}`} />
                    <div>
                      <p className="text-sm font-semibold text-mia-cream">{check.title}</p>
                      <p className="text-xs text-neutral mt-1">{check.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl border border-mia-border overflow-hidden">
        <div className="px-5 py-4 border-b border-mia-border">
          <h4 className="font-heading font-semibold text-mia-cream">Resumen por pilar</h4>
          <p className="text-xs text-neutral">Objetivos configurables, brecha y progreso para priorizar decisiones.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-mia-surface/50">
                {['Pilar', 'Aportado', 'Valor actual', 'Rendimiento', 'ROI', 'Objetivo', 'Faltante', 'Avance'].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pillarRows.map((row, index) => (
                <tr key={row.pilar} className={`border-t border-mia-border ${index % 2 ? 'bg-mia-surface/10' : ''}`}>
                  <td className="px-4 py-4 font-semibold text-mia-cream whitespace-nowrap">{row.pilar}</td>
                  <td className="px-4 py-4 text-mia-cream whitespace-nowrap">{formatCurrency(row.totalInvested, baseCurrency)}</td>
                  <td className="px-4 py-4 text-mia-cream whitespace-nowrap">{formatCurrency(row.currentValue, baseCurrency)}</td>
                  <td className={`px-4 py-4 whitespace-nowrap ${row.gainLoss >= 0 ? 'text-gain' : 'text-loss'}`}>{row.gainLoss >= 0 ? '+' : ''}{formatCurrency(row.gainLoss, baseCurrency)}</td>
                  <td className="px-4 py-4 text-mia-cream whitespace-nowrap">{row.roi !== null ? `${row.roi.toFixed(2)}%` : '—'}</td>
                  <td className="px-4 py-4 text-mia-cream whitespace-nowrap">{row.target ? formatCurrency(row.target, baseCurrency) : 'Sin meta'}</td>
                  <td className="px-4 py-4 text-mia-cream whitespace-nowrap">{row.gap !== undefined ? formatCurrency(row.gap, baseCurrency) : '—'}</td>
                  <td className="px-4 py-4 min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-mia-surface overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-mf-coral to-amber-300" style={{ width: `${row.progressPct ?? 0}%` }} />
                      </div>
                      <span className="text-xs text-neutral w-12 text-right">{row.progressPct !== undefined ? `${row.progressPct.toFixed(0)}%` : '—'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {annualSeries.length > 1 && (
        <div className="glass rounded-2xl border border-mia-border p-5">
          <h4 className="font-heading font-semibold text-mia-cream mb-1">Evolución anual por pilar</h4>
          <p className="text-xs text-neutral mb-5">Toma el último corte disponible de cada año para mostrar crecimiento histórico.</p>
          <ResponsiveContainer width="100%" height={310}>
            <LineChart data={annualSeries} margin={{ left: 0, right: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="year" tick={{ fill: '#A1A1AA', fontSize: 11 }} />
              <YAxis tick={{ fill: '#A1A1AA', fontSize: 11 }} tickFormatter={(value) => `${Number(value) / 1_000_000}M`} />
              <Tooltip content={<CurrencyTooltip currency={baseCurrency} />} />
              {pillars.map((pillar, index) => (
                <Line key={pillar} type="monotone" dataKey={pillar} stroke={COLORS[index % COLORS.length]} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

function DashboardMetric({ icon: Icon, label, value, sub, accent = 'coral' }: {
  icon: typeof CircleDollarSign
  label: string
  value: string
  sub?: string
  accent?: 'coral' | 'blue' | 'gain' | 'loss' | 'amber'
}) {
  const accentClass = {
    coral: 'text-mf-coral bg-mf-coral/10 border-mf-coral/20',
    blue: 'text-mia-blue bg-mia-blue/10 border-mia-blue/20',
    gain: 'text-gain bg-gain/10 border-gain/20',
    loss: 'text-loss bg-loss/10 border-loss/20',
    amber: 'text-amber-200 bg-amber-300/10 border-amber-300/20',
  }[accent]

  return (
    <div className="rounded-2xl border border-mia-border bg-mia-black/35 p-4">
      <div className={`inline-flex p-2 rounded-xl border ${accentClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-neutral mt-3">{label}</p>
      <p className="font-heading text-lg font-bold text-mia-cream mt-1 leading-tight">{value}</p>
      {sub && <p className="text-xs text-neutral mt-1">{sub}</p>}
    </div>
  )
}

function CurrencyTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-mia-border bg-mia-black/95 p-3 shadow-soft">
      <p className="text-sm font-semibold text-mia-cream mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((item: any) => (
          <p key={item.dataKey} className="text-xs" style={{ color: item.color }}>
            {item.name || item.dataKey}: {formatCurrency(Number(item.value || 0), currency)}
          </p>
        ))}
      </div>
    </div>
  )
}
