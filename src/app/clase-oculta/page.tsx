import type { Metadata } from 'next'
import ClaseOcultaClient from './ClaseOcultaClient'

export const metadata: Metadata = {
  title: 'Clase Oculta | Sesión en vivo con Claudia Uribe',
  description: '90 minutos en vivo con Claudia Uribe. Descubre el Método Vórtex aplicado en tiempo real con números y casos reales. Grupo exclusivo y limitado, sin replay ni grabación.',
  keywords: [
    'Clase Oculta',
    'Claudia Uribe',
    'Método Vórtex',
    'Educación Financiera',
    'Finanzas Personales',
    'Inversiones',
    'MIA'
  ],
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://vortex.financieramentecu.co/clase-oculta',
    siteName: 'Moneyflow by MIA',
    title: 'Clase Oculta | Sesión en vivo con Claudia Uribe',
    description: '90 minutos con Claudia Uribe. El Método Vórtex aplicado en vivo desde cero. Máximo 70 personas. Sin grabación.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Clase Oculta por Claudia Uribe' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clase Oculta | Sesión en vivo con Claudia Uribe',
    description: '90 minutos con Claudia Uribe. El Método Vórtex en tiempo real. Sin replay.'
  }
}

export default function ClaseOcultaPage() {
  return <ClaseOcultaClient />
}
