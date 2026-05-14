'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { ChevronDown, Menu, X, Calculator, ShieldCheck, LogOut } from 'lucide-react'
import { useUserStore } from '@/stores/user.store'
import { useRentabilidadStore } from '@/stores/rentabilidad.store'
import { isAdminProfile } from '@/lib/admin-access'
import ThemeToggle from '@/components/theme/ThemeToggle'

interface Props {
  variant?: 'default' | 'minimal' | 'home' | 'user' 
}


type SimulatorNavItem = {
  slug: string
  label: string
  href: string
  status?: string
}

type NavDensity = 'default' | 'compact'

function getProfileDisplayName(profile: ReturnType<typeof useUserStore.getState>['profile']) {
  return profile?.name?.split(' ')[0] || profile?.email?.split('@')[0] || 'Usuario'
}

function UserNavActions({
  profile,
  onLogout,
  showProfile,
  density = 'default',
  simulators,
}: {
  profile: ReturnType<typeof useUserStore.getState>['profile']
  onLogout: () => void
  showProfile: boolean
  density?: NavDensity
  simulators: SimulatorNavItem[]
}) {
  const isLoggedIn = Boolean(profile?.id || profile?.email)
  const displayName = getProfileDisplayName(profile)
  const compact = density === 'compact'

  return (
    <div className={`flex min-w-0 items-center ${compact ? 'gap-1.5' : 'gap-3 sm:gap-4'}`}>
      {isLoggedIn && displayName && (
        <span className={`${compact ? 'max-w-[72px] text-[11px] leading-tight' : 'hidden text-sm sm:inline'} truncate text-neutral`}>
          <span className={compact ? 'hidden' : ''}>Hola, </span><span className="text-mia-cream font-medium">{displayName}</span>
        </span>
      )}
      {isLoggedIn && <MySimulatorsMenu simulators={simulators} compact={compact} />}
      {isLoggedIn && showProfile && (
        <Link href="/perfil" className={`${compact ? 'hidden sm:inline' : 'text-sm'} text-neutral transition-colors hover:text-mia-cream`}>
          Mi perfil
        </Link>
      )}
      <ThemeToggle compact />
      {isLoggedIn && (
        <button
          type="button"
          onClick={onLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className={`inline-flex items-center justify-center gap-2 rounded-lg border border-loss/30 bg-loss/10 text-sm font-semibold text-loss transition-colors hover:bg-loss/20 ${
            compact ? 'h-9 w-9' : 'h-9 w-9'
          }`}
        >
          <LogOut className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function MySimulatorsMenu({ simulators, compact = false }: { simulators: SimulatorNavItem[]; compact?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className={`${compact ? 'max-w-[76px] text-[11px] leading-tight sm:max-w-none' : 'text-sm'} inline-flex items-center gap-1 text-neutral transition-colors hover:text-mia-cream`}
        aria-expanded={open}
      >
        <span className={compact ? 'line-clamp-2 text-center' : ''}>Mis simuladores</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-mia-border bg-mia-card shadow-2xl shadow-black/20">
          <div className="border-b border-mia-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral">Simuladores activos/usados</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {simulators.map(simulator => (
              <Link
                key={simulator.slug}
                href={simulator.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm transition-colors hover:bg-mia-surface"
              >
                <span className="flex items-center gap-2 text-mia-cream">
                  <Calculator className="h-4 w-4 text-mf-coral" />
                  {simulator.label}
                </span>
                {simulator.status && (
                  <span className="rounded-full border border-mia-border px-2 py-0.5 text-[10px] text-neutral">
                    {simulator.status}
                  </span>
                )}
              </Link>
            ))}
            {simulators.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-neutral">
                Todavía no tienes simuladores en uso.
              </div>
            )}
          </div>
          <div className="border-t border-mia-border p-2">
            <Link
              href="/calculadoras"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-center text-xs font-bold text-mf-coral hover:bg-mf-coral/10"
            >
              Ver calculadoras disponibles
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function MobileUserDrawer({
  profile,
  onLogout,
  onClose,
  showProfile,
  simulators,
}: {
  profile: ReturnType<typeof useUserStore.getState>['profile']
  onLogout: () => void
  onClose: () => void
  showProfile: boolean
  simulators: SimulatorNavItem[]
}) {
  const isLoggedIn = Boolean(profile?.id || profile?.email)
  const displayName = getProfileDisplayName(profile)

  return (
    <div className="md:hidden border-t border-mia-border bg-mia-card/95 px-3 py-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
      {isLoggedIn && (
        <div className="mb-4 rounded-2xl border border-mia-border bg-mia-surface/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral">Sesión activa</p>
          <p className="mt-1 truncate font-heading text-xl font-bold text-mia-cream">Hola, {displayName}</p>
          {profile?.email && <p className="mt-0.5 truncate text-xs text-neutral">{profile.email}</p>}
        </div>
      )}

      <div className="space-y-2">
        {showProfile && isLoggedIn && (
          <Link
            href="/perfil"
            onClick={onClose}
            className="flex items-center justify-between rounded-xl border border-mia-border bg-mia-surface/40 px-4 py-3 text-sm font-semibold text-mia-cream"
          >
            Mi perfil
            <ChevronDown className="-rotate-90 h-4 w-4 text-neutral" />
          </Link>
        )}

        <div className="rounded-2xl border border-mia-border bg-mia-surface/30 p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral">Mis simuladores</p>
            <Link href="/calculadoras" onClick={onClose} className="text-xs font-bold text-mf-coral">
              Ver todos
            </Link>
          </div>
          <div className="space-y-1">
            {simulators.map(simulator => (
              <Link
                key={simulator.slug}
                href={simulator.href}
                onClick={onClose}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm transition-colors hover:bg-mia-surface"
              >
                <span className="flex items-center gap-2 text-mia-cream">
                  <Calculator className="h-4 w-4 text-mf-coral" />
                  {simulator.label}
                </span>
                {simulator.status && (
                  <span className="rounded-full border border-mia-border px-2 py-0.5 text-[10px] text-neutral">
                    {simulator.status}
                  </span>
                )}
              </Link>
            ))}
            {simulators.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-neutral">Todavía no tienes simuladores en uso.</p>
            )}
          </div>
        </div>

        {isLoggedIn && (
          <button
            type="button"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex h-11 w-full items-center justify-center rounded-xl border border-loss/30 bg-loss/10 text-loss"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}


function buildUserSimulators(
  profile: ReturnType<typeof useUserStore.getState>['profile'],
  localData: { investments: unknown[]; transactions: unknown[]; snapshots: unknown[] },
): SimulatorNavItem[] {
  const simulators = new Map<string, SimulatorNavItem>()

  ;(profile?.accesses || []).forEach(access => {
    const slug = normalizeSimulatorSlug(access.toolName || access.simulatorSlug || access.simulatorId || '')
    if (!slug) return
    simulators.set(slug, {
      slug,
      label: access.simulatorName || getSimulatorLabel(slug),
      href: getSimulatorHref(slug),
      status: access.status,
    })
  })

  if (localData.investments.length > 0 || localData.transactions.length > 0 || localData.snapshots.length > 0) {
    simulators.set('rentabilidad', {
      slug: 'rentabilidad',
      label: 'Rentabilidad',
      href: '/calculadoras/rentabilidad',
      status: simulators.get('rentabilidad')?.status || 'en uso',
    })
  }

  return Array.from(simulators.values()).sort((a, b) => a.label.localeCompare(b.label))
}

function normalizeSimulatorSlug(value: string) {
  return value.toLowerCase().trim()
}

function getSimulatorLabel(slug: string) {
  if (slug === 'rentabilidad') return 'Rentabilidad'
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function getSimulatorHref(slug: string) {
  if (slug === 'rentabilidad') return '/calculadoras/rentabilidad'
  return `/calculadoras/${slug}`
}

export default function Navbar({ variant = 'default' }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const profile = useUserStore(s => s.profile)
  const clearProfile = useUserStore(s => s.clearProfile)
  const investments = useRentabilidadStore(s => s.investments)
  const transactions = useRentabilidadStore(s => s.transactions)
  const snapshots = useRentabilidadStore(s => s.snapshots)
  const isAdmin = isAdminProfile(profile)
  const userSimulators = useMemo(() => buildUserSimulators(profile, { investments, transactions, snapshots }), [investments, profile, snapshots, transactions])
  const isUserVariant = variant === 'user' || variant === 'home'

  const handleLogout = () => {
    clearProfile()
    setIsOpen(false)
  }

  const links = [
    { href: '/', label: 'Inicio' },
    { href: '/calculadoras', label: 'Calculadoras' },
    ...(profile?.name ? [{ href: '/perfil', label: 'Mi perfil' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-mia-border">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image
              src="/logo-mf-negro.png"
              alt="Moneyflow"
              width={140}
              height={36}
              className="h-6 w-auto dark:hidden sm:h-7"
              priority
            />
            <Image
              src="/logo-mf-blanco.png"
              alt="Moneyflow"
              width={140}
              height={36}
              className="hidden h-6 w-auto dark:block sm:h-7"
              priority
            />
          </Link>

          {variant === 'home' && (
            <>
              <div className="hidden md:block">
                <UserNavActions profile={profile} onLogout={handleLogout} showProfile={false} simulators={userSimulators} />
              </div>
              <div className="flex items-center gap-2 md:hidden">
                <ThemeToggle compact />
                {(profile?.id || profile?.email) && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-loss/30 bg-loss/10 text-loss"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(value => !value)}
                  aria-label="Abrir menú"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-mia-border bg-mia-surface text-mia-cream"
                >
                  {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              </div>
            </>
          )}

          {variant === 'user' && (
            <>
              <div className="hidden md:block">
                <UserNavActions profile={profile} onLogout={handleLogout} showProfile simulators={userSimulators} />
              </div>
              <div className="flex items-center gap-2 md:hidden">
                <ThemeToggle compact />
                <button
                  type="button"
                  onClick={() => setIsOpen(value => !value)}
                  aria-label="Abrir menú"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-mia-border bg-mia-surface text-mia-cream"
                >
                  {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              </div>
            </>
          )}

          {variant === 'default' && (
            <>
              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-8">
                {links.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-neutral hover:text-mia-cream transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* CTA + User */}
              <div className="hidden md:flex items-center gap-4">
                <ThemeToggle compact />
                {profile?.name && (
                  <span className="text-sm text-neutral">
                    Hola, <span className="text-mia-cream font-medium">{profile.name.split(' ')[0]}</span>
                  </span>
                )}
                <Link
                  href="/calculadoras/rentabilidad"
                  className="flex items-center gap-2 bg-gradient-mf text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Calculator className="w-4 h-4" />
                  Calcular rentabilidad
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 border border-mf-coral/30 text-mf-coral text-sm font-semibold px-4 py-2 rounded-lg hover:bg-mf-coral/10 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </Link>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 text-neutral hover:text-mia-cream transition-colors"
                aria-label="Toggle menu"
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          )}

          {/* Minimal Nav User Display */}
          {variant === 'minimal' && (
            <div className="flex items-center gap-4">
              {profile?.name && (
                <span className="text-sm text-neutral">
                  Hola, <span className="text-mia-cream font-medium">{profile.name.split(' ')[0]}</span>
                </span>
              )}
              {profile?.name && <MySimulatorsMenu simulators={userSimulators} />}
              <ThemeToggle compact />
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {variant === 'default' && isOpen && (
        <div className="md:hidden glass border-t border-mia-border">
          <div className="px-4 py-4 space-y-3">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block text-sm text-neutral hover:text-mia-cream transition-colors py-2"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center justify-between rounded-lg border border-mia-border bg-mia-surface/40 px-4 py-3">
              <span className="text-sm text-neutral">Tema</span>
              <ThemeToggle compact />
            </div>
            <Link
              href="/calculadoras/rentabilidad"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 bg-gradient-mf text-white text-sm font-semibold px-4 py-3 rounded-lg w-full justify-center mt-4"
            >
              <Calculator className="w-4 h-4" />
              Calcular rentabilidad
            </Link>
          </div>
        </div>
      )}

      {isUserVariant && isOpen && (
        <MobileUserDrawer
          profile={profile}
          onLogout={handleLogout}
          onClose={() => setIsOpen(false)}
          showProfile={variant === 'user'}
          simulators={userSimulators}
        />
      )}
    </nav>
  )
}
