'use client'

import { useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, Loader2, Save, Trophy } from 'lucide-react'
import StatusBadge from '@/components/admin/StatusBadge'
import { adminApi } from '@/services/api/admin.api'
import type { Challenge, ChallengeStep, SimulatorAccessType } from '@/types/rentabilidad'

const challengeStatuses = ['active', 'coming_soon', 'disabled', 'hidden']
const stepStatuses = ['active', 'disabled', 'coming_soon']
const accessTypes: SimulatorAccessType[] = ['free', 'demo', 'paid', 'admin_only']
const unlockRules = [
  { value: 'always', label: 'Siempre disponible' },
  { value: 'complete_previous', label: 'Completar anterior + fecha si existe' },
  { value: 'complete_specific_simulator', label: 'Completar simulador específico + fecha si existe' },
  { value: 'date_based', label: 'Solo por fecha' },
  { value: 'manual_unlock', label: 'Manual' },
]

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const data = await adminApi.listChallenges()
      setChallenges(data)
      setError(null)
    } catch {
      setError('No se pudieron cargar los retos. Verifica que MIA API tenga habilitadas las queries de challenges.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const patchChallenge = async (challenge: Challenge, input: Partial<Challenge>) => {
    const previous = challenges
    setChallenges(current => current.map(item => item.key === challenge.key ? { ...item, ...input } : item))
    try {
      setSaving(challenge.key)
      const saved = await adminApi.updateChallenge(challenge.key, {
        status: input.status,
        accessType: input.accessType,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        metadata: input.metadata,
      })
      setChallenges(current => current.map(item => item.key === challenge.key ? saved : item))
    } catch {
      setChallenges(previous)
      alert('No se pudo guardar el reto.')
    } finally {
      setSaving(null)
    }
  }

  const patchStep = async (challenge: Challenge, step: ChallengeStep, input: Partial<ChallengeStep>) => {
    const previous = challenges
    setChallenges(current => current.map(item => item.key === challenge.key ? { ...item, steps: item.steps.map(currentStep => currentStep.id === step.id ? { ...currentStep, ...input } : currentStep) } : item))
    try {
      setSaving(step.id)
      const saved = await adminApi.updateChallengeStep(step.id, {
        status: input.status,
        unlockRule: input.unlockRule,
        unlocksAt: input.unlocksAt,
        requiredSimulatorKey: input.requiredSimulatorKey,
        requiredStatus: input.requiredStatus,
        metadata: input.metadata,
      })
      setChallenges(current => current.map(item => item.key === saved.key ? saved : item))
    } catch {
      setChallenges(previous)
      alert('No se pudo guardar el paso del reto.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-3xl font-bold text-mia-cream">Configuración de retos</h2>
        <p className="max-w-3xl text-sm text-neutral">
          Configura rutas gamificadas encima de los simuladores. Puedes exigir completar pasos anteriores y además liberar cada nivel por fecha para crear expectativa semanal.
        </p>
      </div>

      {error && <div className="rounded-2xl border border-mf-orange/30 bg-mf-orange/10 p-4 text-sm text-mf-orange">{error}</div>}
      {loading && <div className="py-16 text-center text-neutral"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" /> Cargando retos…</div>}

      <div className="space-y-6">
        {challenges.map(challenge => (
          <section key={challenge.key} className="glass rounded-3xl border border-mia-border p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 flex flex-wrap gap-2">
                  <StatusBadge value={challenge.status} />
                  <StatusBadge value={challenge.accessType} />
                  {saving === challenge.key && <span className="inline-flex items-center gap-1 text-xs text-neutral"><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-mf-coral/15 p-3 text-mf-coral"><Trophy className="h-6 w-6" /></div>
                  <div>
                    <h3 className="font-heading text-2xl font-bold text-mia-cream">{challenge.name}</h3>
                    <p className="text-xs text-neutral">/{challenge.key}</p>
                  </div>
                </div>
                {challenge.description && <p className="mt-3 text-sm leading-relaxed text-neutral">{challenge.description}</p>}
              </div>

              <div className="grid w-full gap-3 md:grid-cols-2 xl:max-w-xl">
                <SelectField label="Estado" value={challenge.status} options={challengeStatuses} onChange={status => patchChallenge(challenge, { status })} />
                <SelectField label="Acceso comercial" value={String(challenge.accessType)} options={accessTypes} onChange={accessType => patchChallenge(challenge, { accessType })} />
                <DateField label="Inicio del reto" value={challenge.startsAt} onChange={startsAt => patchChallenge(challenge, { startsAt })} />
                <DateField label="Fin del reto" value={challenge.endsAt} onChange={endsAt => patchChallenge(challenge, { endsAt })} />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="Usuarios iniciados" value={challenge.stats?.startedUsers ?? 0} />
              <Metric label="Usuarios completados" value={challenge.stats?.completedUsers ?? 0} />
              <Metric label="Conversión" value={`${challenge.stats?.completionRate ?? 0}%`} />
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="font-heading text-xl font-bold text-mia-cream">Pasos y desbloqueos</h4>
              {challenge.steps.map(step => (
                <div key={step.id} className="rounded-2xl border border-mia-border bg-mia-surface/30 p-4">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2"><StatusBadge value={step.status} /><span className="rounded-full bg-mia-black/40 px-2 py-1 text-xs text-neutral">Paso {step.stepOrder}</span></div>
                      <h5 className="font-heading text-lg font-bold text-mia-cream">{step.title}</h5>
                      <p className="text-xs text-neutral">Simulador: {step.simulatorKey}</p>
                      {step.description && <p className="mt-2 text-sm text-neutral">{step.description}</p>}
                    </div>
                    {saving === step.id && <span className="inline-flex items-center gap-1 text-xs text-neutral"><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</span>}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SelectField label="Estado paso" value={step.status} options={stepStatuses} onChange={status => patchStep(challenge, step, { status })} />
                    <SelectField label="Regla desbloqueo" value={step.unlockRule} options={unlockRules.map(rule => rule.value)} labels={Object.fromEntries(unlockRules.map(rule => [rule.value, rule.label]))} onChange={unlockRule => patchStep(challenge, step, { unlockRule })} />
                    <DateField label="Fecha de liberación" value={step.unlocksAt || step.availableAt} onChange={unlocksAt => patchStep(challenge, step, { unlocksAt })} />
                    <TextField label="Requiere simulador" value={step.requiredSimulatorKey || ''} onChange={requiredSimulatorKey => patchStep(challenge, step, { requiredSimulatorKey: requiredSimulatorKey || null })} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-mia-border bg-mia-black/30 p-4"><p className="text-xs font-bold uppercase tracking-wide text-neutral">{label}</p><p className="mt-2 font-heading text-2xl font-bold text-mia-cream">{value}</p></div>
}

function SelectField({ label, value, options, labels, onChange }: { label: string; value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return <label className="space-y-1"><span className="text-xs font-semibold uppercase tracking-wider text-neutral">{label}</span><select value={value || ''} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream">{options.map(option => <option key={option} value={option}>{labels?.[option] || option}</option>)}</select></label>
}

function DateField({ label, value, onChange }: { label: string; value?: string | null; onChange: (value: string | null) => void }) {
  return <label className="space-y-1"><span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-neutral"><CalendarClock className="h-3 w-3" /> {label}</span><input type="datetime-local" value={toDateTimeInput(value)} onChange={event => onChange(event.target.value ? new Date(event.target.value).toISOString() : null)} className="w-full rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream" /><button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-neutral hover:text-mf-coral">Limpiar fecha</button></label>
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1"><span className="text-xs font-semibold uppercase tracking-wider text-neutral">{label}</span><input value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream" /></label>
}

function toDateTimeInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}
