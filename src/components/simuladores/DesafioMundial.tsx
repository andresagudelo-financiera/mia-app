'use client'

import { useState, useMemo } from 'react'
import { Trophy, Calendar, DollarSign, Target, Flame, Clock, CheckCircle2, Trash2 } from 'lucide-react'
import { useDesafioMundialStore } from '@/stores/desafioMundial.store'
import type { Aporte, DesafioMundialProfile } from '@/stores/desafioMundial.store'

const MUNDIAL_DATE = new Date('2026-06-11T00:00:00')

const PAISES = [
  { codigo: 'CO', nombre: 'Colombia', bandera: '🇨🇴', moneda: 'COP' },
  { codigo: 'MX', nombre: 'México', bandera: '🇲🇽', moneda: 'MXN' },
  { codigo: 'AR', nombre: 'Argentina', bandera: '🇦🇷', moneda: 'ARS' },
  { codigo: 'CL', nombre: 'Chile', bandera: '🇨🇱', moneda: 'CLP' },
  { codigo: 'PE', nombre: 'Perú', bandera: '🇵🇪', moneda: 'PEN' },
  { codigo: 'VE', nombre: 'Venezuela', bandera: '🇻🇪', moneda: 'USD' },
  { codigo: 'EC', nombre: 'Ecuador', bandera: '🇪🇨', moneda: 'USD' },
  { codigo: 'BO', nombre: 'Bolivia', bandera: '🇧🇴', moneda: 'USD' },
  { codigo: 'PY', nombre: 'Paraguay', bandera: '🇵🇾', moneda: 'USD' },
  { codigo: 'UY', nombre: 'Uruguay', bandera: '🇺🇾', moneda: 'USD' },
  { codigo: 'BR', nombre: 'Brasil', bandera: '🇧🇷', moneda: 'BRL' },
  { codigo: 'ES', nombre: 'España', bandera: '🇪🇸', moneda: 'EUR' },
  { codigo: 'US', nombre: 'Estados Unidos', bandera: '🇺🇸', moneda: 'USD' },
  { codigo: 'CR', nombre: 'Costa Rica', bandera: '🇨🇷', moneda: 'USD' },
  { codigo: 'PA', nombre: 'Panamá', bandera: '🇵🇦', moneda: 'USD' },
  { codigo: 'GT', nombre: 'Guatemala', bandera: '🇬🇹', moneda: 'USD' },
  { codigo: 'HN', nombre: 'Honduras', bandera: '🇭🇳', moneda: 'USD' },
  { codigo: 'SV', nombre: 'El Salvador', bandera: '🇸🇻', moneda: 'USD' },
  { codigo: 'DO', nombre: 'República Dominicana', bandera: '🇩🇴', moneda: 'USD' },
]

const MONEDAS = ['USD', 'COP', 'MXN', 'ARS', 'EUR', 'PEN', 'CLP', 'BRL']

function calcularDiasRestantes(): { dias: number; diaDelTorneo: number | null } {
  const ahora = new Date()
  ahora.setHours(0, 0, 0, 0)
  const mundial = new Date(MUNDIAL_DATE)
  mundial.setHours(0, 0, 0, 0)
  const diff = Math.floor((mundial.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
  if (diff > 0) return { dias: diff, diaDelTorneo: null }
  return { dias: 0, diaDelTorneo: Math.abs(diff) + 1 }
}

function formatFecha(isoDate: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(isoDate + 'T12:00:00'))
}

function formatMonto(monto: number, moneda: string): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(monto)
}

export default function DesafioMundial() {
  const { isRegistered, profile, aportes, registerProfile, addAporte, deleteAporte, getTotalAhorrado, getAporteHoy, getRacha } = useDesafioMundialStore()

  if (!isRegistered || !profile) return <RegistroForm onRegister={registerProfile} />

  return <Dashboard
    profile={profile}
    aportes={aportes}
    getTotalAhorrado={getTotalAhorrado}
    getAporteHoy={getAporteHoy}
    getRacha={getRacha}
    addAporte={addAporte}
    deleteAporte={deleteAporte}
  />
}

interface RegistroFormProps {
  onRegister: (data: DesafioMundialProfile) => void
}

function RegistroForm({ onRegister }: RegistroFormProps) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [paisCodigo, setPaisCodigo] = useState('')
  const [error, setError] = useState('')

  const paisSeleccionado = PAISES.find((p) => p.codigo === paisCodigo)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !email.trim() || !telefono.trim() || !paisCodigo) {
      setError('Completa todos los campos para inscribirte.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un email válido.')
      return
    }

    onRegister({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono.trim(),
      pais: paisCodigo,
      bandera: paisSeleccionado?.bandera ?? '🌎',
      monedaDefault: paisSeleccionado?.moneda ?? 'USD',
      registradoEn: new Date().toISOString(),
    })
  }

  const { dias } = calcularDiasRestantes()

  return (
    <main className="min-h-screen bg-mia-black px-4 py-10 text-mia-cream sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-4 text-6xl">⚽</div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-mf-orange/30 bg-mf-orange/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-mf-orange">
            <Trophy className="h-4 w-4" /> FIFA World Cup 2026
          </div>
          <h1 className="font-heading text-4xl font-bold leading-tight text-mia-cream md:text-5xl">
            Desafío Mundial
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral">
            {dias > 0
              ? `Faltan ${dias} días. Registra un aporte cada día y llega al Mundial con más plata en el bolsillo.`
              : 'El Mundial ya comenzó. ¡Sigue ahorrando mientras dura el torneo!'}
          </p>
        </div>

        <div className="rounded-[2rem] border border-mia-border bg-mia-card p-6 shadow-2xl md:p-8">
          <p className="mb-6 text-sm font-bold uppercase tracking-[0.18em] text-mf-coral">Inscríbete al desafío</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-xl border border-mia-border bg-mia-black/60 px-4 py-3 text-sm text-mia-cream placeholder:text-neutral/50 outline-none transition focus:border-mf-coral"
              />
            </fieldset>

            <fieldset>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-xl border border-mia-border bg-mia-black/60 px-4 py-3 text-sm text-mia-cream placeholder:text-neutral/50 outline-none transition focus:border-mf-coral"
              />
            </fieldset>

            <fieldset>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral">Teléfono</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+57 300 000 0000"
                className="w-full rounded-xl border border-mia-border bg-mia-black/60 px-4 py-3 text-sm text-mia-cream placeholder:text-neutral/50 outline-none transition focus:border-mf-coral"
              />
            </fieldset>

            <fieldset>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral">País</label>
              <select
                value={paisCodigo}
                onChange={(e) => setPaisCodigo(e.target.value)}
                className="w-full rounded-xl border border-mia-border bg-mia-black/60 px-4 py-3 text-sm text-mia-cream outline-none transition focus:border-mf-coral"
              >
                <option value="">Selecciona tu país</option>
                {PAISES.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.bandera} {p.nombre}
                  </option>
                ))}
              </select>
            </fieldset>

            {error && (
              <p className="rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-gradient-mf px-6 py-4 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90"
            >
              ¡Me inscribo al desafío! ⚽
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

interface DashboardProps {
  profile: DesafioMundialProfile
  aportes: Aporte[]
  getTotalAhorrado: () => number
  getAporteHoy: () => Aporte | undefined
  getRacha: () => number
  addAporte: (monto: number, moneda: string) => void
  deleteAporte: (id: string) => void
}

function Dashboard({ profile, aportes, getTotalAhorrado, getAporteHoy, getRacha, addAporte, deleteAporte }: DashboardProps) {
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState(profile.monedaDefault)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const { dias, diaDelTorneo } = calcularDiasRestantes()
  const totalAhorrado = getTotalAhorrado()
  const aporteHoy = getAporteHoy()
  const racha = getRacha()
  const promedioAporte = aportes.length > 0 ? totalAhorrado / aportes.length : 0
  const ultimoAporte = aportes[0]

  const aportesVisibles = useMemo<Aporte[]>(() => aportes.slice(0, 30), [aportes])

  function handleAporte(e: React.FormEvent) {
    e.preventDefault()
    const valor = parseFloat(monto.replace(',', '.'))
    if (!valor || valor <= 0 || isNaN(valor)) {
      setMensaje({ tipo: 'error', texto: 'Ingresa un monto válido mayor a 0.' })
      return
    }
    addAporte(valor, moneda)
    setMonto('')
    setMensaje({ tipo: 'ok', texto: `¡Aporte de ${formatMonto(valor, moneda)} registrado hoy! 🎉` })
    setTimeout(() => setMensaje(null), 4000)
  }

  return (
    <main className="min-h-screen bg-mia-black px-4 py-10 text-mia-cream sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl animate-fade-in space-y-6">

        {/* Header */}
        <header className="relative overflow-hidden rounded-[2rem] border border-mf-orange/30 bg-gradient-to-br from-mf-orange/15 via-mia-card to-mia-black p-6 shadow-2xl shadow-mf-orange/5 md:p-10">
          <div className="absolute -right-4 -top-4 select-none text-[10rem] opacity-10 md:-right-8 md:text-[14rem]">
            ⚽
          </div>
          <div className="relative">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="text-5xl md:text-6xl">{profile.bandera}</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-mf-orange">Desafío Mundial 2026</p>
                <h1 className="font-heading text-3xl font-bold text-mia-cream md:text-4xl">{profile.nombre}</h1>
              </div>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-mf-orange/30 bg-mf-orange/10 px-3 py-1 text-xs font-bold text-mf-orange">
                <Trophy className="h-3.5 w-3.5" /> FIFA World Cup 2026
              </span>
            </div>

            {diaDelTorneo !== null ? (
              <div className="mt-4 rounded-2xl border border-gain/30 bg-gain/10 px-5 py-3 text-sm font-semibold text-gain">
                ⚽ ¡El Mundial ya comenzó! Día {diaDelTorneo} del torneo.
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-sm text-neutral">
                <Clock className="h-4 w-4 text-mf-orange" />
                <span>Inicio del torneo: <strong className="text-mia-cream">11 de junio de 2026</strong></span>
              </div>
            )}
          </div>
        </header>

        {/* Métricas */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <MetricCard
            icon={<Clock className="h-5 w-5 text-mf-orange" />}
            label="Días restantes"
            value={diaDelTorneo !== null ? `Día ${diaDelTorneo}` : `${dias}`}
            sub={diaDelTorneo !== null ? 'del torneo' : 'para el Mundial'}
            accentClass="border-mf-orange/30"
          />
          <MetricCard
            icon={<DollarSign className="h-5 w-5 text-gain" />}
            label="Total ahorrado"
            value={totalAhorrado > 0 ? formatMonto(totalAhorrado, aportes[0]?.moneda ?? profile.monedaDefault) : '$0'}
            sub="suma de todos los aportes"
            accentClass="border-gain/30"
          />
          <MetricCard
            icon={<Calendar className="h-5 w-5 text-mf-coral" />}
            label="Aportes realizados"
            value={`${aportes.length}`}
            sub="días con aporte"
            accentClass="border-mf-coral/30"
          />
          <MetricCard
            icon={<CheckCircle2 className="h-5 w-5 text-mia-blue" />}
            label="Último aporte"
            value={ultimoAporte ? formatFecha(ultimoAporte.fecha) : '—'}
            sub={ultimoAporte ? formatMonto(ultimoAporte.monto, ultimoAporte.moneda) : 'aún sin aportes'}
            accentClass="border-mia-blue/30"
          />
          <MetricCard
            icon={<Target className="h-5 w-5 text-mf-orange" />}
            label="Promedio por aporte"
            value={promedioAporte > 0 ? formatMonto(promedioAporte, aportes[0]?.moneda ?? profile.monedaDefault) : '$0'}
            sub="por día aportado"
            accentClass="border-mf-orange/30"
          />
          <MetricCard
            icon={<Flame className="h-5 w-5 text-mf-coral" />}
            label="Racha actual"
            value={`${racha} ${racha === 1 ? 'día' : 'días'}`}
            sub="consecutivos"
            accentClass="border-mf-coral/30"
          />
        </section>

        {/* Registrar aporte */}
        <section className="rounded-[2rem] border border-mia-border bg-mia-card p-6 md:p-8">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-mf-coral">Registrar aporte de hoy</p>

          {aporteHoy ? (
            <div className="flex items-center gap-3 rounded-2xl border border-gain/30 bg-gain/10 px-5 py-4">
              <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-gain" />
              <div>
                <p className="font-semibold text-gain">¡Ya aportaste hoy!</p>
                <p className="text-sm text-neutral">
                  {formatMonto(aporteHoy.monto, aporteHoy.moneda)} registrado el {formatFecha(aporteHoy.fecha)}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAporte} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral">Monto</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-mia-border bg-mia-black/60 px-4 py-3 text-sm text-mia-cream placeholder:text-neutral/50 outline-none transition focus:border-mf-coral"
                />
              </div>
              <div className="sm:w-36">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-neutral">Moneda</label>
                <select
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value)}
                  className="w-full rounded-xl border border-mia-border bg-mia-black/60 px-4 py-3 text-sm text-mia-cream outline-none transition focus:border-mf-coral"
                >
                  {MONEDAS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="animate-pulse-glow rounded-xl bg-gradient-mf px-6 py-3 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90 sm:self-end"
              >
                ¡Lo hice hoy! ⚽
              </button>
            </form>
          )}

          {mensaje && (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium transition ${mensaje.tipo === 'ok' ? 'border-gain/30 bg-gain/10 text-gain' : 'border-loss/30 bg-loss/10 text-loss'}`}>
              {mensaje.texto}
            </div>
          )}
        </section>

        {/* Historial */}
        {aportes.length > 0 && (
          <section className="rounded-[2rem] border border-mia-border bg-mia-card p-6 md:p-8">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-mf-coral">Historial de aportes</p>
            <div className="max-h-80 overflow-y-auto rounded-2xl border border-mia-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-mia-card">
                  <tr className="border-b border-mia-border">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.15em] text-neutral">Fecha</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.15em] text-neutral">Monto</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.15em] text-neutral">Moneda</th>
                    <th className="w-12 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {aportesVisibles.map((a, index) => (
                    <tr key={a.id} className={`border-b border-mia-border/50 transition hover:bg-mia-black/30 ${index === 0 ? 'text-mia-cream' : 'text-neutral'}`}>
                      <td className="px-4 py-3">{formatFecha(a.fecha)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMonto(a.monto, a.moneda)}</td>
                      <td className="px-4 py-3 text-center">{a.moneda}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => deleteAporte(a.id)}
                          className="text-neutral/40 transition hover:text-loss"
                          aria-label="Eliminar aporte"
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
      </div>
    </main>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accentClass: string
}

function MetricCard({ icon, label, value, sub, accentClass }: MetricCardProps) {
  return (
    <article className={`rounded-[1.5rem] border bg-mia-card p-5 ${accentClass}`}>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-neutral">{label}</span>
      </div>
      <p className="font-heading text-2xl font-bold text-mia-cream">{value}</p>
      <p className="mt-1 text-xs text-neutral">{sub}</p>
    </article>
  )
}
