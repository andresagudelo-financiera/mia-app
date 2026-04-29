import type { Metadata } from 'next'
import { Inter, Syne } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '600', '700', '800'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'MIA | Tu inteligencia financiera en un solo lugar',
    template: '%s | MIA by Moneyflow',
  },
  description:
    'MIA es la plataforma de educación e inteligencia financiera de Moneyflow. Calcula la rentabilidad de tus inversiones con herramientas profesionales, gratuitas.',
  keywords: ['finanzas personales', 'inversiones', 'rentabilidad', 'TIR', 'XIRR', 'Moneyflow', 'MIA'],
  authors: [{ name: 'Moneyflow' }],
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://mia.moneyflow.co',
    siteName: 'MIA by Moneyflow',
    title: 'MIA | Tu inteligencia financiera en un solo lugar',
    description: 'Calcula la rentabilidad real de tus inversiones en COP y USD, incluyendo TIR.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'MIA Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MIA by Moneyflow',
    description: 'Tu inteligencia financiera en un solo lugar.',
  },
}

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${syne.variable} ${inter.variable}`} suppressHydrationWarning>
        {/* Google Tag Manager */}
        {GTM_ID && (
          <Script id="gtm-head" strategy="beforeInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
          </Script>
        )}
      <body className="min-h-screen bg-mia-black antialiased">
        {/* GTM noscript */}
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}

        {/* Microsoft Clarity */}
        {CLARITY_ID && (
          <Script id="clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_ID}");`}
          </Script>
        )}
        
        {children}
      </body>
    </html>
  )
}
