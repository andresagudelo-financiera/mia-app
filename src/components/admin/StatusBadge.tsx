import { cn } from '@/lib/utils'

const toneByValue: Record<string, string> = {
  active: 'bg-gain/10 text-gain border-gain/30',
  paid: 'bg-mia-teal/10 text-mia-teal border-mia-teal/30',
  demo: 'bg-mf-orange/10 text-mf-orange border-mf-orange/30',
  expired: 'bg-neutral/10 text-neutral border-neutral/30',
  blocked: 'bg-loss/10 text-loss border-loss/30',
  disabled: 'bg-loss/10 text-loss border-loss/30',
  revoked: 'bg-loss/10 text-loss border-loss/30',
  coming_soon: 'bg-mia-blue/10 text-mia-blue border-mia-blue/30',
  hidden: 'bg-neutral/10 text-neutral border-neutral/30',
  free: 'bg-gain/10 text-gain border-gain/30',
  admin_only: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  admin: 'bg-mf-coral/10 text-mf-coral border-mf-coral/30',
  user: 'bg-mia-surface text-neutral border-mia-border',
}

export default function StatusBadge({ value, label }: { value?: string | null; label?: string }) {
  const normalized = value || 'unknown'
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', toneByValue[normalized] || 'bg-mia-surface text-neutral border-mia-border')}>
      {label || normalized.replaceAll('_', ' ')}
    </span>
  )
}
