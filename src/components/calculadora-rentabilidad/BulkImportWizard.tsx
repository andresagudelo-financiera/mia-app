'use client'

import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { Upload, X, CheckCircle, AlertTriangle, ArrowRight, Table, Download } from 'lucide-react'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { formatNumber, formatDate } from '@/lib/formatters'

interface Props {
  onClose: () => void
  onSuccess: (count: number) => void
}

type RawRow = Record<string, string | number>

type ColumnMap = {
  date: string
  investmentName: string
  amount: string
  trm: string
  note: string
}

type ProcessedRow = {
  index: number
  raw: RawRow
  dateStr?: string
  dateValid: boolean
  investmentName?: string
  amount?: number
  trm?: number
  note?: string
  isNewInvestment: boolean
  hasError: boolean
}

export default function BulkImportWizard({ onClose, onSuccess }: Props) {
  const { config, investments, transactions, addInvestment, addTransaction } = useRentabilidadStore()
  
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  
  const [colMap, setColMap] = useState<ColumnMap>({
    date: '',
    investmentName: '',
    amount: '',
    trm: '',
    note: ''
  })

  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isProcessingPdf, setIsProcessingPdf] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Fecha,Descripción,Monto,TRM,Nota\n15/05/2024,Ingreso Salario,5000000,,\n16/05/2024,Compra supermercado,-250000,,\n"
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "plantilla_transacciones.csv")
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    
    const isCsv = selected.name.toLowerCase().endsWith('.csv')
    const isPdf = selected.name.toLowerCase().endsWith('.pdf')

    if (isPdf) {
      setIsProcessingPdf(true)
      try {
        const formData = new FormData()
        formData.append('file', selected)
        const res = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        if (data.success && data.data.length > 0) {
          const h = Object.keys(data.data[0])
          setHeaders(h)
          setRawRows(data.data as RawRow[])
          autoMapColumns(h)
          setStep(2)
        } else {
          setErrorMsg('No se encontraron transacciones en el PDF o hubo un error al procesarlo. Asegúrate de que el documento tenga transacciones válidas.')
        }
      } catch (err) {
        console.error(err)
        setErrorMsg('Ocurrió un error al enviar el PDF al servidor.')
      } finally {
        setIsProcessingPdf(false)
      }
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target?.result
      if (!bstr) return

      if (isCsv && typeof bstr === 'string') {
        Papa.parse(bstr, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as RawRow[]
            if (data.length > 0) {
              const h = Object.keys(data[0])
              setHeaders(h)
              setRawRows(data)
              autoMapColumns(h)
              setStep(2)
            }
          }
        })
      } else {
        // Excel processing
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json<RawRow>(ws, { raw: false, dateNF: 'yyyy-mm-dd' })
        
        if (data.length > 0) {
          const h = Object.keys(data[0])
          setHeaders(h)
          setRawRows(data)
          autoMapColumns(h)
          setStep(2)
        }
      }
    }

    if (isCsv) {
      reader.readAsText(selected)
    } else {
      reader.readAsBinaryString(selected)
    }
  }

  const autoMapColumns = (h: string[]) => {
    const map: ColumnMap = { date: '', investmentName: '', amount: '', trm: '', note: '' }
    
    h.forEach(col => {
      const lower = col.toLowerCase()
      if (!map.date && (lower.includes('fecha') || lower.includes('date'))) map.date = col
      else if (!map.investmentName && (lower.includes('descrip') || lower.includes('concepto') || lower.includes('inversión'))) map.investmentName = col
      else if (!map.amount && (lower.includes('monto') || lower.includes('valor') || lower.includes('cargo') || lower.includes('abono'))) map.amount = col
      else if (!map.trm && lower.includes('trm')) map.trm = col
      else if (!map.note && (lower.includes('nota') || lower.includes('observa') || lower.includes('detalle'))) map.note = col
    })
    
    setColMap(map)
  }

  // Parse strings to valid date "YYYY-MM-DD"
  const parseDate = (val: string | number): { dateStr: string, valid: boolean } => {
    if (!val) return { dateStr: '', valid: false }
    const str = String(val).trim()
    
    // Check if it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const d = new Date(str)
      return { dateStr: str, valid: !isNaN(d.getTime()) }
    }
    
    // Check DD/MM/YYYY or DD-MM-YYYY
    const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (match) {
      const [_, d, m, y] = match
      const dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      return { dateStr, valid: true }
    }

    // Check DD/MM or DD-MM (assume current year)
    const matchShort = str.match(/^(\d{1,2})[\/\-](\d{1,2})$/)
    if (matchShort) {
      const [_, d, m] = matchShort
      const y = new Date().getFullYear()
      const dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      return { dateStr, valid: true }
    }
    
    // Fallback: try JS Date
    const d = new Date(str)
    if (!isNaN(d.getTime())) {
      return { dateStr: d.toISOString().slice(0, 10), valid: true }
    }
    
    return { dateStr: str, valid: false }
  }

  // Extract absolute number from string like "$ -5,000.00"
  const parseAmount = (val: string | number): number | undefined => {
    if (val === undefined || val === null || val === '') return undefined
    if (typeof val === 'number') return val
    
    const cleaned = val.replace(/[^\d.,-]/g, '')
    // Handle European formats (1.000,50) vs US (1,000.50)
    let normalized = cleaned
    if (cleaned.includes(',') && cleaned.includes('.')) {
      const lastComma = cleaned.lastIndexOf(',')
      const lastDot = cleaned.lastIndexOf('.')
      if (lastComma > lastDot) {
        // 1.000,50 -> 1000.50
        normalized = cleaned.replace(/\./g, '').replace(',', '.')
      } else {
        // 1,000.50 -> 1000.50
        normalized = cleaned.replace(/,/g, '')
      }
    } else if (cleaned.includes(',')) {
      // Could be 1000,50 or 1,000
      // If it ends with ,XX it's a decimal, otherwise thousands separator
      if (cleaned.match(/,\d{2}$/)) {
        normalized = cleaned.replace(',', '.')
      } else {
        normalized = cleaned.replace(/,/g, '')
      }
    } else if (cleaned.includes('.')) {
      // If it has dots but no commas. Check if it's a Colombian thousand separator "150.000" or a decimal "150.00"
      // If it has multiple dots (8.904.339), it's thousands separator.
      // If it has one dot and ends with exactly 3 digits, it's thousands separator (e.g. 150.000).
      if (cleaned.match(/\.\d{3}(\.\d{3})*$/)) {
        normalized = cleaned.replace(/\./g, '')
      }
      // Else it's a normal decimal 150.00, keep as is
    }
    
    const num = parseFloat(normalized)
    return isNaN(num) ? undefined : num
  }

  const processData = () => {
    const existingNames = new Set(investments.map(i => i.name.toLowerCase().trim()))
    
    const processed: ProcessedRow[] = rawRows.map((row, i) => {
      const dateVal = colMap.date ? row[colMap.date] : ''
      const invVal = colMap.investmentName ? row[colMap.investmentName] : ''
      const amountVal = colMap.amount ? row[colMap.amount] : ''
      const trmVal = colMap.trm ? row[colMap.trm] : ''
      const noteVal = colMap.note ? row[colMap.note] : ''
      
      const parsedD = parseDate(dateVal)
      const parsedAmount = parseAmount(amountVal)
      const parsedTrm = parseAmount(trmVal)
      const invStr = String(invVal || '').trim()
      
      const hasError = !parsedD.valid || !parsedAmount || !invStr
      const isNew = invStr !== '' && !existingNames.has(invStr.toLowerCase())
      
      return {
        index: i,
        raw: row,
        dateStr: parsedD.dateStr,
        dateValid: parsedD.valid,
        investmentName: invStr,
        amount: parsedAmount,
        trm: parsedTrm,
        note: noteVal ? String(noteVal) : undefined,
        isNewInvestment: isNew,
        hasError
      }
    })
    
    setProcessedRows(processed)
    setStep(3)
  }

  const handleImport = () => {
    const validRows = processedRows.filter(r => !r.hasError)
    if (validRows.length === 0) return

    let newInvCount = 0
    let txCount = 0

    // Auto-create investments
    const newInvs = Array.from(new Set(validRows.filter(r => r.isNewInvestment).map(r => r.investmentName!)))
    newInvs.forEach(name => {
      addInvestment({
        name,
        pilar: 'Extracto de Inversión',
        entity: 'Banco/Importado',
        currency: config.baseCurrency
      })
      newInvCount++
    })

    // Import transactions
    validRows.forEach(row => {
      // Find the investment (either existing or just created)
      const invObj = investments.find(i => i.name.toLowerCase() === row.investmentName!.toLowerCase()) || {
        entity: 'Banco/Importado',
        currency: config.baseCurrency
      }
      
      // Check for duplicates
      const isDuplicate = transactions.some(t => 
        t.investmentName.toLowerCase() === row.investmentName!.toLowerCase() && 
        t.date === row.dateStr && 
        t.amountLocal === row.amount
      )

      if (!isDuplicate) {
        addTransaction({
          investmentName: row.investmentName!,
          date: row.dateStr!,
          amountLocal: row.amount!,
          trm: row.trm,
          note: row.note,
          entity: invObj.entity,
          currency: invObj.currency
        })
        txCount++
      }
    })
    
    onSuccess(txCount)
    onClose()
  }

  const validCount = processedRows.filter(r => !r.hasError).length
  const newInvCount = new Set(processedRows.filter(r => !r.hasError && r.isNewInvestment).map(r => r.investmentName)).size

  return (
    <div className="fixed inset-0 z-50 bg-mia-bg/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-mia-surface w-full max-w-4xl rounded-3xl border border-mia-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-mia-border flex justify-between items-center bg-mia-surface/50">
          <h2 className="text-xl font-heading font-bold text-mia-cream flex items-center gap-2">
            <Table className="w-5 h-5 text-mf-coral" />
            Importar Transacciones (Excel/CSV)
          </h2>
          <button onClick={onClose} className="p-2 text-neutral hover:text-mia-cream transition-colors rounded-full hover:bg-mia-border/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-neutral text-sm flex-1">
                  Sube tu extracto de inversión en formato Excel (.xlsx, .xls), .csv o .pdf. El sistema identificará automáticamente los montos y los convertirá a aportes absolutos.
                </p>
                <button 
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-mia-surface border border-mia-border hover:border-mf-coral/50 text-mia-cream rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4 text-mf-coral" />
                  Plantilla recomendada
                </button>
              </div>
              
              <div 
                className="border-2 border-dashed border-mia-border hover:border-mf-coral/50 bg-mia-surface/30 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors"
                onClick={() => !isProcessingPdf && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/pdf"
                  className="hidden" 
                />
                <div className={`p-4 bg-gradient-mf rounded-full text-white mb-5 shadow-lg shadow-mf-coral/20 transition-transform ${isProcessingPdf ? 'animate-bounce' : 'hover:scale-110'}`}>
                  <Upload className="w-10 h-10" />
                </div>
                <h3 className="text-mia-cream font-bold text-lg mb-1">{isProcessingPdf ? 'Procesando PDF...' : 'Haz clic para subir un archivo'}</h3>
                <p className="text-neutral text-sm">Soporta .xlsx, .xls, .csv y .pdf</p>
              </div>

              {errorMsg && (
                <div className="bg-loss/10 border border-loss/20 p-4 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-loss flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-loss font-medium">{errorMsg}</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-mia-blue/10 border border-mia-blue/20 rounded-xl p-4 text-sm text-mia-cream">
                Hemos detectado <strong>{rawRows.length}</strong> filas. Por favor, confirma a qué corresponde cada columna de tu archivo.
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { key: 'date', label: 'Fecha *' },
                  { key: 'investmentName', label: 'Descripción / Inversión *' },
                  { key: 'amount', label: 'Monto *' },
                  { key: 'trm', label: 'TRM (Opcional)' },
                  { key: 'note', label: 'Nota (Opcional)' }
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral">{field.label}</label>
                    <select
                      value={colMap[field.key as keyof ColumnMap]}
                      onChange={(e) => setColMap({ ...colMap, [field.key]: e.target.value })}
                      className="w-full px-3 py-2.5 bg-mia-surface/50 border border-mia-border rounded-xl text-sm text-mia-cream focus:border-mf-coral focus:outline-none appearance-none"
                    >
                      <option value="">-- Ignorar --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl text-neutral font-medium hover:bg-mia-border/50 text-sm transition-colors">Atrás</button>
                <button
                  onClick={processData}
                  disabled={!colMap.date || !colMap.investmentName || !colMap.amount}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-mf text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-md shadow-mf-coral/20 ml-auto hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                >
                  Procesar Filas <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex gap-4 p-4 bg-mia-surface/50 rounded-2xl border border-mia-border items-center">
                <div className="flex-1">
                  <h3 className="text-mia-cream font-bold text-lg">{validCount} transacciones válidas listas para importar</h3>
                  {newInvCount > 0 && (
                    <p className="text-mf-coral text-sm mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Se auto-crearán {newInvCount} inversiones nuevas (en el pilar "Por Clasificar").
                    </p>
                  )}
                </div>
                <button 
                  onClick={handleImport}
                  disabled={validCount === 0}
                  className="bg-gradient-mf text-white font-bold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Confirmar Importación
                </button>
              </div>

              <div className="overflow-x-auto border border-mia-border rounded-xl max-h-[400px]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-mia-surface/80 sticky top-0 backdrop-blur-sm shadow-sm z-10">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-neutral uppercase">Estado</th>
                      <th className="px-4 py-3 text-xs font-semibold text-neutral uppercase">Fecha</th>
                      <th className="px-4 py-3 text-xs font-semibold text-neutral uppercase">Inversión</th>
                      <th className="px-4 py-3 text-xs font-semibold text-neutral uppercase">Aporte</th>
                      <th className="px-4 py-3 text-xs font-semibold text-neutral uppercase">TRM</th>
                      <th className="px-4 py-3 text-xs font-semibold text-neutral uppercase">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mia-border">
                    {processedRows.map(row => (
                      <tr key={row.index} className={`hover:bg-mia-surface/40 ${row.hasError ? 'bg-loss/5' : ''}`}>
                        <td className="px-4 py-3">
                          {row.hasError ? (
                            <span className="text-loss text-xs font-bold flex items-center gap-1"><X className="w-3 h-3" /> Error</span>
                          ) : (
                            <span className="text-mia-green text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> OK</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-mia-cream whitespace-nowrap">{row.dateStr || <span className="text-loss">Inválida</span>}</td>
                        <td className="px-4 py-3 text-mia-cream">
                          {row.investmentName || <span className="text-loss">Falta nombre</span>}
                          {row.isNewInvestment && !row.hasError && (
                            <span className="ml-2 text-[10px] bg-mf-coral/20 text-mf-coral px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Nueva</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.amount !== undefined ? (
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`font-semibold ${row.amount < 0 ? 'text-loss' : 'text-gain'}`}>
                                {row.amount > 0 ? '+' : ''}{formatNumber(row.amount)}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border ${row.amount < 0 ? 'bg-loss/10 text-loss border-loss/20' : 'bg-gain/10 text-gain border-gain/20'}`}>
                                {row.amount < 0 ? 'Salida' : 'Entrada'}
                              </span>
                            </div>
                          ) : <span className="text-loss">—</span>}
                        </td>
                        <td className="px-4 py-3 text-neutral">{row.trm ? formatNumber(row.trm) : '—'}</td>
                        <td className="px-4 py-3 text-neutral truncate max-w-[150px]">{row.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {processedRows.some(r => r.hasError) && (
                <p className="text-xs text-neutral">Las filas con errores serán ignoradas. Asegúrate de mapear bien las columnas.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
