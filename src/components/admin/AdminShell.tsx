'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BarChart3, BookOpen, Calculator, LayoutDashboard, Trophy, UserCircle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isAcademyEnabled } from '@/lib/feature-flags'

const links = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/simuladores', label: 'Simuladores', icon: Calculator },
  { href: '/admin/retos', label: 'Retos', icon: Trophy },
  { href: '/admin/academia', label: 'Academia', icon: BookOpen },
  { href: '/admin/perfil', label: 'Mi perfil', icon: UserCircle },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  return (
    <div className="min-h-screen bg-mia-black pt-16">
      <div className="border-b border-mia-border bg-mia-black/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-mf p-3">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-mia-cream">Admin MIA</h1>
              <p className="text-sm text-neutral">Usuarios, accesos, simuladores y uso de la plataforma.</p>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto">
            {links.filter(link => {
              if (!isAdmin && !['/admin/usuarios', '/admin/perfil'].includes(link.href)) return false
              return isAcademyEnabled() || link.href !== '/admin/academia'
            }).map(link => {
              const Icon = link.icon
              const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors',
                    active
                      ? 'border-mf-coral bg-mf-coral/10 text-mf-coral'
                      : 'border-mia-border bg-mia-surface/40 text-neutral hover:text-mia-cream'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
