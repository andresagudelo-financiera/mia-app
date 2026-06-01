'use client'

import { useState, useMemo, useEffect } from 'react'
import { Trophy, Zap, Calendar, TrendingUp, Flame, Plus, CheckCircle2, PiggyBank, Trash2, Clock, Loader2, AlertTriangle, X } from 'lucide-react'
import { useDesafioMundialStore, MONTO_MINIMO_DIA } from '@/stores/desafioMundial.store'
import { desafioMundialApi } from '@/services/api/desafioMundial.api'
import type { DesafioMundialProfile } from '@/stores/desafioMundial.store'
import { useUserStore } from '@/stores/user.store'
import UserRegistrationModal from '@/components/auth/UserRegistrationModal'

const MUNDIAL_DATE = new Date('2030-06-08T00:00:00')

const PAISES = [
  { codigo: 'CO', nombre: 'Colombia',             bandera: '🇨🇴', dialCode: '+57',  ejemplo: '300 123 4567' },
  { codigo: 'MX', nombre: 'México',               bandera: '🇲🇽', dialCode: '+52',  ejemplo: '55 1234 5678' },
  { codigo: 'AR', nombre: 'Argentina',            bandera: '🇦🇷', dialCode: '+54',  ejemplo: '9 11 1234 5678' },
  { codigo: 'CL', nombre: 'Chile',                bandera: '🇨🇱', dialCode: '+56',  ejemplo: '9 1234 5678' },
  { codigo: 'PE', nombre: 'Perú',                 bandera: '🇵🇪', dialCode: '+51',  ejemplo: '987 654 321' },
  { codigo: 'VE', nombre: 'Venezuela',            bandera: '🇻🇪', dialCode: '+58',  ejemplo: '412 123 4567' },
  { codigo: 'EC', nombre: 'Ecuador',              bandera: '🇪🇨', dialCode: '+593', ejemplo: '99 123 4567' },
  { codigo: 'BO', nombre: 'Bolivia',              bandera: '🇧🇴', dialCode: '+591', ejemplo: '71234567' },
  { codigo: 'PY', nombre: 'Paraguay',             bandera: '🇵🇾', dialCode: '+595', ejemplo: '981 123 456' },
  { codigo: 'UY', nombre: 'Uruguay',              bandera: '🇺🇾', dialCode: '+598', ejemplo: '9 1234 5678' },
  { codigo: 'BR', nombre: 'Brasil',               bandera: '🇧🇷', dialCode: '+55',  ejemplo: '11 91234 5678' },
  { codigo: 'ES', nombre: 'España',               bandera: '🇪🇸', dialCode: '+34',  ejemplo: '612 345 678' },
  { codigo: 'US', nombre: 'Estados Unidos',       bandera: '🇺🇸', dialCode: '+1',   ejemplo: '305 123 4567' },
  { codigo: 'CR', nombre: 'Costa Rica',           bandera: '🇨🇷', dialCode: '+506', ejemplo: '8888 8888' },
  { codigo: 'PA', nombre: 'Panamá',               bandera: '🇵🇦', dialCode: '+507', ejemplo: '6123 4567' },
  { codigo: 'GT', nombre: 'Guatemala',            bandera: '🇬🇹', dialCode: '+502', ejemplo: '5123 4567' },
  { codigo: 'HN', nombre: 'Honduras',             bandera: '🇭🇳', dialCode: '+504', ejemplo: '9123 4567' },
  { codigo: 'SV', nombre: 'El Salvador',          bandera: '🇸🇻', dialCode: '+503', ejemplo: '7123 4567' },
  { codigo: 'DO', nombre: 'República Dominicana', bandera: '🇩🇴', dialCode: '+1',   ejemplo: '809 123 4567' },
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

interface ErrorModalProps {
  message: string
  onClose: () => void
}

function ErrorModal({ message, onClose }: ErrorModalProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-mia-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl border border-loss/30 bg-mia-card p-8 text-center shadow-2xl shadow-loss/10 transition-all animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral hover:text-mia-cream transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-loss/10 text-loss mb-4">
          <AlertTriangle className="h-7 w-7" />
        </div>
        
        <h3 className="font-heading text-xl font-bold text-mia-cream mb-2">
          Ocurrió un error
        </h3>
        
        <p className="text-sm text-neutral mb-6 leading-relaxed">
          {message}
        </p>
        
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-gradient-mf py-3.5 px-4 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Aceptar
        </button>
      </div>
    </div>
  )
}

export default function DesafioMundial() {
  const { isRegistered: isUserRegistered, profile: userProfile } = useUserStore()
  const { isRegistered: isChallengeRegistered, profile: challengeProfile, setDashboardData } = useDesafioMundialStore()
  const [cargandoDb, setCargandoDb] = useState(false)
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!userProfile?.id) return
    let active = true
    setCargandoDb(true)
    desafioMundialApi.getDashboard(userProfile.id)
      .then((data) => {
        if (!active || !data) return
        if (data.isRegistered && data.participant) {
          const mappedAportes = data.savings.map((s: any) => ({
            id: s.id,
            fecha: s.date,
            monto: s.amount,
            moneda: s.currency,
            timestamp: new Date(s.createdAt).getTime()
          }))
          const p = PAISES.find((pa) => pa.codigo === data.participant.country)
          setDashboardData({
            isRegistered: true,
            aportes: mappedAportes,
            profile: {
              nombre: data.participant.displayName,
              email: userProfile?.email || '',
              telefono: data.participant.phone || '',
              pais: data.participant.country,
              bandera: p?.bandera ?? '🌎',
              registradoEn: data.participant.createdAt
            }
          })
        }
      })
      .catch(() => null)
      .finally(() => {
        if (active) setCargandoDb(false)
      })

    return () => {
      active = false
    }
  }, [userProfile?.id, setDashboardData, userProfile?.email])

  if (process.env.NEXT_PUBLIC_ENABLE_WORLD_CUP_CHALLENGE !== 'true') {
    return (
      <main className="min-h-screen bg-mia-black px-4 py-20 text-center text-mia-cream sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md rounded-2xl border border-mia-border bg-mia-card p-8">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-neutral" />
          <h2 className="font-heading text-2xl font-bold">Desafío Inactivo</h2>
          <p className="mt-3 text-sm text-neutral">Este reto de ahorro no está habilitado actualmente por el equipo de MIA. Vuelve pronto.</p>
        </div>
      </main>
    )
  }

  if (!isUserRegistered || !userProfile?.id) {
    return <UserRegistrationModal toolName="desafio-mundial" contentName="desafio_mundial" onClose={() => undefined} />
  }

  if (cargandoDb) {
    return (
      <main className="min-h-screen bg-mia-black flex items-center justify-center text-mia-cream">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-mf-coral mx-auto" />
          <p className="text-sm text-neutral">Cargando tus ahorros del Mundial...</p>
        </div>
      </main>
    )
  }

  return (
    <>
      {!isChallengeRegistered || !challengeProfile ? (
        <RegistroForm
          defaultNombre={userProfile?.name || ''}
          defaultEmail={userProfile?.email || ''}
          onRegister={async (data) => {
            setCargandoDb(true)
            const participant = await desafioMundialApi.registerParticipant(userProfile.id, {
              displayName: data.nombre,
              country: data.pais,
              phone: data.telefono,
              email: userProfile.email || '',
            })
            if (participant) {
              const p = PAISES.find((pa) => pa.codigo === participant.country)
              setDashboardData({
                isRegistered: true,
                aportes: [],
                profile: {
                  nombre: participant.displayName,
                  email: userProfile.email || '',
                  telefono: participant.phone || '',
                  pais: participant.country,
                  bandera: p?.bandera ?? '🌎',
                  registradoEn: participant.createdAt
                }
              })
            } else {
              setErrorModalMessage('No se pudo registrar tu participación en el reto.')
            }
            setCargandoDb(false)
          }}
        />
      ) : (
        <Dashboard onError={(msg) => setErrorModalMessage(msg)} />
      )}

      {errorModalMessage && (
        <ErrorModal
          message={errorModalMessage}
          onClose={() => setErrorModalMessage(null)}
        />
      )}
    </>
  )
}

function RegistroForm({
  defaultNombre,
  defaultEmail,
  onRegister,
}: {
  defaultNombre: string
  defaultEmail: string
  onRegister: (data: { nombre: string; pais: string; telefono: string }) => void
}) {
  const [nombre, setNombre] = useState(defaultNombre)
  const [email] = useState(defaultEmail)
  const [telefono, setTelefono] = useState('')
  const [telefonoPais, setTelefonoPais] = useState('CO')
  const [paisCodigo, setPaisCodigo] = useState('CO')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const telefonoPaisData = PAISES.find((p) => p.codigo === telefonoPais) ?? PAISES[0]
  const { dias } = calcularEstado()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const digitos = telefono.replace(/\D/g, '')
    if (!nombre.trim() || !digitos || !paisCodigo) {
      setError('Completa todos los campos.')
      return
    }
    setLoading(true)
    setError('')
    onRegister({
      nombre: nombre.trim(),
      pais: paisCodigo,
      telefono: `${telefonoPaisData.dialCode}${digitos}`,
    })
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-mia-black px-4 py-10 text-mia-cream sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <form onSubmit={handleSubmit} className="relative overflow-hidden rounded-[2rem] border border-mf-coral/30 bg-gradient-to-br from-mf-coral/20 via-mia-card to-mia-black p-8 shadow-2xl shadow-mf-coral/10 md:p-10">
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
            {/* Nombre + Email */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-mia-cream">Nombre completo</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border border-mia-border bg-mia-black px-4 py-3 text-mia-cream placeholder:text-neutral focus:border-mf-coral focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-mia-cream">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-xl border border-mia-border bg-mia-black/50 px-4 py-3 text-neutral cursor-not-allowed"
                />
              </div>
            </div>

            {/* País del Mundial */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-mia-cream">
                País <span className="text-xs font-normal text-neutral/60">(tu selección para el Mundial)</span>
              </label>
              <select
                value={paisCodigo}
                onChange={(e) => setPaisCodigo(e.target.value)}
                className="w-full rounded-xl border border-mia-border bg-mia-black px-4 py-3 text-mia-cream focus:border-mf-coral focus:outline-none transition-colors appearance-none"
              >
                {PAISES.map((p) => (
                  <option key={p.codigo} value={p.codigo}>{p.bandera} {p.nombre}</option>
                ))}
              </select>
            </div>

            {/* Teléfono con indicativo INDEPENDIENTE al país del Mundial */}
            <div>
              <label className="mb-1 block text-sm font-semibold text-mia-cream">
                Teléfono <span className="text-xs font-normal text-neutral/60">(puede ser diferente al país del Mundial)</span>
              </label>
              <div className="flex overflow-hidden rounded-xl border border-mia-border bg-mia-black focus-within:border-mf-coral transition-colors">
                {/* Select de indicativo — independiente del selector de País */}
                <select
                  value={telefonoPais}
                  onChange={(e) => { setTelefonoPais(e.target.value); setTelefono('') }}
                  className="shrink-0 border-r border-mia-border bg-mia-black/60 py-3 pl-3 pr-1 text-sm text-mia-cream focus:outline-none appearance-none cursor-pointer"
                  aria-label="Indicativo del teléfono"
                >
                  {PAISES.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.bandera} {p.dialCode}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/[^\d\s]/g, ''))}
                  placeholder={telefonoPaisData.ejemplo}
                  className="w-full bg-transparent px-3 py-3 text-mia-cream placeholder:text-neutral/50 focus:outline-none text-sm"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-neutral/50">
                Se guardará como{' '}
                <span className="text-neutral font-medium">
                  {telefonoPaisData.dialCode} {telefono || telefonoPaisData.ejemplo}
                </span>
              </p>
            </div>

            {error && (
              <p className="rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-mf px-6 py-4 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90 disabled:opacity-60 mt-2"
            >
              {loading ? 'Inscribiendo...' : '¡Unirme al Desafío Mundial! ⚽'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

function Dashboard({ onError }: { onError: (msg: string) => void }) {
  const { profile: userProfile } = useUserStore()
  const {
    profile, aportes, agregarAporteLocal, eliminarAporteLocal,
    getAportesHoy, getTotalHoy,
    getRacha, getTotalAcumulado, getDiasLlenosAcumulado, getDiaFill,
  } = useDesafioMundialStore()

  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState('COP')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensajeOk, setMensajeOk] = useState('')

  const { dias, diaDelTorneo } = calcularEstado()
  const aportesHoy = getAportesHoy()
  const totalHoy = getTotalHoy()
  const totalAcumulado = getTotalAcumulado()
  const diasLlenos = getDiasLlenosAcumulado()

  // El progreso de "hoy" es el llenado del día virtual actual (el que está a medio llenar)
  const fillDiaActual = getDiaFill(diasLlenos)
  const progresoPct = Math.round(fillDiaActual * 100)
  const montoEnDiaActual = fillDiaActual * MONTO_MINIMO_DIA
  const faltanParaCompletarDia = MONTO_MINIMO_DIA - montoEnDiaActual

  // Mostrar estado de hoy basado en si ya hay aportes hoy
  const diaCompletadoHoy = totalHoy >= MONTO_MINIMO_DIA
  const racha = getRacha()

  // Grid: 30 días virtuales (banco acumulado)
  const GRID_DIAS = 30
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

    if (!userProfile?.id || !profile) return

    const savedSaving = await desafioMundialApi.logSaving(userProfile.id, {
      amount: valor,
      date: todayStr(),
      currency: moneda,
      email: profile.email,
      nombre: profile.nombre
    })

    if (savedSaving) {
      agregarAporteLocal({
        id: savedSaving.id,
        fecha: savedSaving.date,
        monto: savedSaving.amount,
        moneda: savedSaving.currency,
        timestamp: new Date(savedSaving.createdAt).getTime()
      })
      setMonto('')
      const nuevoTotal = totalHoy + valor
      if (nuevoTotal >= MONTO_MINIMO_DIA) {
        setMensajeOk('¡Mínimo del día alcanzado! Sigue sumando cuotas si quieres. 🏆')
      } else {
        setMensajeOk(`Cuota registrada. Te faltan ${formatMonto(MONTO_MINIMO_DIA - nuevoTotal, moneda)} para completar el día.`)
      }
      setTimeout(() => setMensajeOk(''), 5000)
    } else {
      setError('No se pudo registrar el aporte en la base de datos.')
    }
    setGuardando(false)
  }

  async function handleEliminar(id: string) {
    if (!userProfile?.id) return
    const success = await desafioMundialApi.deleteSaving(userProfile.id, id)
    if (success) {
      eliminarAporteLocal(id)
    } else {
      onError('Ocurrió un error al intentar eliminar el aporte del servidor.')
    }
  }

  // Estado de loading por celda del grid
  const [quickLoading, setQuickLoading] = useState<number | null>(null)

  async function handleClickDia(i: number) {
    if (quickLoading !== null) return          // evita doble click
    const fill = getDiaFill(i)

    if (fill >= 1) {
      // Día completo → desmarcar eliminando el aporte más reciente
      const ultimo = aportes[0]               // store los mantiene en orden desc
      if (!ultimo) return
      setQuickLoading(i)
      await handleEliminar(ultimo.id)
      setQuickLoading(null)
    } else {
      // Día parcial o siguiente slot vacío → agregar $20k al banco
      if (!userProfile?.id || !profile) return
      setQuickLoading(i)
      const savedSaving = await desafioMundialApi.logSaving(userProfile.id, {
        amount: MONTO_MINIMO_DIA,
        date: todayStr(),
        currency: moneda,
        email: profile.email,
        nombre: profile.nombre,
      })
      if (savedSaving) {
        agregarAporteLocal({
          id: savedSaving.id,
          fecha: savedSaving.date,
          monto: savedSaving.amount,
          moneda: savedSaving.currency,
          timestamp: new Date(savedSaving.createdAt).getTime(),
        })
        const nuevoTotal = totalAcumulado + MONTO_MINIMO_DIA
        const nuevosDias = Math.floor(nuevoTotal / MONTO_MINIMO_DIA)
        setMensajeOk(
          nuevosDias > diasLlenos
            ? `¡Día ${nuevosDias} completado! ✅ +$20k al banco`
            : `¡+$20k al banco! Día ${i + 1} en progreso ⚡`
        )
        setTimeout(() => setMensajeOk(''), 4000)
      } else {
        onError('No se pudo registrar el aporte rápido.')
      }
      setQuickLoading(null)
    }
  }

  return (
    <main className="min-h-screen bg-mia-black px-4 py-10 text-mia-cream sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl animate-fade-in space-y-8">

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

          {/* Barra de progreso del banco acumulado */}
          <div className="mt-8 max-w-2xl">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-neutral">
              <span>Progreso acumulado</span>
              <span>
                {progresoPct}% del día {diasLlenos + 1}
                {diasLlenos > 0 ? ` · ${diasLlenos} ${diasLlenos === 1 ? 'día completo' : 'días completos'}` : ''}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-mia-black/60">
              <div
                className="h-full rounded-full bg-gradient-mf transition-all duration-500"
                style={{ width: `${progresoPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-neutral">
              {faltanParaCompletarDia > 0
                ? `Faltan ${formatMonto(faltanParaCompletarDia, monedaDisplay)} para completar el día ${diasLlenos + 1}`
                : `¡Día ${diasLlenos} completado! Sigue sumando ⚽`}
            </p>
          </div>
        </section>

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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral mb-2">Días completos</p>
            <p className="font-heading text-3xl font-bold text-mia-cream">{diasLlenos}</p>
            <p className="mt-1 text-xs text-neutral">calculados sobre el total</p>
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral mb-2">Días completos</p>
            <p className="font-heading text-3xl font-bold text-mia-cream">{diasLlenos}/{GRID_DIAS}</p>
            <p className="mt-1 text-xs text-neutral">del banco acumulado</p>
          </div>
        </section>

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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-mf px-6 py-3 font-bold text-white shadow-lg shadow-mf-coral/20 transition hover:opacity-90 disabled:opacity-60 sm:self-end"
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
                        onClick={() => handleEliminar(a.id)}
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
                          onClick={() => handleEliminar(a.id)}
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

        <section className="rounded-2xl border border-mia-border bg-mia-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-mia-cream">Progreso del reto</h2>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-neutral">{diasLlenos} / {GRID_DIAS} días</span>
          </div>

          {/* Grid de 30 días virtuales con llenado acumulado */}
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
            {Array.from({ length: GRID_DIAS }, (_, i) => {
              const fill = getDiaFill(i)         // 0..1
              const lleno = fill >= 1
              const parcial = fill > 0 && fill < 1
              const esDiaActual = i === diasLlenos && fill > 0
              const esClickeable = lleno || parcial || i === diasLlenos
              const cargando = quickLoading === i
              return (
                <div
                  key={i}
                  onClick={() => esClickeable && handleClickDia(i)}
                  title={
                    lleno
                      ? `Día ${i + 1}: ✅ completado — clic para desmarcar`
                      : parcial
                        ? `Día ${i + 1}: ${Math.round(fill * 100)}% — clic para agregar $20k`
                        : i <= diasLlenos
                          ? `Día ${i + 1}: clic para agregar $20k`
                          : `Día ${i + 1}: pendiente`
                  }
                  className={[
                    'relative flex aspect-square flex-col items-center justify-end overflow-hidden rounded-xl border text-xs font-bold transition-all duration-200',
                    esClickeable ? 'cursor-pointer' : 'cursor-default',
                    lleno
                      ? 'border-gain/40 bg-mia-black/30 hover:border-loss/50 hover:bg-loss/10'
                      : esDiaActual
                        ? 'border-mf-coral/60 bg-mia-black/30 hover:border-mf-coral hover:bg-mf-coral/10'
                        : esClickeable
                          ? 'border-mia-border/60 bg-mia-black/30 hover:border-mf-coral/40 hover:bg-mf-coral/5'
                          : 'border-mia-border bg-mia-black/30',
                  ].join(' ')}
                >
                  {/* Barra de llenado vertical */}
                  {fill > 0 && !cargando && (
                    <div
                      className={[
                        'absolute bottom-0 left-0 w-full rounded-b-xl transition-all duration-700',
                        lleno ? 'bg-gain/25' : 'bg-mf-coral/20',
                      ].join(' ')}
                      style={{ height: `${Math.round(fill * 100)}%` }}
                    />
                  )}

                  {/* Contenido */}
                  <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                    {cargando ? (
                      <svg className="h-4 w-4 animate-spin text-mf-coral" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : lleno ? (
                      <CheckCircle2 className="h-5 w-5 text-gain" />
                    ) : parcial ? (
                      <span className={['text-[9px] font-bold', esDiaActual ? 'text-mf-coral' : 'text-neutral'].join(' ')}>
                        {Math.round(fill * 100)}%
                      </span>
                    ) : (
                      <span className="text-[9px] text-neutral/40">{i + 1}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-gain" /> Completado ($20k)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-sm border border-mf-coral/60 bg-mf-coral/20" /> En progreso
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-sm border border-mia-border" /> Pendiente
            </span>
          </div>
        </section>

      </div>
    </main>
  )
}
