'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Edit2, TrendingUp } from 'lucide-react'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { pushEvent } from '@/lib/analytics'
import type { Investment } from '@/types/rentabilidad'
import { SUPPORTED_CURRENCIES } from '@/lib/constants'

const schema = z.object({
  pilar: z.string().min(1, 'Selecciona un pilar'),
  name: z.string().min(1, 'El nombre es requerido'),
  entity: z.string().min(1, 'Selecciona una entidad'),
  currency: z.string().min(1, 'Selecciona la moneda'),
})

type FormData = z.infer<typeof schema>

function InvestmentForm({
  defaultValues,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Partial<FormData>
  onSubmit: (data: FormData) => void
  onCancel: () => void
}) {
  const config = useRentabilidadStore(s => s.config)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: config.baseCurrency, ...defaultValues },
  })

  const field = 'w-full px-3 py-2.5 bg-mia-surface border border-mia-border rounded-xl text-sm text-mia-cream focus:outline-none focus:border-mf-coral appearance-none'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral mb-1">Pilar</label>
          <select {...register('pilar')} className={field}>
            <option value="">Seleccionar...</option>
            {config.pillars.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {errors.pilar && <p className="text-loss text-xs mt-1">{errors.pilar.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral mb-1">Nombre de la inversión</label>
          <input {...register('name')} placeholder="Ej. Bancolombia CDT 90d" className={field} />
          {errors.name && <p className="text-loss text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral mb-1">Entidad</label>
          <select {...register('entity')} className={field}>
            <option value="">Seleccionar...</option>
            {config.entities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          {errors.entity && <p className="text-loss text-xs mt-1">{errors.entity.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral mb-1">Moneda</label>
          <select {...register('currency')} className={field}>
            {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="bg-gradient-mf text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
          Guardar
        </button>
        <button type="button" onClick={onCancel} className="glass text-neutral text-sm px-5 py-2.5 rounded-xl hover:text-mia-cream transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default function InvestmentsPanel({ onGoToTransactions }: { onGoToTransactions?: () => void }) {
  const { investments, transactions, snapshots, addInvestment, updateInvestment, removeInvestment } = useRentabilidadStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [hasTrackedAdd, setHasTrackedAdd] = useState(false)

  const handleAdd = (data: FormData) => {
    const success = addInvestment(data)
    if (!success) { alert('Ya existe una inversión con ese nombre'); return }
    if (!hasTrackedAdd) {
      pushEvent('investment_added', { currency: data.currency })
      setHasTrackedAdd(true)
    }
    setShowForm(false)
  }

  const handleEdit = (id: string, data: FormData) => {
    updateInvestment(id, data)
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    removeInvestment(id)
    setDeleteId(null)
  }

  const getInvCounts = (name: string) => ({
    txs: transactions.filter(t => t.investmentName === name).length,
    snaps: snapshots.filter(s => s.investmentName === name).length,
  })

  if (investments.length === 0 && !showForm) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="p-5 bg-mf-coral/10 rounded-2xl mb-6">
          <TrendingUp className="w-10 h-10 text-mf-coral" />
        </div>
        <h2 className="text-xl font-heading font-bold text-mia-cream mb-2">Agrega tu primera inversión</h2>
        <p className="text-neutral text-sm mb-8 max-w-sm">
          Define los buckets de tu portafolio: CDTs, fondos, acciones, y más.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-gradient-mf text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Agregar primera inversión
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-mia-cream text-lg">Inversiones ({investments.length})</h2>
          <p className="text-neutral text-sm">Tu catálogo de buckets de inversión</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-mf text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Agregar inversión
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 border border-mf-coral/20">
          <h3 className="font-heading font-semibold text-mia-cream mb-4">Nueva inversión</h3>
          <InvestmentForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (() => {
        const inv = investments.find(i => i.id === deleteId)!
        const counts = getInvCounts(inv.name)
        return (
          <div className="glass rounded-2xl p-6 border border-loss/30 bg-loss/5">
            <p className="text-mia-cream font-semibold mb-1">¿Eliminar &ldquo;{inv.name}&rdquo;?</p>
            {(counts.txs > 0 || counts.snaps > 0) && (
              <p className="text-neutral text-sm mb-4">
                Esta inversión tiene <strong>{counts.txs}</strong> transacciones y <strong>{counts.snaps}</strong> cortes que también se eliminarán.
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 bg-loss text-white text-sm font-bold rounded-xl">Eliminar</button>
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 glass text-neutral text-sm rounded-xl">Cancelar</button>
            </div>
          </div>
        )
      })()}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-mia-border">
              {['Pilar', 'Nombre', 'Entidad', 'Moneda', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {investments.map(inv => (
              editingId === inv.id ? (
                <tr key={inv.id} className="border-b border-mia-border">
                  <td colSpan={5} className="px-4 py-4">
                    <InvestmentForm
                      defaultValues={inv}
                      onSubmit={data => handleEdit(inv.id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={inv.id} className="border-b border-mia-border hover:bg-mia-surface/30 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-mia-blue bg-mia-blue/10 px-2 py-1 rounded-full">{inv.pilar}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-mia-cream font-medium">{inv.name}</td>
                  <td className="px-4 py-3 text-sm text-neutral">{inv.entity}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-mf-coral bg-mf-coral/10 px-2 py-1 rounded-full">{inv.currency}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingId(inv.id)} className="p-1.5 text-neutral hover:text-mia-blue transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(inv.id)} className="p-1.5 text-neutral hover:text-loss transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
