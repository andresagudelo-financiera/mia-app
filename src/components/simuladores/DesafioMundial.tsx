'use client'

import { useState, useMemo, useEffect } from 'react'
import { Trophy, Zap, Calendar, TrendingUp, Flame, Plus, CheckCircle2, PiggyBank, Trash2, Clock, Loader2, AlertTriangle, X, ChevronLeft, ChevronRight } from 'lucide-react'
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

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const todayStr = () => formatDateKey(new Date())

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

function splitPhoneByCountry(phone?: string | null) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return { countryCode: 'CO', nationalNumber: '' }

  const country = [...PAISES]
    .sort((a, b) => b.dialCode.replace(/\D/g, '').length - a.dialCode.replace(/\D/g, '').length)
    .find((pais) => digits.startsWith(pais.dialCode.replace(/\D/g, '')))

  if (!country) return { countryCode: 'CO', nationalNumber: digits }

  return {
    countryCode: country.codigo,
    nationalNumber: digits.slice(country.dialCode.replace(/\D/g, '').length),
  }
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
  const [dashboardChecked, setDashboardChecked] = useState(false)
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!userProfile?.id) {
      setDashboardChecked(false)
      return
    }
    let active = true
    setDashboardChecked(false)
    setCargandoDb(true)
    desafioMundialApi.getDashboard(userProfile.id, userProfile.authToken)
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
        } else {
          setDashboardData({
            isRegistered: false,
            aportes: [],
            profile: null,
          })
        }
      })
      .catch(() => null)
      .finally(() => {
        if (active) {
          setDashboardChecked(true)
          setCargandoDb(false)
        }
      })

    return () => {
      active = false
    }
  }, [userProfile?.id, userProfile?.authToken, setDashboardData, userProfile?.email])

  if (!isUserRegistered || !userProfile?.id) {
    return <UserRegistrationModal toolName="desafio-mundial" contentName="desafio_mundial" onClose={() => undefined} />
  }

  if (cargandoDb || (isUserRegistered && userProfile?.id && !dashboardChecked)) {
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
          defaultTelefono={userProfile?.phone || ''}
          onRegister={async (data) => {
            setCargandoDb(true)
            const participant = await desafioMundialApi.registerParticipant(userProfile.id, {
              displayName: data.nombre,
              country: data.pais,
              phone: data.telefono,
              email: userProfile.email || '',
            }, userProfile.authToken)
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
  defaultTelefono,
  onRegister,
}: {
  defaultNombre: string
  defaultEmail: string
  defaultTelefono: string
  onRegister: (data: { nombre: string; pais: string; telefono: string }) => void
}) {
  const defaultPhone = splitPhoneByCountry(defaultTelefono)
  const [nombre] = useState(defaultNombre)
  const [email] = useState(defaultEmail)
  const telefono = defaultPhone.nationalNumber
  const telefonoPais = defaultPhone.countryCode
  const [paisCodigo, setPaisCodigo] = useState('CO')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const telefonoPaisData = PAISES.find((p) => p.codigo === telefonoPais) ?? PAISES[0]
  const { dias } = calcularEstado()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const digitos = telefono.replace(/\D/g, '')
    if (!nombre.trim() || !digitos || !paisCodigo) {
      setError('Tu perfil no tiene nombre o teléfono. Actualiza tus datos antes de unirte al reto.')
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
            {/* Datos de perfil MIA */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-mia-cream">Nombre completo</label>
                <div className="w-full rounded-xl border border-mia-border bg-mia-black/50 px-4 py-3 text-mia-cream">
                  {nombre || 'Nombre no disponible'}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-mia-cream">Email</label>
                <div className="w-full rounded-xl border border-mia-border bg-mia-black/50 px-4 py-3 text-neutral">
                  {email || 'Email no disponible'}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-mia-cream">
                Teléfono
              </label>
              <div className="w-full rounded-xl border border-mia-border bg-mia-black/50 px-4 py-3 text-mia-cream">
                {telefono
                  ? `${telefonoPaisData.bandera} ${telefonoPaisData.dialCode} ${telefono}`
                  : 'Teléfono no disponible'}
              </div>
              <p className="mt-1.5 text-[11px] text-neutral/50">
                Usaremos el teléfono guardado en tu perfil MIA para esta inscripción.
              </p>
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
    setDashboardData,
    getAportesHoy, getTotalHoy,
    getRacha, getTotalAcumulado, getTotalDiasCompletados,
  } = useDesafioMundialStore()

  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState('COP')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensajeOk, setMensajeOk] = useState('')
  const [quickLoading, setQuickLoading] = useState<string | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const month = new Date()
    month.setDate(1)
    month.setHours(0, 0, 0, 0)
    return month
  })

  const { dias, diaDelTorneo } = calcularEstado()
  const aportesHoy = getAportesHoy()
  const totalHoy = getTotalHoy()
  const totalAcumulado = getTotalAcumulado()
  const diasCompletados = getTotalDiasCompletados()
  const progresoPct = Math.min(100, Math.round((totalHoy / MONTO_MINIMO_DIA) * 100))
  const faltanParaCompletarHoy = Math.max(0, MONTO_MINIMO_DIA - totalHoy)
  const diaCompletadoHoy = totalHoy >= MONTO_MINIMO_DIA
  const racha = getRacha()
  const monedaDisplay = aportesHoy[0]?.moneda ?? aportes[0]?.moneda ?? moneda

  const sortedAportes = useMemo(
    () => [...aportes].sort((a, b) => b.timestamp - a.timestamp),
    [aportes]
  )

  const aportesPorFecha = useMemo(() => {
    const map = new Map<string, typeof aportes>()
    for (const aporte of aportes) {
      const current = map.get(aporte.fecha) ?? []
      current.push(aporte)
      map.set(aporte.fecha, current)
    }
    for (const [fecha, items] of map.entries()) {
      map.set(fecha, [...items].sort((a, b) => b.timestamp - a.timestamp))
    }
    return map
  }, [aportes])

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const leadingEmptyCells = (firstDay.getDay() + 6) % 7
    const today = todayStr()
    const cells: Array<{
      key: string
      day: number | null
      fecha: string | null
      total: number
      completed: boolean
      isToday: boolean
      isFuture: boolean
      aportesCount: number
    }> = []

    for (let i = 0; i < leadingEmptyCells; i++) {
      cells.push({
        key: `empty-${i}`,
        day: null,
        fecha: null,
        total: 0,
        completed: false,
        isToday: false,
        isFuture: false,
        aportesCount: 0,
      })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const fecha = formatDateKey(date)
      const aportesDia = aportesPorFecha.get(fecha) ?? []
      const total = aportesDia.reduce((sum, aporte) => sum + aporte.monto, 0)
      cells.push({
        key: fecha,
        day,
        fecha,
        total,
        completed: total >= MONTO_MINIMO_DIA,
        isToday: fecha === today,
        isFuture: fecha > today,
        aportesCount: aportesDia.length,
      })
    }

    return cells
  }, [calendarMonth, aportesPorFecha])

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(calendarMonth),
    [calendarMonth]
  )
  const selectedMonthPrefix = useMemo(
    () => `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`,
    [calendarMonth]
  )
  const aportesDelMes = useMemo(
    () => sortedAportes.filter((aporte) => aporte.fecha.startsWith(selectedMonthPrefix)),
    [sortedAportes, selectedMonthPrefix]
  )

  const monthCompletedDays = calendarCells.filter((cell) => cell.completed).length
  const monthDaysWithSavings = calendarCells.filter((cell) => cell.total > 0).length
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  function cambiarMes(delta: number) {
    setCalendarMonth((current) => {
      const next = new Date(current)
      next.setMonth(next.getMonth() + delta)
      next.setDate(1)
      next.setHours(0, 0, 0, 0)
      return next
    })
  }

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
    }, userProfile.authToken)

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
      const dashboard = await desafioMundialApi.getDashboard(userProfile.id, userProfile.authToken)
      if (dashboard && !dashboard.isRegistered) {
        setDashboardData({ isRegistered: false, aportes: [], profile: null })
        onError('Primero debes registrarte en el reto. Te llevaremos al formulario de inscripción.')
      } else {
        setError('No se pudo registrar el aporte en la base de datos.')
      }
    }
    setGuardando(false)
  }

  async function handleEliminar(id: string) {
    if (!userProfile?.id) return
    const success = await desafioMundialApi.deleteSaving(userProfile.id, id, userProfile.authToken)
    if (success) {
      eliminarAporteLocal(id)
    } else {
      onError('Ocurrió un error al intentar eliminar el aporte del servidor.')
    }
  }

  async function handleClickFecha(fecha: string, totalDia: number) {
    if (quickLoading !== null) return
    if (fecha > todayStr()) {
      setError('No puedes registrar aportes futuros. Usa el calendario para revisar o completar días pasados y el día de hoy.')
      return
    }
    if (!userProfile?.id || !profile) return

    setError('')
    setQuickLoading(fecha)

    if (totalDia >= MONTO_MINIMO_DIA) {
      const aporteParaEliminar = aportesPorFecha.get(fecha)?.[0]
      if (aporteParaEliminar) {
        await handleEliminar(aporteParaEliminar.id)
        setMensajeOk(`Quitamos el último aporte de ${formatFechaCorta(fecha)}.`)
        setTimeout(() => setMensajeOk(''), 4000)
      }
      setQuickLoading(null)
      return
    }

    const montoParaCompletar = Math.max(MONTO_MINIMO_DIA - totalDia, 1)
    const savedSaving = await desafioMundialApi.logSaving(userProfile.id, {
      amount: montoParaCompletar,
      date: fecha,
      currency: moneda,
      email: profile.email,
      nombre: profile.nombre,
    }, userProfile.authToken)

    if (savedSaving) {
      agregarAporteLocal({
        id: savedSaving.id,
        fecha: savedSaving.date,
        monto: savedSaving.amount,
        moneda: savedSaving.currency,
        timestamp: new Date(savedSaving.createdAt).getTime(),
      })
      setMensajeOk(`Día ${formatFechaCorta(fecha)} completado con ${formatMonto(montoParaCompletar, moneda)}. ✅`)
      setTimeout(() => setMensajeOk(''), 4000)
    } else {
      const dashboard = await desafioMundialApi.getDashboard(userProfile.id, userProfile.authToken)
      if (dashboard && !dashboard.isRegistered) {
        setDashboardData({ isRegistered: false, aportes: [], profile: null })
        onError('Primero debes registrarte en el reto. Te llevaremos al formulario de inscripción.')
      } else {
        onError('No se pudo registrar el aporte rápido.')
      }
    }

    setQuickLoading(null)
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

          <div className="mt-8 max-w-2xl">
            <div className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold text-neutral">
              <span>Progreso de hoy</span>
              <span>
                {progresoPct}% del mínimo diario
                {diasCompletados > 0 ? ` · ${diasCompletados} ${diasCompletados === 1 ? 'día completo' : 'días completos'}` : ''}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-mia-black/60">
              <div
                className="h-full rounded-full bg-gradient-mf transition-all duration-500"
                style={{ width: `${progresoPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-neutral">
              {faltanParaCompletarHoy > 0
                ? `Faltan ${formatMonto(faltanParaCompletarHoy, monedaDisplay)} para completar hoy.`
                : '¡Hoy ya está completo! Sigue sumando si quieres. ⚽'}
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral mb-2">Días completados</p>
            <p className="font-heading text-3xl font-bold text-mia-cream">{diasCompletados}</p>
            <p className="mt-1 text-xs text-neutral">fechas con mínimo diario</p>
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral mb-2">Meta de hoy</p>
            <p className="font-heading text-3xl font-bold text-mia-cream">{diaCompletadoHoy ? 'Completa' : `${progresoPct}%`}</p>
            <p className="mt-1 text-xs text-neutral">mínimo de {formatMonto(MONTO_MINIMO_DIA, monedaDisplay)}</p>
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

        <section className="rounded-2xl border border-mia-border bg-mia-card p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-mia-cream">Calendario del reto</h2>
              <p className="mt-1 text-xs text-neutral">
                Navega por mes para ver qué días llenaste. Clic en un día pendiente lo completa hasta {formatMonto(MONTO_MINIMO_DIA, monedaDisplay)}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cambiarMes(-1)}
                className="rounded-xl border border-mia-border bg-mia-black/40 p-2 text-neutral transition hover:border-mf-coral/50 hover:text-mia-cream"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-44 rounded-xl border border-mia-border bg-mia-black/40 px-4 py-2 text-center text-sm font-bold capitalize text-mia-cream">
                {monthLabel}
              </div>
              <button
                type="button"
                onClick={() => cambiarMes(1)}
                className="rounded-xl border border-mia-border bg-mia-black/40 p-2 text-neutral transition hover:border-mf-coral/50 hover:text-mia-cream"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-neutral sm:grid-cols-3">
            <div className="rounded-xl border border-mia-border bg-mia-black/30 px-3 py-2">
              <span className="font-bold text-mia-cream">{monthCompletedDays}</span> días completos este mes
            </div>
            <div className="rounded-xl border border-mia-border bg-mia-black/30 px-3 py-2">
              <span className="font-bold text-mia-cream">{monthDaysWithSavings}</span> días con aportes
            </div>
            <div className="rounded-xl border border-mia-border bg-mia-black/30 px-3 py-2 sm:col-span-1 col-span-2">
              <span className="font-bold text-mia-cream">{diasCompletados}</span> completados en total
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center">
            {weekDays.map((day) => (
              <div key={day} className="pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral/70">
                {day}
              </div>
            ))}

            {calendarCells.map((cell) => {
              if (!cell.fecha || cell.day === null) {
                return <div key={cell.key} className="aspect-square rounded-xl border border-transparent" />
              }

              const fill = Math.min(100, Math.round((cell.total / MONTO_MINIMO_DIA) * 100))
              const partial = cell.total > 0 && !cell.completed
              const loading = quickLoading === cell.fecha
              const clickable = !cell.isFuture

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => clickable && handleClickFecha(cell.fecha!, cell.total)}
                  disabled={!clickable || loading}
                  title={
                    cell.completed
                      ? `${cell.fecha}: completo — clic para quitar el último aporte de ese día`
                      : partial
                        ? `${cell.fecha}: ${fill}% — clic para completar el mínimo diario`
                        : cell.isFuture
                          ? `${cell.fecha}: futuro`
                          : `${cell.fecha}: pendiente — clic para completar el mínimo diario`
                  }
                  className={[
                    'relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed',
                    cell.completed
                      ? 'border-gain/40 bg-gain/10 text-gain hover:border-loss/50 hover:bg-loss/10'
                      : partial
                        ? 'border-mf-coral/60 bg-mf-coral/10 text-mf-coral hover:bg-mf-coral/20'
                        : cell.isToday
                          ? 'border-mf-coral/50 bg-mia-black/40 text-mia-cream hover:bg-mf-coral/10'
                          : cell.isFuture
                            ? 'border-mia-border/40 bg-mia-black/20 text-neutral/30'
                            : 'border-mia-border bg-mia-black/30 text-neutral hover:border-mf-coral/40 hover:bg-mf-coral/5',
                  ].join(' ')}
                >
                  {partial && !loading && (
                    <div
                      className="absolute bottom-0 left-0 w-full rounded-b-xl bg-mf-coral/20 transition-all duration-500"
                      style={{ height: `${fill}%` }}
                    />
                  )}
                  <span className="relative z-10 text-[11px]">{cell.day}</span>
                  <span className="relative z-10 mt-1 flex h-5 items-center justify-center text-[10px]">
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-mf-coral" />
                    ) : cell.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-gain" />
                    ) : partial ? (
                      `${fill}%`
                    ) : cell.isToday ? (
                      'Hoy'
                    ) : cell.total > 0 ? (
                      cell.aportesCount
                    ) : (
                      '·'
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-gain" /> Día completado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-sm border border-mf-coral/60 bg-mf-coral/20" /> En progreso
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-sm border border-mia-border" /> Pendiente
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-mia-border bg-mia-card p-6">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-lg font-bold text-mia-cream">Historial de aportes</h2>
            <p className="text-xs font-semibold capitalize text-neutral">Filtrado por {monthLabel}</p>
          </div>

          {aportesDelMes.length > 0 ? (
            <>
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
                    {aportesDelMes.slice(0, 30).map((a) => (
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
              {aportesDelMes.length > 30 && (
                <p className="mt-3 text-center text-xs text-neutral">Mostrando los últimos 30 aportes de este mes.</p>
              )}
            </>
          ) : (
            <p className="rounded-xl border border-mia-border bg-mia-black/30 px-4 py-4 text-sm text-neutral">
              No hay aportes registrados en {monthLabel}. Usa las flechas del calendario para revisar otros meses.
            </p>
          )}
        </section>

      </div>
    </main>
  )
}
