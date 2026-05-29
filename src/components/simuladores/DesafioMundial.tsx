'use client'

import { useState, useMemo } from 'react'
import { Trophy, Zap, Calendar, TrendingUp, Flame, Plus, CheckCircle2, PiggyBank, Trash2, Clock } from 'lucide-react'
import { useDesafioMundialStore, MONTO_MINIMO_DIA } from '@/stores/desafioMundial.store'
import { desafioMundialApi } from '@/services/api/desafioMundial.api'
import type { DesafioMundialProfile } from '@/stores/desafioMundial.store'

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
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(monto)
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
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-mf-coral/30 bg-gradient-to-br from-mf-coral/20 via-mia-card to-mia-black p-8 shadow-2xl shadow-mf-coral/10 md:p-10">
          <div className="absolute right-6 top-6 hidden text-8xl opacity-20 md:block">⚽</div>

          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mf-coral/30 bg-mf-coral/10 px-3 py-1 text-xs font-bold text-mf-coral">
              <Zap className="h-4 w-4" /> Reto de ahorro · FIFA World Cup 2030
            </div>
            <h1 className="font-heading text-4xl font-bold text-mia-cream md:text-6xl">Desafío Mundial</h1>
            <p className="mt-4 text-base leading-relaxed text-neutral">
              {dias > 0
                ? `Faltan ${dias.toLocaleString('es-CO')} días para el Mundial. Ahorra mínimo $20.000 cada día y construye el hábito financiero antes del torneo.`
                : '¡El Mundial ya comenzó! Sigue registrando tus aportes diarios.'}
            </p>
          </div>

          <div className="mt-8 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-mia-cream">Nombre completo</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border border-mia-border bg-mia-black px-4 py-3 text-mia-cream placeholder:text-neutral focus:border-mf-coral focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-mia-cream">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-mia-border bg-mia-black px-4 py-3 text-mia-cream placeholder:text-neutral focus:border-mf-coral focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-mia-cream">Teléfono</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+57 300 000 0000"
                  className="w-full rounded-xl border border-mia-border bg-mia-black px-4 py-3 text-mia-cream placeholder:text-neutral focus:border-mf-coral focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-mia-cream">País</label>
                <select
                  value={paisCodigo}
                  onChange={(e) => setPaisCodigo(e.target.value)}
                  className="w-full rounded-xl border border-mia-border bg-mia-black px-4 py-3 text-mia-cream focus:border-mf-coral focus:outline-none"
                >
                  <option value="">Selecciona tu país</option>
                  {PAISES.map((p) => (
                    <option key={p.codigo} value={p.codigo}>{p.bandera} {p.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>
            )}

            <button
              type="button"
              onClick={handleSubmit as unknown as React.MouseEventHandler}
              disabled={loading}
              className="w-full rounded-xl bg-gradient-mf px-6 py-4 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90 disabled:opacity-60 mt-6"
            >
              {loading ? 'Inscribiendo...' : '¡Unirme al Desafío Mundial! ⚽'}
            </button>
          </div>
        </section>
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
  const diasCompletadosUltimos30 = ultimos30.filter((f) => getDiaCompletado(f)).length

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
      setMensajeOk('¡Mínimo del día alcanzado! Sigue sumando cuotas si quieres. 🏆')
    } else {
      setMensajeOk(`Cuota registrada. Te faltan ${formatMonto(MONTO_MINIMO_DIA - nuevoTotal, moneda)} para completar el día.`)
    }
    setTimeout(() => setMensajeOk(''), 5000)
    setGuardando(false)
  }

  return (
    <main className="min-h-screen bg-mia-black px-4 py-10 text-mia-cream sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl animate-fade-in space-y-8">

        {/* Header */}
        <section className="relative overflow-hidden rounded-[2rem] border border-mf-coral/30 bg-gradient-to-br from-mf-coral/20 via-mia-card to-mia-black p-6 shadow-2xl shadow-mf-coral/10 md:p-10">
          <div className="absolute right-6 top-6 hidden text-8xl opacity-20 md:block">
            {profile?.bandera}
          </div>
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mf-coral/30 bg-mf-coral/10 px-3 py-1 text-xs font-bold text-mf-coral">
              <Zap className="h-4 w-4" /> Desafío activo · FIFA World Cup 2030
            </div>
            <h1 className="font-heading text-4xl font-bold text-mia-cream md:text-6xl">
              {profile?.nombre}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-neutral">
              {diaDelTorneo !== null
                ? `⚽ ¡El Mundial ya comenzó! Estás en el día ${diaDelTorneo} del torneo.`
                : `Faltan ${dias.toLocaleString('es-CO')} días para el Mundial. Mínimo $20.000 por día.`}
            </p>
          </div>

          <div className="mt-8 max-w-2xl">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-neutral">
              <span>Progreso de hoy</span>
              <span>{progresoPct}% · {diaCompletadoHoy ? '✅ Completado' : `Faltan ${formatMonto(faltanHoy, monedaDisplay)}`}</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-mia-black/60">
              <div
                className="h-full rounded-full bg-gradient-mf transition-all duration-500"
                style={{ width: `${progresoPct}%` }}
              />
            </div>
          </div>
        </section>

        {/* Métricas */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-mia-border bg-mia-card p-5">
            <Clock className="h-5 w-5 text-mf-coral mb-3" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral mb-2">Días restantes</p>
            <p className="font-heading text-3xl font-bold text-mia-cream">
              {diaDelTorneo !== null ? `Día ${diaDelTorneo}` : dias.toLocaleString('es-CO')}
            </p>
            <p className="mt-1 text-xs text-neutral">{diaDelTorneo !== null ? 'del torneo' : 'para el Mundial'}</p>
          </div>

          <div className="rounded-2xl border border-mia-border bg-mia-card p-5">
            <TrendingUp className="h-5 w-5 text-mf-coral mb-3" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral mb-2">Total acumulado</p>
            <p className="font-heading text-3xl font-bold text-mia-cream">
              {totalAcumulado > 0 ? formatMonto(totalAcumulado, monedaDisplay) : '$0'}
            </p>
            <p className="mt-1 text-xs text-neutral">suma de todas las cuotas</p>
          </div>

          <div className="rounded-2xl border border-mia-border bg-mia-card p-5">
            <Calendar className="h-5 w-5 text-mf-coral mb-3" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral mb-2">Días completados</p>
            <p className="font-heading text-3xl font-bold text-mia-cream">{totalDias}</p>
            <p className="mt-1 text-xs text-neutral">con mínimo $20k alcanzado</p>
          </div>

          <div className="rounded-2xl border border-mia-border bg-mia-card p-5">
            <Flame className="h-5 w-5 text-mf-coral mb-3" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral mb-2">Racha actual</p>
            <p className="font-heading text-3xl font-bold text-mia-cream">
              {racha} {racha === 1 ? 'día' : 'días'}
            </p>
            <p className="mt-1 text-xs text-neutral">consecutivos completados</p>
          </div>

          <div className="rounded-2xl border border-mia-border bg-mia-card p-5">
            <PiggyBank className="h-5 w-5 text-mf-coral mb-3" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral mb-2">Ahorrado hoy</p>
            <p className="font-heading text-3xl font-bold text-mia-cream">
              {totalHoy > 0 ? formatMonto(totalHoy, monedaDisplay) : '$0'}
            </p>
            <p className="mt-1 text-xs text-neutral">{aportesHoy.length} {aportesHoy.length === 1 ? 'cuota' : 'cuotas'} registradas</p>
          </div>

          <div className="rounded-2xl border border-mia-border bg-mia-card p-5">
            <CheckCircle2 className="h-5 w-5 text-mf-coral mb-3" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral mb-2">Últimos 30 días</p>
            <p className="font-heading text-3xl font-bold text-mia-cream">{diasCompletadosUltimos30}/30</p>
            <p className="mt-1 text-xs text-neutral">días completados</p>
          </div>
        </section>

        {/* Registrar cuota */}
        <section className="rounded-2xl border border-mia-border bg-mia-card p-6">
          <h2 className="text-lg font-bold text-mia-cream mb-4">
            Registrar aporte de hoy
          </h2>

          <form onSubmit={handleAgregar} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-semibold text-mia-cream">Monto</label>
              <input
                type="number"
                min="1"
                step="any"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ej: 50.000"
                className="rounded-xl border border-mia-border bg-mia-black px-4 py-3 text-mia-cream placeholder:text-neutral focus:border-mf-coral focus:outline-none w-full"
              />
            </div>
            <div className="sm:w-32">
              <label className="mb-1 block text-sm font-semibold text-mia-cream">Moneda</label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="rounded-xl border border-mia-border bg-mia-black px-4 py-3 text-mia-cream focus:border-mf-coral focus:outline-none w-full"
              >
                {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf px-6 py-3 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90 animate-pulse-glow disabled:animate-none disabled:opacity-60 sm:self-end"
            >
              <Plus className="h-4 w-4" />
              {guardando ? 'Guardando...' : 'Agregar cuota'}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>
          )}
          {mensajeOk && (
            <p className="mt-4 rounded-xl border border-gain/30 bg-gain/10 px-4 py-3 text-sm text-gain">{mensajeOk}</p>
          )}

          {aportesHoy.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral mb-3">Cuotas de hoy</p>
              <div className="space-y-2">
                {aportesHoy.map((a) => (
                  <div key={a.id} className="flex items-center justify-between border-t border-mia-border py-3 text-sm text-mia-cream">
                    <span className="font-bold text-gain">{formatMonto(a.monto, a.moneda)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral">{a.moneda}</span>
                      <button
                        type="button"
                        onClick={() => eliminarAporte(a.id)}
                        className="text-neutral/40 transition hover:text-loss"
                        aria-label="Eliminar cuota"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Historial — últimos 30 días */}
        {aportes.length > 0 && (
          <section className="rounded-2xl border border-mia-border bg-mia-card p-6">
            <h2 className="text-lg font-bold text-mia-cream mb-4">Historial de aportes</h2>

            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-[0.2em] text-neutral">Fecha</th>
                    <th className="pb-3 text-right text-xs font-bold uppercase tracking-[0.2em] text-neutral">Monto</th>
                    <th className="pb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-neutral">Moneda</th>
                    <th className="w-10 pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {aportes.slice(0, 30).map((a) => (
                    <tr key={a.id} className="border-t border-mia-border">
                      <td className="py-3 text-mia-cream">{a.fecha}</td>
                      <td className="py-3 text-right font-bold text-gain">{formatMonto(a.monto, a.moneda)}</td>
                      <td className="py-3 text-center text-neutral">{a.moneda}</td>
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => eliminarAporte(a.id)}
                          className="text-neutral/40 transition hover:text-loss"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {aportes.length > 30 && (
              <p className="mt-3 text-center text-xs text-neutral">Mostrando los últimos 30 aportes.</p>
            )}
          </section>
        )}

        {/* Grilla 30 días */}
        <section className="rounded-2xl border border-mia-border bg-mia-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-mia-cream">Registro visual</h2>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-neutral">{diasCompletadosUltimos30} / 30 días</span>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
            {ultimos30.map((fecha) => {
              const completado = getDiaCompletado(fecha)
              const esHoy = fecha === todayStr()
              return (
                <div
                  key={fecha}
                  title={fecha}
                  className={[
                    'flex aspect-square flex-col items-center justify-center rounded-xl border text-xs font-bold transition',
                    completado
                      ? 'border-gain/40 bg-gain/15 text-gain'
                      : esHoy
                        ? 'border-mf-coral/50 bg-mf-coral/10 text-mf-coral'
                        : 'border-mia-border bg-mia-black/30 text-neutral',
                  ].join(' ')}
                >
                  {completado
                    ? <CheckCircle2 className="h-5 w-5" />
                    : <span className="text-[10px]">{formatFechaCorta(fecha)}</span>}
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-gain" /> Completado (≥ $20k)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-full border border-mf-coral" /> Hoy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-full border border-mia-border" /> Sin completar
            </span>
          </div>
        </section>

      </div>
    </main>
  )
}
