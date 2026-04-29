'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Scissors, ChevronRight, Info } from 'lucide-react'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { pushEvent } from '@/lib/analytics'
import { formatNumber, formatDate } from '@/lib/formatters'
import { getLatestSnapshot } from '@/lib/financial-calculations'

const schema = z.object({
  investmentName: z.string().min(1, 'Selecciona una inversión'),
  cutDate: z.string().min(1, 'La fecha es requerida'),
  valueLocal: z.number().positive().optional(),
  valueUSD: z.number().positive().optional(),
  trmCut: z.number().positive().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  onGoToResults?: () => void
}

export default function SnapshotsPanel({ onGoToResults }: Props) {
  const { investments, snapshots, config, addSnapshot, removeSnapshot } = useRentabilidadStore()
  const [showForm, setShowForm] = useState(false)
  const [hasTracked, setHasTracked] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { cutDate: new Date().toISOString().slice(0, 10) },
  })

  const watchInv = watch('investmentName')
  const watchUSD = watch('valueUSD')
  const watchTRM = watch('trmCut')

  const inv = investments.find(i => i.name === watchInv)
  const isUSD = inv?.currency === 'USD'
  const valueLocalFromUSD = isUSD && watchUSD && watchTRM ? watchUSD * watchTRM : undefined

  const onSubmit = (data: FormData) => {
    const invObj = investments.find(i => i.name === data.investmentName)
    if (!invObj) return
    addSnapshot({
      ...data,
      entity: invObj.entity,
      currency: invObj.currency,
    })
    if (!hasTracked) {
      pushEvent('snapshot_added', { investment_currency: invObj.currency })
      setHasTracked(true)
    }
    reset({ cutDate: new Date().toISOString().slice(0, 10) })
    setShowForm(false)
  }

  const isLatestSnap = (snapId: string, invName: string) => {
    const latest = getLatestSnapshot(snapshots, invName)
    return latest?.id === snapId
  }

  const field = 'w-full px-3 py-2.5 bg-mia-surface border border-mia-border rounded-xl text-sm text-mia-cream focus:outline-none focus:border-mf-coral appearance-none'

  if (investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="p-5 bg-mia-teal/10 rounded-2xl mb-6">
          <Scissors className="w-10 h-10 text-mia-teal" />
        </div>
        <h2 className="text-xl font-heading font-bold text-mia-cream mb-2">Primero agrega inversiones</h2>
        <p className="text-neutral text-sm max-w-sm">
          Los cortes de valor requieren tener inversiones creadas en el módulo <strong>B</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* How-to banner */}
      <div className="flex items-start gap-3 bg-mia-teal/5 border border-mia-teal/20 rounded-2xl px-5 py-4">
        <Info className="w-4 h-4 text-mia-teal flex-shrink-0 mt-0.5" />
        <div className="text-sm text-neutral leading-relaxed">
          <strong className="text-mia-cream">Cortes x Inversión (Excel):</strong> Ingresa cuánto vale tu inversión el día de hoy (fecha de corte).
          Si la inversión es en USD, ingresa el valor en USD y la TRM actual.
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-heading font-bold text-mia-cream text-lg">D · Cortes de Valor ({snapshots.length})</h2>
          <p className="text-neutral text-sm">Valor actual de tu portafolio — equivalente a &ldquo;Cortes x inversión&rdquo;</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-mf text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Agregar corte
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 border border-mf-coral/20">
          <h3 className="font-heading font-semibold text-mia-cream mb-4">Nuevo corte de valor</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral mb-1">Inversión</label>
                <select {...register('investmentName')} className={field}>
                  <option value="">Seleccionar...</option>
                  {investments.map(i => <option key={i.id} value={i.name}>{i.name} ({i.currency})</option>)}
                </select>
                {errors.investmentName && <p className="text-loss text-xs mt-1">{errors.investmentName.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral mb-1">Fecha del corte</label>
                <input type="date" {...register('cutDate')} className={field} />
                {errors.cutDate && <p className="text-loss text-xs mt-1">{errors.cutDate.message}</p>}
              </div>

              {!isUSD && (
                <div>
                  <label className="block text-xs font-medium text-neutral mb-1">
                    Valor final en {inv?.currency ?? config.baseCurrency} (Columna E del Excel)
                  </label>
                  <input type="number" step="any" min="0" {...register('valueLocal', { valueAsNumber: true })} placeholder="0" className={field} />
                </div>
              )}

              {isUSD && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-neutral mb-1">
                      Valor final USD (Columna F del Excel)
                    </label>
                    <input type="number" step="any" min="0" {...register('valueUSD', { valueAsNumber: true })} placeholder="0" className={field} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral mb-1">
                      TRM final (Columna G del Excel)
                    </label>
                    <input type="number" step="any" min="0" {...register('trmCut', { valueAsNumber: true })} placeholder="4200" className={field} />
                  </div>
                </>
              )}
            </div>

            {valueLocalFromUSD !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-mia-teal/10 text-mia-teal px-3 py-1.5 rounded-full">
                  Valor {config.baseCurrency} (Col H auto): <strong>{formatNumber(Math.round(valueLocalFromUSD))}</strong>
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button type="submit" className="bg-gradient-mf text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                Guardar corte
              </button>
              <button type="button" onClick={() => { reset(); setShowForm(false) }} className="glass text-neutral text-sm px-5 py-2.5 rounded-xl">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {snapshots.length === 0 && !showForm ? (
        <div className="text-center py-16 text-neutral">
          No hay cortes registrados.{' '}
          <button onClick={() => setShowForm(true)} className="text-mf-coral hover:underline">Agrega el primero.</button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-mia-surface/50">
                  {[
                    { label: 'Pilar', hint: '' },
                    { label: 'Entidad', hint: '' },
                    { label: 'Inversión', hint: '' },
                    { label: 'Moneda', hint: '' },
                    { label: 'Fecha Corte', hint: 'Col I' },
                    { label: `Valor ${config.baseCurrency}`, hint: 'Col E' },
                    { label: 'Valor USD', hint: 'Col F' },
                    { label: 'TRM Final', hint: 'Col G' },
                    { label: `USD→${config.baseCurrency}`, hint: 'Col H auto' },
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
                {[...snapshots].sort((a, b) => new Date(b.cutDate).getTime() - new Date(a.cutDate).getTime()).map((snap, i) => {
                  const isLatest = isLatestSnap(snap.id, snap.investmentName)
                  const snapInv = investments.find(inv => inv.name === snap.investmentName)
                  const usdToLocal = snap.valueUSD && snap.trmCut ? snap.valueUSD * snap.trmCut : undefined
                  
                  return (
                    <tr key={snap.id} className={`border-t border-mia-border hover:bg-mia-surface/30 transition-colors group ${i % 2 === 1 ? 'bg-mia-surface/10' : ''}`}>
                      <td className="px-3 py-3">
                        <span className="text-xs font-medium text-mia-blue bg-mia-blue/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {snapInv?.pilar ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-neutral text-xs whitespace-nowrap">{snap.entity}</td>
                      <td className="px-3 py-3 text-mia-cream font-medium text-xs whitespace-nowrap">
                        {snap.investmentName}
                        {isLatest && (
                          <span className="ml-2 text-[10px] font-semibold text-gain bg-gain/10 px-1.5 py-0.5 rounded uppercase">Último</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-semibold text-mf-coral bg-mf-coral/10 px-2 py-0.5 rounded-full">{snap.currency}</span>
                      </td>
                      <td className="px-3 py-3 text-neutral text-xs whitespace-nowrap">{formatDate(snap.cutDate)}</td>
                      <td className="px-3 py-3 text-mia-cream text-xs font-medium whitespace-nowrap">
                        {snap.valueLocal ? formatNumber(snap.valueLocal) : '—'}
                      </td>
                      <td className="px-3 py-3 text-mia-teal text-xs whitespace-nowrap">
                        {snap.valueUSD ? snap.valueUSD.toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-3 text-neutral text-xs whitespace-nowrap">
                        {snap.trmCut ? formatNumber(snap.trmCut) : '—'}
                      </td>
                      <td className="px-3 py-3 text-mf-coral text-xs whitespace-nowrap">
                        {usdToLocal ? formatNumber(Math.round(usdToLocal)) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => removeSnapshot(snap.id)} className="opacity-0 group-hover:opacity-100 text-neutral hover:text-loss transition-all p-1">
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
          {snapshots.length > 0 && onGoToResults && (
            <div className="flex justify-end">
              <button
                onClick={onGoToResults}
                className="flex items-center gap-2 bg-gradient-mf text-white text-sm font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-mf-coral/20"
              >
                Ver Resultados (TIR)
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
