'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Menu, X, Calculator, User } from 'lucide-react'
import { useUserStore } from '@/stores/user.store'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const profile = useUserStore(s => s.profile)

  const links = [
    { href: '/', label: 'Inicio' },
    { href: '/calculadoras', label: 'Calculadoras' },
    { href: '/perfil', label: 'Mi perfil' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-mia-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image
              src="/logo-mf-blanco.png"
              alt="Moneyflow"
              width={140}
              height={36}
              className="h-7 w-auto"
            />
          </Link>

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
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-neutral hover:text-mia-cream transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
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
    </nav>
  )
}
