'use client'

import { useState } from 'react'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { SUPPORTED_CURRENCIES } from '@/lib/constants'
import { Plus, Trash2, Edit2, Check, X, AlertTriangle } from 'lucide-react'

function CatalogEditor({
  title,
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string
  items: string[]
  onAdd: (name: string) => void
  onUpdate: (old: string, newName: string) => void
  onRemove: (name: string) => void
}) {
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleAdd = () => {
    const trimmed = input.trim()
    if (!trimmed || items.includes(trimmed)) return
    onAdd(trimmed)
    setInput('')
  }

  const handleSaveEdit = (old: string) => {
    const trimmed = editValue.trim()
    if (!trimmed || (trimmed !== old && items.includes(trimmed))) return
    onUpdate(old, trimmed)
    setEditing(null)
  }

  return (
    <div className="glass rounded-2xl p-6 border border-mia-border">
      <h3 className="font-heading font-semibold text-mia-cream mb-4">{title}</h3>

      {/* Add row */}
      <div className="flex gap-2 mb-4">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={`Agregar ${title.toLowerCase()}...`}
          className="flex-1 px-3 py-2 bg-mia-surface border border-mia-border rounded-xl text-sm text-mia-cream placeholder:text-neutral focus:outline-none focus:border-mf-coral"
        />
        <button
          onClick={handleAdd}
          className="px-3 py-2 bg-gradient-mf text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Items */}
      <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-hidden">
        {items.map(item => (
          <div key={item} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-mia-surface transition-colors group">
            {editing === item ? (
              <>
                <input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(item); if (e.key === 'Escape') setEditing(null) }}
                  className="flex-1 px-2 py-1 bg-mia-black border border-mf-coral rounded-lg text-sm text-mia-cream focus:outline-none"
                  autoFocus
                />
                <button onClick={() => handleSaveEdit(item)} className="text-gain hover:opacity-80">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setEditing(null)} className="text-neutral hover:text-loss">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-mia-cream">{item}</span>
                <button
                  onClick={() => { setEditing(item); setEditValue(item) }}
                  className="opacity-0 group-hover:opacity-100 text-neutral hover:text-mia-blue transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onRemove(item)}
                  className="opacity-0 group-hover:opacity-100 text-neutral hover:text-loss transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ConfigPanel() {
  const {
    config,
    setBaseCurrency,
    addPillar, updatePillar, removePillar,
    addEntity, updateEntity, removeEntity,
  } = useRentabilidadStore()

  const [showCurrencyWarning, setShowCurrencyWarning] = useState(false)
  const [pendingCurrency, setPendingCurrency] = useState('')

  const handleCurrencyChange = (currency: string) => {
    setPendingCurrency(currency)
    setShowCurrencyWarning(true)
  }

  const confirmCurrencyChange = () => {
    setBaseCurrency(pendingCurrency)
    setShowCurrencyWarning(false)
  }

  return (
    <div className="space-y-6">
      {/* Currency Warning */}
      {showCurrencyWarning && (
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-mia-cream font-medium mb-1">
              Cambiar la moneda base a <strong>{pendingCurrency}</strong>
            </p>
            <p className="text-xs text-neutral mb-3">
              Los cálculos históricos no se recalculan retroactivamente. Las inversiones en otras monedas seguirán igual.
            </p>
            <div className="flex gap-2">
              <button onClick={confirmCurrencyChange} className="px-3 py-1.5 bg-gradient-mf text-white text-xs font-bold rounded-lg">
                Confirmar cambio
              </button>
              <button onClick={() => setShowCurrencyWarning(false)} className="px-3 py-1.5 glass text-neutral text-xs rounded-lg">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Base Currency */}
      <div className="glass rounded-2xl p-6 border border-mia-border">
        <h3 className="font-heading font-semibold text-mia-cream mb-4">Moneda Base</h3>
        <p className="text-sm text-neutral mb-4">
          La moneda principal para los cálculos de tu portafolio. Actualmente: <strong className="text-mf-coral">{config.baseCurrency}</strong>
        </p>
        <select
          value={config.baseCurrency}
          onChange={e => handleCurrencyChange(e.target.value)}
          className="px-4 py-3 bg-mia-surface border border-mia-border rounded-xl text-mia-cream focus:outline-none focus:border-mf-coral appearance-none max-w-xs w-full"
        >
          {SUPPORTED_CURRENCIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Catalogs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CatalogEditor
          title="Pilares"
          items={config.pillars || []}
          onAdd={addPillar}
          onUpdate={updatePillar}
          onRemove={removePillar}
        />
        <CatalogEditor
          title="Entidades"
          items={config.entities || []}
          onAdd={addEntity}
          onUpdate={updateEntity}
          onRemove={removeEntity}
        />
      </div>
    </div>
  )
}
