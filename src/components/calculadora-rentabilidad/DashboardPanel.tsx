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
const CHART_GRID = 'rgb(var(--color-mia-border))'
const CHART_MUTED = 'rgb(var(--color-neutral))'

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
      <div className="relative overflow-hidden rounded-[2rem] border border-mia-border bg-mia-card p-5 text-mia-cream shadow-[0_24px_80px_rgba(240,78,55,0.10)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-mf-coral/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-mf-orange/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 mb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-mf-coral/25 bg-mf-coral/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-mf-coral">
              <BarChart3 className="w-3.5 h-3.5" /> Dashboard ejecutivo
            </span>
            <h3 className="mt-3 font-heading text-2xl font-black text-mia-cream md:text-3xl">
              Visión patrimonial y rentabilidad real
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral">
              Consolidado por pilares, avance contra objetivos configurables, alertas de calidad de datos y evolución anual del portafolio.
            </p>
          </div>

          <div className="min-w-[230px] rounded-2xl border border-amber-300/35 bg-mia-surface/70 p-4 shadow-[0_16px_45px_rgba(245,196,94,0.18)]">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Avance al Número Dorado</p>
            <p className="mt-1 font-heading text-2xl font-black text-mia-cream">
              {totals.goldenNumberProgressPct !== undefined ? `${totals.goldenNumberProgressPct.toFixed(1)}%` : 'Configurar'}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-mia-border/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-mf-coral"
                style={{ width: `${totals.goldenNumberProgressPct ?? 0}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-neutral">
              {totals.goldenNumberGap !== undefined
                ? `Faltan ${formatCurrency(totals.goldenNumberGap, baseCurrency)}`
                : 'Define esta meta en Configuración.'}
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="xl:col-span-3 rounded-3xl border border-mia-border bg-mia-card p-5 shadow-[0_18px_60px_rgba(31,27,24,0.06)]">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h4 className="font-heading font-semibold text-mia-cream">Pilares: capital vs rendimientos</h4>
              <p className="text-xs text-neutral">Replica la lectura del Excel: capital aportado, rendimiento y objetivo por pilar.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={pillarChartData} margin={{ left: 0, right: 10, bottom: 54 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="name" tick={{ fill: CHART_MUTED, fontSize: 11 }} angle={-25} textAnchor="end" interval={0} height={72} />
              <YAxis tick={{ fill: CHART_MUTED, fontSize: 11 }} tickFormatter={(value) => `${Number(value) / 1_000_000}M`} />
              <Tooltip content={<CurrencyTooltip currency={baseCurrency} />} />
              <Bar dataKey="capital" stackId="a" name="Capital aportado" fill="#5C8BC4" radius={[0, 0, 6, 6]} />
              <Bar dataKey="rendimiento" stackId="a" name="Rendimiento" fill="#F04E37" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="xl:col-span-2 rounded-3xl border border-mia-border bg-mia-card p-5 shadow-[0_18px_60px_rgba(31,27,24,0.06)]">
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
                  className={`rounded-2xl border p-3 ${critical ? 'border-loss/25 bg-loss/5' : warning ? 'border-amber-300/40 bg-amber-400/10' : 'border-mia-blue/25 bg-mia-blue/10'}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`w-4 h-4 mt-0.5 ${critical ? 'text-loss' : warning ? 'text-amber-700 dark:text-amber-300' : 'text-mia-blue'}`} />
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

      <div className="overflow-hidden rounded-3xl border border-mia-border bg-mia-card shadow-[0_18px_60px_rgba(31,27,24,0.06)]">
        <div className="border-b border-mia-border px-5 py-4">
          <h4 className="font-heading font-semibold text-mia-cream">Resumen por pilar</h4>
          <p className="text-xs text-neutral">Objetivos configurables, brecha y progreso para priorizar decisiones.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-mia-surface/70">
                {['Pilar', 'Aportado', 'Valor actual', 'Rendimiento', 'ROI', 'Objetivo', 'Faltante', 'Avance'].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pillarRows.map((row, index) => (
                <tr key={row.pilar} className={`border-t border-mia-border ${index % 2 ? 'bg-mia-surface/40' : ''}`}>
                  <td className="px-4 py-4 font-semibold text-mia-cream whitespace-nowrap">{row.pilar}</td>
                  <td className="px-4 py-4 text-mia-cream whitespace-nowrap">{formatCurrency(row.totalInvested, baseCurrency)}</td>
                  <td className="px-4 py-4 text-mia-cream whitespace-nowrap">{formatCurrency(row.currentValue, baseCurrency)}</td>
                  <td className={`px-4 py-4 whitespace-nowrap ${row.gainLoss >= 0 ? 'text-gain' : 'text-loss'}`}>{row.gainLoss >= 0 ? '+' : ''}{formatCurrency(row.gainLoss, baseCurrency)}</td>
                  <td className="px-4 py-4 text-mia-cream whitespace-nowrap">{row.roi !== null ? `${row.roi.toFixed(2)}%` : '—'}</td>
                  <td className="px-4 py-4 text-mia-cream whitespace-nowrap">{row.target ? formatCurrency(row.target, baseCurrency) : 'Sin meta'}</td>
                  <td className="px-4 py-4 text-mia-cream whitespace-nowrap">{row.gap !== undefined ? formatCurrency(row.gap, baseCurrency) : '—'}</td>
                  <td className="px-4 py-4 min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-mia-border/70 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-mf-coral to-mf-orange" style={{ width: `${row.progressPct ?? 0}%` }} />
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
        <div className="rounded-3xl border border-mia-border bg-mia-card p-5 shadow-[0_18px_60px_rgba(31,27,24,0.06)]">
          <h4 className="font-heading font-semibold text-mia-cream mb-1">Evolución anual por pilar</h4>
          <p className="text-xs text-neutral mb-5">Toma el último corte disponible de cada año para mostrar crecimiento histórico.</p>
          <ResponsiveContainer width="100%" height={310}>
            <LineChart data={annualSeries} margin={{ left: 0, right: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="year" tick={{ fill: CHART_MUTED, fontSize: 11 }} />
              <YAxis tick={{ fill: CHART_MUTED, fontSize: 11 }} tickFormatter={(value) => `${Number(value) / 1_000_000}M`} />
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
    amber: 'text-amber-700 dark:text-amber-300 bg-amber-400/10 border-amber-300/35',
  }[accent]

  return (
    <div className="rounded-2xl border border-mia-border bg-mia-surface/70 p-4 shadow-[0_14px_45px_rgba(31,27,24,0.06)] backdrop-blur">
      <div className={`inline-flex p-2 rounded-xl border ${accentClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral">{label}</p>
      <p className="mt-1 font-heading text-lg font-black leading-tight text-mia-cream">{value}</p>
      {sub && <p className="mt-1 text-xs text-neutral">{sub}</p>}
    </div>
  )
}

function CurrencyTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-mia-border bg-mia-card p-3 shadow-[0_18px_50px_rgba(31,27,24,0.14)]">
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
