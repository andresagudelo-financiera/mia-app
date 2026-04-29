'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { format } from 'date-fns'
import { FileDown } from 'lucide-react'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { useUserStore } from '@/stores/user.store'
import { pushEvent } from '@/lib/analytics'
import type { InvestmentResult } from '@/types/rentabilidad'

// Dynamically import the component that contains ALL @react-pdf/renderer imports
// This prevents the ESM module from being analyzed at build time
const PDFDownloadButton = dynamic(() => import('./PDFReport'), {
  ssr: false,
  loading: () => (
    <button disabled className="inline-flex items-center gap-2 glass border border-mia-border text-neutral text-sm font-medium px-4 py-2.5 rounded-xl opacity-60">
      <FileDown className="w-4 h-4" />
      Cargando PDF...
    </button>
  ),
})

interface Props {
  results: InvestmentResult[]
  trm: number
}

export default function ExportPDFButton({ results, trm }: Props) {
  const profile = useUserStore(s => s.profile)
  const baseCurrency = useRentabilidadStore(s => s.config.baseCurrency)
  const transactions = useRentabilidadStore(s => s.transactions)
  const snapshots = useRentabilidadStore(s => s.snapshots)
  const [ready, setReady] = useState(false)

  const hasData = results.some(r => r.currentValueLocal !== undefined || r.currentValueUSD !== undefined)

  if (!hasData) {
    return (
      <button
        onClick={() => alert('Agrega al menos un corte para generar el reporte')}
        className="inline-flex items-center gap-2 glass border border-mia-border text-neutral text-sm font-medium px-4 py-2.5 rounded-xl hover:border-mf-coral/30 transition-all"
      >
        <FileDown className="w-4 h-4" />
        Descargar PDF
      </button>
    )
  }

  if (!ready) {
    return (
      <button
        onClick={() => setReady(true)}
        className="inline-flex items-center gap-2 bg-gradient-mf text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
      >
        <FileDown className="w-4 h-4" />
        Descargar PDF
      </button>
    )
  }

  return (
    <PDFDownloadButton
      results={results}
      transactions={transactions}
      snapshots={snapshots}
      trm={trm}
      baseCurrency={baseCurrency}
      userName={profile?.name ?? 'Usuario MIA'}
      generatedAt={new Date().toISOString()}
      filename={`mia-reporte-${format(new Date(), 'yyyy-MM-dd')}.pdf`}
      onDownload={() => pushEvent('pdf_downloaded', { investment_count: results.length })}
    />
  )
}
