'use client'

import { useState, useMemo } from 'react'
import { Trophy, Calendar, Flame, Clock, CheckCircle2, Circle, Plus, Trash2, TrendingUp } from 'lucide-react'
import { useDesafioMundialStore, MONTO_MINIMO_DIA } from '@/stores/desafioMundial.store'
import { desafioMundialApi } from '@/services/api/desafioMundial.api'
import type { Aporte, DesafioMundialProfile } from '@/stores/desafioMundial.store'

const MUNDIAL_DATE = new Date('2030-06-08T00:00:00')

const PAISES = [
  { codigo: 'CO', nombre: 'Colombia', bandera: '🇨🇴' },
  { codigo: 'MX', nombre: 'México', bandera: '🇲🇽' },
  { codigo: 'AR', nombre: 'Argentina', bandera: '🇦🇷' },
  { codigo: 'CL', nombre: 'Chile', bandera: '🇨🇱' },
  { codigo: 'PE', nombre: 'Perú', bandera: '🇵🇪' },
  { codigo: 'VE', nombre: 'Venezuela', bandera: '🇻🇪' },
  { codigo: 'EC', nombre: 'Ecuador', bandera: '🇪🇨' },
  { codigo: 'BO', nombre: 'Bolivia', bandera: '🇧🇴' },
  { codigo: 'PY', nombre: 'Paraguay', bandera: '🇵🇾' },
  { codigo: 'UY', nombre: 'Uruguay', bandera: '🇺🇾' },
  { codigo: 'BR', nombre: 'Brasil', bandera: '🇧🇷' },
  { codigo: 'ES', nombre: 'España', bandera: '🇪🇸' },
  { codigo: 'US', nombre: 'Estados Unidos', bandera: '🇺🇸' },
  { codigo: 'CR', nombre: 'Costa Rica', bandera: '🇨🇷' },
  { codigo: 'PA', nombre: 'Panamá', bandera: '🇵🇦' },
  { codigo: 'GT', nombre: 'Guatemala', bandera: '🇬🇹' },
  { codigo: 'HN', nombre: 'Honduras', bandera: '🇭🇳' },
  { codigo: 'SV', nombre: 'El Salvador', bandera: '🇸🇻' },
  { codigo: 'DO', nombre: 'República Dominicana', bandera: '🇩🇴' },
]

const MONEDAS = ['COP', 'USD', 'MXN', 'ARS', 'EUR', 'PEN', 'CLP', 'BRL']

function calcularEstado() {
  const ahora = new Date()
  ahora.setHours(0, 0, 0, 0)
  const mundial = new Date(MUNDIAL_DATE)
  mundial.setHours(0, 0, 0, 0)
  const diff = Math.floor((mundial.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
  if (diff > 0) return { dias: diff, diaDelTorneo: null }
  return { dias: 0, diaDelTorneo: Math.abs(diff) + 1 }
}

const todayStr = () => new Date().toISOString().slice(0, 10)

function formatFechaCorta(iso: string) {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

function formatMonto(monto: number, moneda: string) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(monto)
}

function generarUltimos30Dias(): string[] {
  const dias: string[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (let i = 0; i < 30; i++) {
    dias.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() - 1)
  }
  return dias.reverse()
}

export default function DesafioMundial() {
  const { isRegistered, profile, registerProfile } = useDesafioMundialStore()
  if (!isRegistered || !profile) return <RegistroForm onRegister={registerProfile} />
  return <Dashboard />
}

function RegistroForm({ onRegister }: { onRegister: (data: DesafioMundialProfile) => void }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [paisCodigo, setPaisCodigo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const paisSeleccionado = PAISES.find((p) => p.codigo === paisCodigo)
  const { dias } = calcularEstado()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !email.trim() || !telefono.trim() || !paisCodigo) {
      setError('Completa todos los campos.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un email válido.')
      return
    }
    setLoading(true)
    setError('')
    const profileData: DesafioMundialProfile = {
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono.trim(),
      pais: paisCodigo,
      bandera: paisSeleccionado?.bandera ?? '🌎',
      registradoEn: new Date().toISOString(),
    }
    const { userId } = await desafioMundialApi.register(profileData)
    onRegister({ ...profileData, userId })
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-mia-black px-4 py-10 text-mia-cream sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-4 text-6xl">⚽</div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-mf-orange/30 bg-mf-orange/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-mf-orange">
            <Trophy className="h-4 w-4" /> FIFA World Cup 2030
          </div>
          <h1 className="font-heading text-4xl font-bold leading-tight text-mia-cream md:text-5xl">Desafío Mundial</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral">
            {dias > 0
              ? `Faltan ${dias.toLocaleString('es-CO')} días. Ahorra mínimo $20.000 diarios y construye el hábito antes del torneo.`
              : '¡El Mundial ya comenzó! Sigue aportando cada día.'}
          </p>
        </div>
        <div className="rounded-[2rem] border border-mia-border bg-mia-card p-6 shadow-2xl md:p-8">
          <p className="mb-6 text-sm font-bold uppercase tracking-[0.18em] text-mf-coral">Inscríbete al desafío</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Nombre completo', type: 'text', val: nombre, set: setNombre, ph: 'Tu nombre' },
              { label: 'Email', type: 'email', val: email, set: setEmail, ph: 'tu@email.com' },
              { label: 'Teléfono', type: 'tel', val: telefono, set: setTelefono, ph: '+57 300 000 0000' },
            ].map(({ label, type, val, set, ph }) => (
              <fieldset key={label}>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral">{label}</label>
                <input type={type} value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                  className="w-full rounded-xl border border-mia-border bg-mia-black/60 px-4 py-3 text-sm text-mia-cream placeholder:text-neutral/50 outline-none transition focus:border-mf-coral" />
              </fieldset>
            ))}
            <fieldset>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral">País</label>
              <select value={paisCodigo} onChange={(e) => setPaisCodigo(e.target.value)}
                className="w-full rounded-xl border border-mia-border bg-mia-black/60 px-4 py-3 text-sm text-mia-cream outline-none transition focus:border-mf-coral">
                <option value="">Selecciona tu país</option>
                {PAISES.map((p) => <option key={p.codigo} value={p.codigo}>{p.bandera} {p.nombre}</option>)}
              </select>
            </fieldset>
            {error && <p className="rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>}
            <button type="submit" disabled={loading}
              className="mt-2 w-full rounded-xl bg-gradient-mf px-6 py-4 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90 disabled:opacity-60">
              {loading ? 'Inscribiendo...' : '¡Me inscribo al desafío! ⚽'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

function Dashboard() {
  const {
    profile, aportes, agregarAporte, eliminarAporte,
    getAportesHoy, getTotalHoy, getDiaCompletado,
    getRacha, getTotalDiasCompletados, getTotalAcumulado,
  } = useDesafioMundialStore()

  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState('COP')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensajeOk, setMensajeOk] = useState('')

  const { dias, diaDelTorneo } = calcularEstado()
  const aportesHoy = getAportesHoy()
  const totalHoy = getTotalHoy()
  const diaCompletadoHoy = getDiaCompletado(todayStr())
  const racha = getRacha()
  const totalDias = getTotalDiasCompletados()
  const totalAcumulado = getTotalAcumulado()

  const ultimos30 = useMemo(() => generarUltimos30Dias(), [])
  const porcentajeCompletado = ultimos30.filter((f) => getDiaCompletado(f)).length

  const faltanHoy = Math.max(0, MONTO_MINIMO_DIA - totalHoy)
  const progresoPct = Math.min(100, Math.round((totalHoy / MONTO_MINIMO_DIA) * 100))

  const monedaDisplay = aportesHoy[0]?.moneda ?? moneda

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault()
    const valor = parseFloat(String(monto).replace(/\./g, '').replace(',', '.'))
    if (!valor || valor <= 0 || isNaN(valor)) {
      setError('Ingresa un monto válido mayor a 0.')
      return
    }
    setError('')
    setGuardando(true)
    agregarAporte(valor, moneda)
    await desafioMundialApi.registrarAporte({
      email: profile?.email ?? '',
      nombre: profile?.nombre ?? '',
      fecha: todayStr(),
      userId: profile?.userId,
      monto: valor,
      moneda,
    })
    setMonto('')
    const nuevoTotal = totalHoy + valor
    if (nuevoTotal >= MONTO_MINIMO_DIA) {
      setMensajeOk('¡Mínimo del día alcanzado! 🏆')
    } else {
      setMensajeOk(`Cuota registrada. Te faltan ${formatMonto(MONTO_MINIMO_DIA - nuevoTotal, moneda)} para completar el día.`)
    }
    setTimeout(() => setMensajeOk(''), 5000)
    setGuardando(false)
  }

  return (
    <main className="min-h-screen bg-mia-black px-4 py-10 text-mia-cream sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl animate-fade-in space-y-6">

        {/* Header */}
        <header className="relative overflow-hidden rounded-[2rem] border border-mf-orange/30 bg-gradient-to-br from-mf-orange/15 via-mia-card to-mia-black p-6 shadow-2xl md:p-10">
          <div className="absolute -right-4 -top-4 select-none text-[10rem] opacity-10 md:-right-8 md:text-[14rem]">⚽</div>
          <div className="relative">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="text-5xl md:text-6xl">{profile?.bandera}</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-mf-orange">Desafío Mundial 2030</p>
                <h1 className="font-heading text-3xl font-bold text-mia-cream md:text-4xl">{profile?.nombre}</h1>
              </div>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-mf-orange/30 bg-mf-orange/10 px-3 py-1 text-xs font-bold text-mf-orange">
                <Trophy className="h-3.5 w-3.5" /> FIFA World Cup 2030
              </span>
            </div>
            {diaDelTorneo !== null ? (
              <div className="mt-4 rounded-2xl border border-gain/30 bg-gain/10 px-5 py-3 text-sm font-semibold text-gain">
                ⚽ ¡El Mundial ya comenzó! Día {diaDelTorneo} del torneo.
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-sm text-neutral">
                <Clock className="h-4 w-4 text-mf-orange" />
                <span>Inicio del torneo: <strong className="text-mia-cream">8 de junio de 2030</strong></span>
              </div>
            )}
          </div>
        </header>

        {/* Métricas */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard icon={<Clock className="h-5 w-5 text-mf-orange" />} label="Días restantes"
            value={diaDelTorneo !== null ? `Día ${diaDelTorneo}` : dias.toLocaleString('es-CO')}
            sub={diaDelTorneo !== null ? 'del torneo' : 'para el Mundial'} accent="border-mf-orange/30" />
          <MetricCard icon={<TrendingUp className="h-5 w-5 text-gain" />} label="Total acumulado"
            value={formatMonto(totalAcumulado, monedaDisplay)} sub="suma de todas las cuotas" accent="border-gain/30" />
          <MetricCard icon={<Calendar className="h-5 w-5 text-mf-coral" />} label="Días completados"
            value={String(totalDias)} sub={`mínimo $${(MONTO_MINIMO_DIA / 1000).toFixed(0)}k alcanzado`} accent="border-mf-coral/30" />
          <MetricCard icon={<Flame className="h-5 w-5 text-mia-blue" />} label="Racha actual"
            value={`${racha} ${racha === 1 ? 'día' : 'días'}`} sub="consecutivos completados" accent="border-mia-blue/30" />
        </section>

        {/* Agregar cuota de hoy */}
        <section className="rounded-[2rem] border border-mia-border bg-mia-card p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mf-coral">Agregar cuota de hoy</p>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${diaCompletadoHoy ? 'bg-gain/15 text-gain' : 'bg-mf-orange/10 text-mf-orange'}`}>
              {diaCompletadoHoy ? '✅ Mínimo alcanzado' : `Mínimo: ${formatMonto(MONTO_MINIMO_DIA, 'COP')}`}
            </span>
          </div>

          {/* Progreso del día */}
          <div className="mb-5">
            <div className="mb-2 flex justify-between text-xs text-neutral">
              <span>Hoy: <strong className="text-mia-cream">{formatMonto(totalHoy, monedaDisplay)}</strong></span>
              <span>{diaCompletadoHoy ? 'Completado' : `Faltan ${formatMonto(faltanHoy, monedaDisplay)}`}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-mia-black/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${diaCompletadoHoy ? 'bg-gain' : 'bg-gradient-mf'}`}
                style={{ width: `${progresoPct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-neutral">{progresoPct}% del mínimo diario</p>
          </div>

          <form onSubmit={handleAgregar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral">Monto de la cuota</label>
              <input
                type="number" min="1" step="any" value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ej: 50000"
                className="w-full rounded-xl border border-mia-border bg-mia-black/60 px-4 py-3 text-sm text-mia-cream placeholder:text-neutral/50 outline-none transition focus:border-mf-coral"
              />
            </div>
            <div className="sm:w-28">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral">Moneda</label>
              <select value={moneda} onChange={(e) => setMoneda(e.target.value)}
                className="w-full rounded-xl border border-mia-border bg-mia-black/60 px-4 py-3 text-sm text-mia-cream outline-none transition focus:border-mf-coral">
                {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <button type="submit" disabled={guardando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf px-6 py-3 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90 disabled:opacity-60 sm:self-end">
              <Plus className="h-4 w-4" />
              {guardando ? 'Guardando...' : 'Agregar cuota'}
            </button>
          </form>

          {error && <p className="mt-3 rounded-xl border border-loss/30 bg-loss/10 px-4 py-2 text-sm text-loss">{error}</p>}
          {mensajeOk && <p className="mt-3 rounded-xl border border-gain/30 bg-gain/10 px-4 py-2 text-sm font-medium text-gain">{mensajeOk}</p>}

          {/* Cuotas de hoy */}
          {aportesHoy.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral">Cuotas de hoy</p>
              {aportesHoy.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-mia-border bg-mia-black/30 px-4 py-2.5">
                  <span className="text-sm font-semibold text-mia-cream">{formatMonto(a.monto, a.moneda)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral">{a.moneda}</span>
                    <button type="button" onClick={() => eliminarAporte(a.id)}
                      className="text-neutral/40 transition hover:text-loss" aria-label="Eliminar cuota">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Grilla 30 días */}
        <section className="rounded-[2rem] border border-mia-border bg-mia-card p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mf-coral">Últimos 30 días</p>
            <span className="text-xs text-neutral">{porcentajeCompletado} de 30 completados</span>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
            {ultimos30.map((fecha) => {
              const completado = getDiaCompletado(fecha)
              const esHoy = fecha === todayStr()
              return (
                <div key={fecha} title={fecha}
                  className={`flex aspect-square flex-col items-center justify-center rounded-xl border text-xs font-bold transition
                    ${completado ? 'border-gain/40 bg-gain/15 text-gain'
                      : esHoy ? 'border-mf-coral/50 bg-mf-coral/10 text-mf-coral'
                        : 'border-mia-border bg-mia-black/30 text-neutral/40'}`}>
                  {completado
                    ? <CheckCircle2 className="h-5 w-5" />
                    : esHoy
                      ? <><Circle className="h-4 w-4" /><span className="mt-0.5 text-[9px]">hoy</span></>
                      : <span>{formatFechaCorta(fecha)}</span>}
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-gain" /> Día completado (≥ $20k)</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full border border-mf-coral" /> Hoy</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full border border-mia-border" /> Sin completar</span>
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub: string; accent: string }) {
  return (
    <article className={`rounded-[1.5rem] border bg-mia-card p-5 ${accent}`}>
      <div className="mb-3 flex items-center gap-2">{icon}<span className="text-xs font-bold uppercase tracking-[0.12em] text-neutral">{label}</span></div>
      <p className="font-heading text-xl font-bold text-mia-cream">{value}</p>
      <p className="mt-1 text-xs text-neutral">{sub}</p>
    </article>
  )
}
