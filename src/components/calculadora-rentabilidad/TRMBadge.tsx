'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { pushEvent } from '@/lib/analytics'
import { formatRelativeTime, formatNumber } from '@/lib/formatters'

interface ExchangeRateData {
  rates: Record<string, number>
  updatedAt: string
}

interface TRMBadgeProps {
  onTRMChange: (trm: number) => void
}

export default function TRMBadge({ onTRMChange }: TRMBadgeProps) {
  const baseCurrency = useRentabilidadStore(s => s.config.baseCurrency)
  const [data, setData] = useState<ExchangeRateData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [manualTRM, setManualTRM] = useState('')
  const [isManual, setIsManual] = useState(false)

  const fetchRate = useCallback(async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      const res = await fetch('/api/exchange-rate')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json)
      // Compute rate: how much baseCurrency per 1 USD
      const rate = json.rates[baseCurrency] ?? null
      if (rate) onTRMChange(rate)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [baseCurrency, onTRMChange])

  useEffect(() => { fetchRate() }, [fetchRate])

  const rate = data?.rates[baseCurrency]
  const diffMin = data ? Math.floor((Date.now() - new Date(data.updatedAt).getTime()) / 60000) : 0
  const statusColor = diffMin < 30 ? 'text-gain' : diffMin < 60 ? 'text-yellow-400' : 'text-loss'

  const handleManualConfirm = () => {
    const val = parseFloat(manualTRM)
    if (isNaN(val) || val <= 0) return
    onTRMChange(val)
    setIsManual(true)
    pushEvent('trm_manual_override', { trm_value: val })
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl text-sm text-neutral animate-pulse">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Cargando TRM...
      </div>
    )
  }

  if (isError || !rate) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 glass border border-loss/30 px-4 py-2 rounded-xl text-sm text-loss">
          <AlertCircle className="w-4 h-4" />
          No se pudo obtener el TRM
        </div>
        {!isManual ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={manualTRM}
              onChange={e => setManualTRM(e.target.value)}
              placeholder="Ingresa el TRM de hoy"
              className="px-3 py-2 bg-mia-surface border border-mia-border rounded-lg text-sm text-mia-cream w-52"
            />
            <button
              onClick={handleManualConfirm}
              className="bg-gradient-mf text-white text-sm font-medium px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Confirmar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-mia-cream">
            <CheckCircle className="w-4 h-4 text-gain" />
            TRM manual: ${formatNumber(parseFloat(manualTRM))} {baseCurrency}/USD
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 glass px-4 py-2 rounded-xl text-sm">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${statusColor.replace('text-', 'bg-')}`} />
        <span className="text-mia-cream font-semibold">
          TRM: {formatNumber(Math.round(rate))} {baseCurrency}/USD
        </span>
      </div>
      <span className="text-neutral border-l border-mia-border pl-3 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {data ? formatRelativeTime(data.updatedAt) : ''}
      </span>
      <button
        onClick={fetchRate}
        className="text-neutral hover:text-mia-cream transition-colors"
        title="Actualizar TRM"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
