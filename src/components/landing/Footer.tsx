'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Instagram, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-mia-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Image
              src="/logo-mf-blanco.png"
              alt="Moneyflow"
              width={150}
              height={40}
              className="h-8 w-auto mb-4"
            />
            <p className="text-neutral text-sm leading-relaxed max-w-sm">
              MIA es la plataforma de inteligencia financiera de Moneyflow.
              Herramientas gratuitas para que midas, entiendas y hagas crecer tus inversiones.
            </p>
            <p className="text-xs text-neutral/60 mt-4 leading-relaxed">
              Este contenido es educativo y no constituye una recomendación de inversión.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-mia-cream mb-4">Plataforma</h4>
            <ul className="space-y-3">
              {[
                { label: 'Inicio', href: '/' },
                { label: 'Calculadoras', href: '/calculadoras' },
                { label: 'Calculadora de Rentabilidad', href: '/calculadoras/rentabilidad' },
                { label: 'Mi perfil', href: '/perfil' },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-neutral hover:text-mia-cream transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-sm font-semibold text-mia-cream mb-4">Moneyflow</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://instagram.com/we.are.mia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-neutral hover:text-mia-cream transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                  @we.are.mia
                </a>
              </li>
              <li>
                <a
                  href="https://moneyflow.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-neutral hover:text-mia-cream transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  moneyflow.co
                </a>
              </li>
              <li>
                <Link href="/privacidad" className="text-sm text-neutral hover:text-mia-cream transition-colors">
                  Política de privacidad
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-mia-border mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-neutral/60">
            © 2026 MIA · Moneyflow. Todos los derechos reservados.
          </p>
          <p className="text-xs text-neutral/40">
            Generado por MIA Platform v1
          </p>
        </div>
      </div>
    </footer>
  )
}
