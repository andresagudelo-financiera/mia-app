'use client'


import { useEffect, useState } from 'react'
import type { ElementType } from 'react'
import { Eye, EyeOff, Lock, Power, TimerReset } from 'lucide-react'
import { adminApi } from '@/services/api/admin.api'
import type { Simulator, SimulatorAccessType, SimulatorStatus } from '@/types/rentabilidad'
import StatusBadge from '@/components/admin/StatusBadge'

const statusOptions: SimulatorStatus[] = ['active', 'disabled', 'coming_soon', 'hidden']
const accessOptions: SimulatorAccessType[] = ['free', 'demo', 'paid', 'admin_only']

export default function AdminSimulatorsPage() {
  const [simulators, setSimulators] = useState<Simulator[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const data = await adminApi.listSimulators()
      setSimulators(data || [])
      setError(null)
    } catch {
      setError('No se pudieron cargar los simuladores. Verifica la query adminSimulators en backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const patchSimulator = async (sim: Simulator, input: { status?: SimulatorStatus; accessType?: SimulatorAccessType; demoDays?: number | null }) => {
    const previous = simulators
    const next = { ...sim, ...input }
    setSimulators(current => current.map(item => item.id === sim.id ? next : item))
    try {
      setSavingId(sim.id)
      const saved = await adminApi.updateSimulator(sim.id, input)
      setSimulators(current => current.map(item => item.id === sim.id ? saved : item))
    } catch {
      setSimulators(previous)
      alert('No se pudo guardar la configuración del simulador.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-3xl font-bold text-mia-cream">Configuración de simuladores</h2>
        <p className="max-w-2xl text-sm text-neutral">
          Enciende/apaga herramientas, define si son gratuitas, demo, pagas o solo admin, y configura demos de 7 días.
        </p>
      </div>

      {error && <div className="rounded-2xl border border-mf-orange/30 bg-mf-orange/10 p-4 text-sm text-mf-orange">{error}</div>}

      <div className="grid gap-5">
        {simulators.map(sim => (
          <section key={sim.id} className="glass rounded-2xl border border-mia-border p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <div className="mb-3 flex flex-wrap gap-2">
                  <StatusBadge value={sim.status} />
                  <StatusBadge value={sim.accessType} />
                  {savingId === sim.id && <span className="text-xs text-neutral">Guardando…</span>}
                </div>
                <h3 className="font-heading text-xl font-bold text-mia-cream">{sim.name}</h3>
                <p className="mt-1 text-sm text-neutral">/{sim.slug}</p>
                {sim.description && <p className="mt-3 text-sm text-neutral">{sim.description}</p>}
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-xl">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral">Estado</span>
                  <select value={sim.status} onChange={e => patchSimulator(sim, { status: e.target.value as SimulatorStatus })} className="w-full rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream">
                    {statusOptions.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral">Acceso por defecto</span>
                  <select value={sim.accessType} onChange={e => patchSimulator(sim, { accessType: e.target.value as SimulatorAccessType })} className="w-full rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream">
                    {accessOptions.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>

                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral">Días demo</span>
                  <input type="number" min={1} value={sim.demoDays ?? 7} onChange={e => patchSimulator(sim, { demoDays: Number(e.target.value) })} className="w-full rounded-xl border border-mia-border bg-mia-surface px-4 py-3 text-sm text-mia-cream" />
                </label>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction icon={Power} label="Activar" onClick={() => patchSimulator(sim, { status: 'active' })} />
              <QuickAction icon={EyeOff} label="Apagar" onClick={() => patchSimulator(sim, { status: 'disabled' })} />
              <QuickAction icon={Eye} label="Próximamente" onClick={() => patchSimulator(sim, { status: 'coming_soon' })} />
              <QuickAction icon={TimerReset} label="Demo 7 días" onClick={() => patchSimulator(sim, { accessType: 'demo', demoDays: 7 })} />
            </div>
          </section>
        ))}

        {!loading && simulators.length === 0 && (
          <div className="glass rounded-2xl border border-mia-border p-10 text-center">
            <Lock className="mx-auto mb-4 h-8 w-8 text-neutral" />
            <p className="font-heading text-xl font-bold text-mia-cream">No hay simuladores configurados</p>
            <p className="mt-2 text-sm text-neutral">El backend debe exponer por lo menos la Calculadora de Rentabilidad como simulator.</p>
          </div>
        )}

        {loading && <div className="py-16 text-center text-neutral">Cargando simuladores…</div>}
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, label, onClick }: { icon: ElementType; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-xl border border-mia-border bg-mia-surface/40 px-4 py-3 text-sm font-semibold text-neutral transition-colors hover:border-mf-coral/40 hover:text-mia-cream">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}
