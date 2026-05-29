'use client'

import { useState, useMemo } from 'react'
import { Trophy, Calendar, Flame, Clock, CheckCircle2, Circle } from 'lucide-react'
import { useDesafioMundialStore } from '@/stores/desafioMundial.store'
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

function calcularEstado(): { dias: number; diaDelTorneo: number | null } {
  const ahora = new Date()
  ahora.setHours(0, 0, 0, 0)
  const mundial = new Date(MUNDIAL_DATE)
  mundial.setHours(0, 0, 0, 0)
  const diff = Math.floor((mundial.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
  if (diff > 0) return { dias: diff, diaDelTorneo: null }
  return { dias: 0, diaDelTorneo: Math.abs(diff) + 1 }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatFechaCorta(isoDate: string): string {
  const [, mes, dia] = isoDate.split('-')
  return `${dia}/${mes}`
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

  if (!isRegistered || !profile) {
    return <RegistroForm onRegister={registerProfile} />
  }

  return <Dashboard />
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
  const [loading, setLoading] = useState(false)

  const paisSeleccionado = PAISES.find((p) => p.codigo === paisCodigo)
  const { dias } = calcularEstado()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !email.trim() || !telefono.trim() || !paisCodigo) {
      setError('Completa todos los campos para inscribirte.')
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
          <h1 className="font-heading text-4xl font-bold leading-tight text-mia-cream md:text-5xl">
            Desafío Mundial
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral">
            {dias > 0
              ? `Faltan ${dias} días. Marca cada día que ahorras y llega al Mundial con el hábito construido.`
              : '¡El Mundial ya comenzó! Sigue marcando tus días de ahorro.'}
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
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-gradient-mf px-6 py-4 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Inscribiendo...' : '¡Me inscribo al desafío! ⚽'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

function Dashboard() {
  const { profile, aportes, marcarHoy, desmarcarAporte, getAporteHoy, getRacha, getTotalDias } = useDesafioMundialStore()
  const [guardando, setGuardando] = useState(false)
  const [mensajeOk, setMensajeOk] = useState(false)

  const { dias, diaDelTorneo } = calcularEstado()
  const aporteHoy = getAporteHoy()
  const racha = getRacha()
  const totalDias = getTotalDias()

  const fechasAportadas = useMemo(() => new Set(aportes.map((a) => a.fecha)), [aportes])
  const ultimos30 = useMemo(() => generarUltimos30Dias(), [])
  const aportesPorFecha = useMemo(() => {
    const map = new Map<string, Aporte>()
    aportes.forEach((a) => map.set(a.fecha, a))
    return map
  }, [aportes])

  const porcentajeCompletado = ultimos30.filter((f) => fechasAportadas.has(f)).length

  async function handleMarcarHoy() {
    if (aporteHoy || guardando || !profile) return
    setGuardando(true)
    marcarHoy()
    await desafioMundialApi.registrarAporte({
      email: profile.email,
      nombre: profile.nombre,
      fecha: todayStr(),
      userId: profile.userId,
    })
    setGuardando(false)
    setMensajeOk(true)
    setTimeout(() => setMensajeOk(false), 4000)
  }

  return (
    <main className="min-h-screen bg-mia-black px-4 py-10 text-mia-cream sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl animate-fade-in space-y-6">

        {/* Header */}
        <header className="relative overflow-hidden rounded-[2rem] border border-mf-orange/30 bg-gradient-to-br from-mf-orange/15 via-mia-card to-mia-black p-6 shadow-2xl shadow-mf-orange/5 md:p-10">
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
          <MetricCard
            icon={<Clock className="h-5 w-5 text-mf-orange" />}
            label="Días restantes"
            value={diaDelTorneo !== null ? `Día ${diaDelTorneo}` : String(dias)}
            sub={diaDelTorneo !== null ? 'del torneo' : 'para el Mundial'}
            accent="border-mf-orange/30"
          />
          <MetricCard
            icon={<Calendar className="h-5 w-5 text-gain" />}
            label="Días marcados"
            value={String(totalDias)}
            sub="total acumulado"
            accent="border-gain/30"
          />
          <MetricCard
            icon={<Flame className="h-5 w-5 text-mf-coral" />}
            label="Racha actual"
            value={`${racha} ${racha === 1 ? 'día' : 'días'}`}
            sub="consecutivos"
            accent="border-mf-coral/30"
          />
          <MetricCard
            icon={<CheckCircle2 className="h-5 w-5 text-mia-blue" />}
            label="Últimos 30 días"
            value={`${porcentajeCompletado}/30`}
            sub="días con ahorro"
            accent="border-mia-blue/30"
          />
        </section>

        {/* Acción del día */}
        <section className="rounded-[2rem] border border-mia-border bg-mia-card p-6 md:p-8">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-mf-coral">¿Ahorraste hoy?</p>

          {aporteHoy ? (
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gain/15">
                <CheckCircle2 className="h-9 w-9 text-gain" />
              </div>
              <div>
                <p className="text-lg font-bold text-gain">¡Hoy ya está marcado! ✅</p>
                <p className="text-sm text-neutral">Vuelve mañana a marcar tu próximo día.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-mia-border bg-mia-black/40">
                <Circle className="h-8 w-8 text-neutral/40" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-mia-cream">Aún no marcas el día de hoy</p>
                <p className="text-sm text-neutral">Si ahorraste hoy, márcalo para mantener tu racha.</p>
              </div>
              <button
                type="button"
                onClick={handleMarcarHoy}
                disabled={guardando}
                className="animate-pulse-glow w-full rounded-xl bg-gradient-mf px-7 py-4 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90 disabled:animate-none disabled:opacity-60 sm:w-auto"
              >
                {guardando ? 'Guardando...' : '¡Lo hice hoy! ⚽'}
              </button>
            </div>
          )}

          {mensajeOk && (
            <div className="mt-4 rounded-xl border border-gain/30 bg-gain/10 px-4 py-3 text-sm font-medium text-gain">
              ¡Aporte registrado! Vas por buen camino. 🏆
            </div>
          )}
        </section>

        {/* Grilla de los últimos 30 días */}
        <section className="rounded-[2rem] border border-mia-border bg-mia-card p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mf-coral">Últimos 30 días</p>
            <span className="text-xs text-neutral">{porcentajeCompletado} de 30 días</span>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
            {ultimos30.map((fecha) => {
              const marcado = fechasAportadas.has(fecha)
              const esHoy = fecha === todayStr()
              const aporte = aportesPorFecha.get(fecha)
              return (
                <button
                  key={fecha}
                  type="button"
                  title={fecha}
                  onClick={() => aporte && desmarcarAporte(aporte.id)}
                  className={`group relative flex aspect-square flex-col items-center justify-center rounded-xl border text-xs font-bold transition
                    ${marcado
                      ? 'border-gain/40 bg-gain/15 text-gain hover:border-loss/40 hover:bg-loss/10 hover:text-loss'
                      : esHoy
                        ? 'border-mf-coral/50 bg-mf-coral/10 text-mf-coral'
                        : 'border-mia-border bg-mia-black/30 text-neutral/40'
                    }`}
                >
                  {marcado ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span>{formatFechaCorta(fecha)}</span>
                  )}
                  {esHoy && !marcado && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-mf-coral" />
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-gain" /> Día marcado</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full border border-mf-coral" /> Hoy</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full border border-mia-border bg-mia-black/30" /> Sin marcar</span>
            <span className="ml-auto text-neutral/60">Clic en un día marcado para desmarcarlo</span>
          </div>
        </section>
      </div>
    </main>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent: string
}

function MetricCard({ icon, label, value, sub, accent }: MetricCardProps) {
  return (
    <article className={`rounded-[1.5rem] border bg-mia-card p-5 ${accent}`}>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-neutral">{label}</span>
      </div>
      <p className="font-heading text-2xl font-bold text-mia-cream">{value}</p>
      <p className="mt-1 text-xs text-neutral">{sub}</p>
    </article>
  )
}
