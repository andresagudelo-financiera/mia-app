'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CalendarCheck, Check, Copy, Download, Instagram, MessageCircle, Send, Share2 } from 'lucide-react'
import { pushEvent } from '@/lib/analytics'

type Props = {
  title: string
  description?: string
  result?: unknown
  fileBaseName: string
  advisorMessage?: string
  shareMessage?: string
  disabledDownloadMessage?: string
  downloadSlot?: ReactNode
}

const ADVISOR_PHONE = '573205389740'

export default function SimulatorActionBar({
  title,
  description,
  result,
  fileBaseName,
  advisorMessage,
  shareMessage,
  disabledDownloadMessage = 'Calcula y guarda tus resultados para activar la descarga.',
  downloadSlot,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const hasResult = Boolean(result)

  const currentUrl = typeof window === 'undefined' ? '' : window.location.href
  const defaultShareText = shareMessage || `Mira esta calculadora de Moneyflow: ${title}`
  const advisorText = advisorMessage || `Hola Moneyflow, quiero agendar una asesoría para revisar mis resultados de ${title}.`

  const links = useMemo(() => {
    const encodedAdvisorText = encodeURIComponent(advisorText)
    const encodedShareText = encodeURIComponent(`${defaultShareText}${currentUrl ? ` ${currentUrl}` : ''}`)
    return {
      advisor: `https://wa.me/${ADVISOR_PHONE}?text=${encodedAdvisorText}`,
      friend: `https://wa.me/?text=${encodedShareText}`,
      instagram: 'https://www.instagram.com/estaempresaesmia/',
    }
  }, [advisorText, defaultShareText, currentUrl])

  async function copyShareText() {
    const text = `${defaultShareText}${currentUrl ? `\n${currentUrl}` : ''}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      pushEvent('calculator_shared', { method: 'copy_link', calculator: fileBaseName })
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  async function nativeShare() {
    const payload = { title, text: defaultShareText, url: currentUrl || undefined }
    if (navigator.share) {
      try {
        await navigator.share(payload)
        pushEvent('calculator_shared', { method: 'native_share', calculator: fileBaseName })
        return
      } catch {
        // User cancelled native share; keep fallback menu visible.
      }
    }
    await copyShareText()
  }

  async function downloadResults() {
    if (!result) {
      alert(disabledDownloadMessage)
      return
    }

    setDownloading(true)
    try {
      await downloadResultPdf({ title, description, result, fileBaseName })
      pushEvent('pdf_downloaded', { calculator: fileBaseName })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mt-6 rounded-3xl border border-mia-border bg-mia-surface/25 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-heading text-lg font-bold text-mia-cream">¿Qué quieres hacer ahora?</p>
          <p className="text-sm text-neutral">Agenda asesoría, descarga tus resultados o compártelos con alguien.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <a
            href={links.advisor}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf px-4 py-3 text-sm font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90"
          >
            <CalendarCheck className="h-4 w-4" />
            Agendar asesoría
          </a>

          {downloadSlot ? (
            downloadSlot
          ) : (
            <button
              type="button"
              onClick={downloadResults}
              disabled={downloading}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition disabled:opacity-60 ${hasResult ? 'border-gain/40 bg-gain/10 text-gain hover:bg-gain/15' : 'border-mia-border bg-mia-card text-neutral hover:border-mf-coral/40 hover:text-mia-cream'}`}
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Generando...' : 'Descargar resultados'}
            </button>
          )}

          <button
            type="button"
            onClick={nativeShare}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-mf-coral/40 bg-mf-coral/10 px-4 py-3 text-sm font-bold text-mf-coral transition hover:bg-mf-coral/15"
          >
            <Share2 className="h-4 w-4" />
            Compartir
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <a
          href={links.friend}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => pushEvent('calculator_shared', { method: 'whatsapp_friend', calculator: fileBaseName })}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-mia-border bg-mia-card/70 px-3 py-2 text-xs font-bold text-neutral transition hover:border-gain/40 hover:text-gain"
        >
          <Send className="h-4 w-4" /> Enviar a un amigo
        </a>
        <button
          type="button"
          onClick={copyShareText}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-mia-border bg-mia-card/70 px-3 py-2 text-xs font-bold text-neutral transition hover:border-mf-coral/40 hover:text-mf-coral"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copiado' : 'Copiar enlace'}
        </button>
        <a
          href={links.instagram}
          target="_blank"
          rel="noopener noreferrer"
          onClick={copyShareText}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-mia-border bg-mia-card/70 px-3 py-2 text-xs font-bold text-neutral transition hover:border-pink-400/40 hover:text-pink-300"
        >
          <Instagram className="h-4 w-4" /> Compartir en Instagram
        </a>
      </div>
      <p className="mt-2 text-xs text-neutral/80">
        Nota: Instagram no permite prellenar publicaciones desde web; copiamos el texto para que puedas pegarlo en historias o mensajes.
      </p>
    </div>
  )
}

async function downloadResultPdf({ title, description, result, fileBaseName }: { title: string; description?: string; result: unknown; fileBaseName: string }) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 42
  let y = 48

  const addPageIfNeeded = (needed = 24) => {
    if (y + needed <= pageHeight - margin) return
    doc.addPage()
    y = 48
  }

  const text = (value: string, options?: { size?: number; bold?: boolean; color?: [number, number, number]; maxWidth?: number; gap?: number }) => {
    addPageIfNeeded(options?.gap || 18)
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal')
    doc.setFontSize(options?.size || 10)
    const [r, g, b] = options?.color || [35, 35, 35]
    doc.setTextColor(r, g, b)
    const lines = doc.splitTextToSize(value, options?.maxWidth || pageWidth - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * ((options?.size || 10) + 4)
  }

  doc.setFillColor(20, 20, 20)
  doc.rect(0, 0, pageWidth, 128, 'F')
  doc.setDrawColor(245, 106, 74)
  doc.line(0, 128, pageWidth, 128)

  text('Moneyflow · Resultado de simulador', { size: 10, bold: true, color: [245, 166, 35] })
  y += 8
  text(title, { size: 24, bold: true, color: [255, 255, 255], maxWidth: pageWidth - margin * 2 })
  if (description) text(description, { size: 10, color: [210, 210, 210], maxWidth: pageWidth - margin * 2 })

  y = 160
  text(`Generado: ${new Date().toLocaleString('es-CO')}`, { size: 9, color: [90, 90, 90] })
  y += 10
  doc.setDrawColor(245, 166, 35)
  doc.line(margin, y, pageWidth - margin, y)
  y += 24

  flattenResult(result).forEach(([label, value]) => {
    addPageIfNeeded(34)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(90, 90, 90)
    doc.text(label, margin, y)
    y += 12
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(25, 25, 25)
    const lines = doc.splitTextToSize(value, pageWidth - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * 13 + 8
  })

  doc.save(`${fileBaseName}-${new Date().toISOString().slice(0, 10)}.pdf`)
}

function flattenResult(value: unknown, prefix = 'Resultado'): Array<[string, string]> {
  if (value === null || value === undefined) return [[prefix, '—']]
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [[prefix, String(value)]]
  if (Array.isArray(value)) {
    if (!value.length) return [[prefix, '—']]
    return value.flatMap((item, index) => flattenResult(item, `${prefix} ${index + 1}`)).slice(0, 80)
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => typeof entryValue !== 'function')
      .flatMap(([key, entryValue]) => flattenResult(entryValue, humanizeKey(prefix === 'Resultado' ? key : `${prefix} · ${key}`)))
      .slice(0, 120)
  }
  return [[prefix, String(value)]]
}

function humanizeKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
