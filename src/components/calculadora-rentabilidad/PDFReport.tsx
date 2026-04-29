'use client'

import React, { useRef, useState } from 'react'
import { format } from 'date-fns'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import PortfolioChart from './PortfolioChart'
import type { InvestmentResult, Transaction, Snapshot } from '@/types/rentabilidad'

function fmt(n: number, currency: string): string {
  if (isNaN(n)) return '—'
  return `${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })} ${currency}`
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'N/A'
  return `${(n * 100).toFixed(2)}%`
}

interface DownloadProps {
  results: InvestmentResult[]
  transactions: Transaction[]
  snapshots: Snapshot[]
  trm: number
  baseCurrency: string
  userName: string
  generatedAt: string
  filename: string
  onDownload: () => void
}

export default function PDFDownloadButton({
  results,
  transactions,
  snapshots,
  trm,
  baseCurrency,
  userName,
  generatedAt,
  filename,
  onDownload
}: DownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const totalInvested = results.reduce((s, r) => s + (r.totalInvestedLocal ?? r.totalInvestedUSDtoLocal ?? 0), 0)
  const totalValue = results.reduce((s, r) => s + (r.currentValueLocal ?? r.currentValueUSDtoLocal ?? 0), 0)
  const gainLoss = totalValue - totalInvested

  const handleDownload = async () => {
    if (!reportRef.current || isGenerating) return
    
    setIsGenerating(true)
    onDownload()

    try {
      // html2canvas needs the element to be visible to render it, 
      // but it's positioned way off-screen so the user doesn't see it.
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // higher resolution
        useCORS: true,
        backgroundColor: '#0A0A0A', // matches the page style
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(filename)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Hubo un error generando el PDF. Por favor, intenta de nuevo.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 bg-gradient-mf text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {isGenerating ? '⏳ Generando...' : '⬇ Descargar PDF'}
      </button>

      {/* Hidden Report Template (Rendered off-screen) */}
      <div 
        ref={reportRef} 
        style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', backgroundColor: '#0A0A0A', color: 'white', fontFamily: 'sans-serif' }}
      >
        <div style={{ backgroundColor: '#F04E37', padding: '24px 32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: 'white' }}>Reporte de Rentabilidad · MIA by Moneyflow</h1>
          <p style={{ fontSize: '14px', margin: '4px 0 0 0', opacity: 0.9 }}>{userName}</p>
          <p style={{ fontSize: '12px', margin: '2px 0 0 0', opacity: 0.8 }}>Generado el {format(new Date(generatedAt), 'dd/MM/yyyy')}</p>
        </div>

        <div style={{ padding: '24px 32px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#F04E37', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Resumen</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '8px', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#A1A1AA', margin: '0 0 4px 0' }}>Total Invertido</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{fmt(totalInvested, baseCurrency)}</p>
            </div>
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '8px', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#A1A1AA', margin: '0 0 4px 0' }}>Valor Actual</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{fmt(totalValue, baseCurrency)}</p>
            </div>
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '8px', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#A1A1AA', margin: '0 0 4px 0' }}>Ganancia/Pérdida</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: gainLoss >= 0 ? '#22C55E' : '#EF4444' }}>
                {gainLoss >= 0 ? '+' : ''}{fmt(gainLoss, baseCurrency)}
              </p>
            </div>
            <div style={{ backgroundColor: '#1A1A1A', borderRadius: '8px', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#A1A1AA', margin: '0 0 4px 0' }}>TRM</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{Math.round(trm).toLocaleString()} {baseCurrency}/USD</p>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            {/* Render the chart with animation disabled so html2canvas captures it instantly */}
            <PortfolioChart results={results} isAnimationActive={false} />
          </div>

          <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#F04E37', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Detalle por Inversión</h2>
          
          <div style={{ width: '100%', borderCollapse: 'collapse' }}>
            <div style={{ display: 'flex', backgroundColor: '#F04E37', padding: '12px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
              <div style={{ flex: 2 }}>Inversión</div>
              <div style={{ flex: 1 }}>Pilar</div>
              <div style={{ flex: 1.5, textAlign: 'right' }}>Invertido</div>
              <div style={{ flex: 1.5, textAlign: 'right' }}>Valor Actual</div>
              <div style={{ flex: 1.5, textAlign: 'right' }}>Ganancia</div>
              <div style={{ flex: 1, textAlign: 'right' }}>TIR</div>
            </div>

            {results.map((r, i) => {
              const invested = r.totalInvestedLocal ?? r.totalInvestedUSDtoLocal ?? 0
              const value = r.currentValueLocal ?? r.currentValueUSDtoLocal
              const gl = value !== undefined ? value - invested : undefined
              const irr = r.irrLocal ?? r.irrUSD ?? r.irrUSDtoLocal

              return (
                <div key={r.investment.id} style={{ display: 'flex', padding: '16px', borderBottom: '1px solid #333', backgroundColor: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent', fontSize: '13px' }}>
                  <div style={{ flex: 2, fontWeight: '500' }}>{r.investment.name}</div>
                  <div style={{ flex: 1, color: '#A1A1AA' }}>{r.investment.pilar}</div>
                  <div style={{ flex: 1.5, textAlign: 'right' }}>{fmt(invested, baseCurrency)}</div>
                  <div style={{ flex: 1.5, textAlign: 'right' }}>{value !== undefined ? fmt(value, baseCurrency) : '—'}</div>
                  <div style={{ flex: 1.5, textAlign: 'right', fontWeight: 'bold', color: (gl ?? 0) >= 0 ? '#22C55E' : '#EF4444' }}>
                    {gl !== undefined ? `${gl >= 0 ? '+' : ''}${fmt(gl, baseCurrency)}` : '—'}
                  </div>
                  <div style={{ flex: 1, textAlign: 'right', fontWeight: 'bold', color: (irr ?? 0) >= 0 ? '#22C55E' : '#EF4444' }}>
                    {fmtPct(irr)}
                  </div>
                </div>
              )
            })}
          </div>

          {transactions.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#F04E37', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Flujos de Inversión (Aportes/Retiros)</h2>
              <div style={{ width: '100%', borderCollapse: 'collapse' }}>
                <div style={{ display: 'flex', backgroundColor: '#F04E37', padding: '12px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
                  <div style={{ flex: 1.5 }}>Fecha</div>
                  <div style={{ flex: 2 }}>Inversión</div>
                  <div style={{ flex: 1.5 }}>Entidad</div>
                  <div style={{ flex: 1.5, textAlign: 'right' }}>Monto</div>
                </div>
                {transactions.slice().sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid #333', backgroundColor: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent', fontSize: '12px' }}>
                    <div style={{ flex: 1.5 }}>{format(new Date(t.date), 'dd/MM/yyyy')}</div>
                    <div style={{ flex: 2, fontWeight: '500' }}>{t.investmentName}</div>
                    <div style={{ flex: 1.5, color: '#A1A1AA' }}>{t.entity}</div>
                    <div style={{ flex: 1.5, textAlign: 'right', color: t.amountLocal >= 0 ? '#22C55E' : '#EF4444', fontWeight: 'bold' }}>
                      {t.amountLocal >= 0 ? '+' : ''}{fmt(t.amountLocal, t.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {snapshots.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#F04E37', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Historial de Cortes (Valoraciones)</h2>
              <div style={{ width: '100%', borderCollapse: 'collapse' }}>
                <div style={{ display: 'flex', backgroundColor: '#F04E37', padding: '12px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
                  <div style={{ flex: 1.5 }}>Fecha</div>
                  <div style={{ flex: 2 }}>Inversión</div>
                  <div style={{ flex: 1.5 }}>Entidad</div>
                  <div style={{ flex: 1.5, textAlign: 'right' }}>Valor</div>
                </div>
                {snapshots.slice().sort((a,b) => new Date(a.cutDate).getTime() - new Date(b.cutDate).getTime()).map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid #333', backgroundColor: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent', fontSize: '12px' }}>
                    <div style={{ flex: 1.5 }}>{format(new Date(s.cutDate), 'dd/MM/yyyy')}</div>
                    <div style={{ flex: 2, fontWeight: '500' }}>{s.investmentName}</div>
                    <div style={{ flex: 1.5, color: '#A1A1AA' }}>{s.entity}</div>
                    <div style={{ flex: 1.5, textAlign: 'right', fontWeight: 'bold' }}>
                      {s.valueLocal !== undefined ? fmt(s.valueLocal, s.currency) : (s.valueUSD !== undefined ? fmt(s.valueUSD, 'USD') : '—')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #333', margin: '40px 32px 24px 32px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', color: '#A1A1AA', fontSize: '12px' }}>
          <span>moneyflow.co · @we.are.mia</span>
          <span>MIA Platform v1</span>
        </div>
      </div>
    </>
  )
}
