'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ArrowRightLeft, ChevronRight, Info } from 'lucide-react'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { pushEvent } from '@/lib/analytics'
import { formatNumber, formatDate } from '@/lib/formatters'
import { computeFlowLocal, computeFlowUSD } from '@/lib/financial-calculations'

const schema = z.object({
  investmentName: z.string().min(1, 'Selecciona una inversión'),
  date: z.string().min(1, 'La fecha es requerida'),
  amountLocal: z.number({ invalid_type_error: 'Ingresa un monto' }).positive('Debe ser mayor a 0'),
  trm: z.number().positive().optional(),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  onGoToSnapshots?: () => void
}

export default function TransactionsPanel({ onGoToSnapshots }: Props) {
  const { investments, transactions, config, addTransaction, removeTransaction } = useRentabilidadStore()
  const [showForm, setShowForm] = useState(false)
  const [filterInv, setFilterInv] = useState<string>('all')
  const [hasTracked, setHasTracked] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().slice(0, 10) },
  })

  const watchInv = watch('investmentName')
  const watchAmount = watch('amountLocal')
  const watchTrm = watch('trm')

  const inv = investments.find(i => i.name === watchInv)
  const isUSD = inv?.currency === 'USD'
  const flowLocal = watchAmount ? -watchAmount : undefined
  const flowUSD = isUSD && watchAmount && watchTrm ? -(watchAmount / watchTrm) : undefined
  const flowLocalAsUSD = isUSD && watchAmount ? -watchAmount : undefined

  const onSubmit = (data: FormData) => {
    const invObj = investments.find(i => i.name === data.investmentName)
    if (!invObj) return
    addTransaction({
      ...data,
      entity: invObj.entity,
      currency: invObj.currency,
    })
    if (!hasTracked) {
      pushEvent('transaction_added', { currency: invObj.currency, has_trm: !!data.trm })
      setHasTracked(true)
    }
    reset({ date: new Date().toISOString().slice(0, 10) })
    setShowForm(false)
  }

  const displayed = filterInv === 'all' ? transactions : transactions.filter(t => t.investmentName === filterInv)
  const sorted = [...displayed].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const field = 'w-full px-3 py-2.5 bg-mia-surface border border-mia-border rounded-xl text-sm text-mia-cream focus:outline-none focus:border-mf-coral appearance-none'

  if (investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="p-5 bg-mia-blue/10 rounded-2xl mb-6">
          <ArrowRightLeft className="w-10 h-10 text-mia-blue" />
        </div>
        <h2 className="text-xl font-heading font-bold text-mia-cream mb-2">Primero agrega inversiones</h2>
        <p className="text-neutral text-sm max-w-sm">
          Necesitas al menos una inversión en el módulo <strong>B</strong> antes de registrar flujos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* How-to banner */}
      <div className="flex items-start gap-3 bg-mia-blue/5 border border-mia-blue/20 rounded-2xl px-5 py-4">
        <Info className="w-4 h-4 text-mia-blue flex-shrink-0 mt-0.5" />
        <div className="text-sm text-neutral leading-relaxed">
          <strong className="text-mia-cream">Columna G del Excel (Aporte):</strong> Ingresa el monto en tu moneda local.
          Si la inversión es en USD, agrega también la <strong className="text-mia-cream">TRM</strong> (valor del dólar ese día) —
          los flujos se calculan automáticamente.
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-heading font-bold text-mia-cream text-lg">C · Entradas y Salidas ({transactions.length})</h2>
          <p className="text-neutral text-sm">Aportes y movimientos — equivalente a &ldquo;Entradas y salidas&rdquo; del Excel</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterInv}
            onChange={e => setFilterInv(e.target.value)}
            className="px-3 py-2 bg-mia-surface border border-mia-border rounded-xl text-sm text-mia-cream focus:outline-none"
          >
            <option value="all">Todas las inversiones</option>
            {investments.map(inv => <option key={inv.id} value={inv.name}>{inv.name}</option>)}
          </select>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-gradient-mf text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Agregar flujo
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 border border-mf-coral/20">
          <h3 className="font-heading font-semibold text-mia-cream mb-1">Nueva entrada / salida</h3>
          <p className="text-xs text-neutral mb-4">Los flujos negativos (aportes) se calculan automáticamente</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Inversión */}
              <div>
                <label className="block text-xs font-medium text-neutral mb-1">Inversión</label>
                <select {...register('investmentName')} className={field}>
                  <option value="">Seleccionar...</option>
                  {investments.map(i => (
                    <option key={i.id} value={i.name}>{i.name} ({i.currency})</option>
                  ))}
                </select>
                {errors.investmentName && <p className="text-loss text-xs mt-1">{errors.investmentName.message}</p>}
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-medium text-neutral mb-1">Fecha del aporte</label>
                <input type="date" {...register('date')} className={field} />
                {errors.date && <p className="text-loss text-xs mt-1">{errors.date.message}</p>}
              </div>

              {/* Monto */}
              <div>
                <label className="block text-xs font-medium text-neutral mb-1">
                  Aporte en {inv?.currency ?? config.baseCurrency} &mdash; columna G del Excel
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  {...register('amountLocal', { valueAsNumber: true })}
                  placeholder="Ej: 5000000"
                  className={field}
                />
                {errors.amountLocal && <p className="text-loss text-xs mt-1">{errors.amountLocal.message}</p>}
              </div>

              {/* TRM — only for USD */}
              {isUSD && (
                <div>
                  <label className="block text-xs font-medium text-neutral mb-1">
                    TRM ({config.baseCurrency}/USD) — columna H del Excel
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register('trm', { valueAsNumber: true })}
                    placeholder="Ej: 4200"
                    className={field}
                  />
                  <p className="text-xs text-neutral/50 mt-1">Valor del dólar el día del aporte</p>
                  {errors.trm && <p className="text-loss text-xs mt-1">TRM requerida para aportes en USD</p>}
                </div>
              )}

              {/* Note */}
              <div className={isUSD ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-medium text-neutral mb-1">Nota (opcional)</label>
                <input {...register('note')} placeholder="Ej: Renovación CDT, aporte mensual..." className={field} />
              </div>
            </div>

            {/* Auto-computed flows — replica columnas I, J, K del Excel */}
            {(flowLocal !== undefined || flowUSD !== undefined) && (
              <div className="bg-mia-surface/60 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-neutral uppercase tracking-wider mb-2">
                  Flujos calculados automáticamente (como en el Excel)
                </p>
                <div className="flex flex-wrap gap-2">
                  {flowLocal !== undefined && (
                    <div className="flex items-center gap-2 text-xs bg-mia-blue/10 text-mia-blue px-3 py-1.5 rounded-full">
                      <span>Flujo {config.baseCurrency}:</span>
                      <strong>{formatNumber(flowLocal)}</strong>
                    </div>
                  )}
                  {flowUSD !== undefined && (
                    <div className="flex items-center gap-2 text-xs bg-mia-teal/10 text-mia-teal px-3 py-1.5 rounded-full">
                      <span>Flujo USD:</span>
                      <strong>{flowUSD.toFixed(2)}</strong>
                    </div>
                  )}
                  {isUSD && flowLocalAsUSD !== undefined && (
                    <div className="flex items-center gap-2 text-xs bg-mf-coral/10 text-mf-coral px-3 py-1.5 rounded-full">
                      <span>Flujo {config.baseCurrency} en USD:</span>
                      <strong>{formatNumber(flowLocalAsUSD)}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="submit" className="bg-gradient-mf text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                Guardar flujo
              </button>
              <button type="button" onClick={() => { reset(); setShowForm(false) }} className="glass text-neutral text-sm px-5 py-2.5 rounded-xl">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table — matches Excel columns exactly */}
      {sorted.length === 0 && !showForm ? (
        <div className="text-center py-16 text-neutral">
          No hay flujos registrados.{' '}
          <button onClick={() => setShowForm(true)} className="text-mf-coral hover:underline">Agrega el primero.</button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-mia-surface/50">
                  {[
                    { label: 'Pilar', hint: '' },
                    { label: 'Entidad', hint: '' },
                    { label: 'Inversión', hint: '' },
                    { label: 'Moneda', hint: '' },
                    { label: 'Fecha', hint: '' },
                    { label: `Aporte (${config.baseCurrency})`, hint: 'Col G' },
                    { label: 'TRM', hint: 'Col H' },
                    { label: 'Flujo USD', hint: 'Col I — auto' },
                    { label: `Flujo ${config.baseCurrency}`, hint: 'Col J — auto' },
                    { label: `${config.baseCurrency} en USD`, hint: 'Col K — auto' },
                    { label: 'Nota', hint: '' },
                    { label: '', hint: '' },
                  ].map(h => (
                    <th key={h.label} className="text-left px-3 py-3 text-xs font-semibold text-neutral uppercase tracking-wider whitespace-nowrap">
                      {h.label}
                      {h.hint && <span className="ml-1 text-neutral/40 normal-case font-normal">{h.hint}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((tx, i) => {
                  const txInv = investments.find(inv => inv.name === tx.investmentName)
                  const txPilar = txInv?.pilar ?? '—'
                  const isUSDtx = tx.currency === 'USD'
                  const fUSD = isUSDtx && tx.trm ? -(tx.amountLocal / tx.trm) : undefined
                  const fLocal = !isUSDtx ? -tx.amountLocal : undefined
                  const fLocalAsUSD = isUSDtx ? -tx.amountLocal : undefined

                  return (
                    <tr key={tx.id} className={`border-t border-mia-border hover:bg-mia-surface/30 transition-colors group ${i % 2 === 1 ? 'bg-mia-surface/10' : ''}`}>
                      <td className="px-3 py-3">
                        <span className="text-xs font-medium text-mia-blue bg-mia-blue/10 px-2 py-0.5 rounded-full whitespace-nowrap">{txPilar}</span>
                      </td>
                      <td className="px-3 py-3 text-neutral text-xs whitespace-nowrap">{tx.entity}</td>
                      <td className="px-3 py-3 text-mia-cream font-medium text-xs whitespace-nowrap">{tx.investmentName}</td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-semibold text-mf-coral bg-mf-coral/10 px-2 py-0.5 rounded-full">{tx.currency}</span>
                      </td>
                      <td className="px-3 py-3 text-neutral text-xs whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="px-3 py-3 text-mia-cream text-xs font-medium whitespace-nowrap">{formatNumber(tx.amountLocal)}</td>
                      <td className="px-3 py-3 text-neutral text-xs whitespace-nowrap">{tx.trm ? formatNumber(tx.trm) : '—'}</td>
                      {/* Flujo USD */}
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {fUSD !== undefined ? (
                          <span className="text-mia-teal">{fUSD.toFixed(2)}</span>
                        ) : <span className="text-neutral/30">—</span>}
                      </td>
                      {/* Flujo COP */}
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {fLocal !== undefined ? (
                          <span className="text-mia-blue">{formatNumber(fLocal)}</span>
                        ) : <span className="text-neutral/30">—</span>}
                      </td>
                      {/* COP en USD */}
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {fLocalAsUSD !== undefined ? (
                          <span className="text-mf-coral">{formatNumber(fLocalAsUSD)}</span>
                        ) : <span className="text-neutral/30">—</span>}
                      </td>
                      <td className="px-3 py-3 text-neutral text-xs">{tx.note || '—'}</td>
                      <td className="px-3 py-3">
                        <button onClick={() => removeTransaction(tx.id)} className="opacity-0 group-hover:opacity-100 text-neutral hover:text-loss transition-all p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Next step CTA */}
          {transactions.length > 0 && onGoToSnapshots && (
            <div className="flex justify-end">
              <button
                onClick={onGoToSnapshots}
                className="flex items-center gap-2 glass border border-mia-border text-sm font-medium text-mia-cream px-5 py-2.5 rounded-xl hover:border-mf-coral/40 transition-all"
              >
                Siguiente: Cortes de Valor
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
