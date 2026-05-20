import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Conoce cómo Moneyflow by MIA trata, protege y utiliza tus datos personales dentro de la plataforma.',
}

const sections = [
  {
    title: '1. Responsable del tratamiento',
    body: 'Moneyflow by MIA opera herramientas educativas y simuladores financieros para ayudarte a entender, medir y proyectar decisiones sobre tu dinero. Para cualquier solicitud relacionada con tus datos, puedes contactarnos a través de los canales oficiales de Financieramente Company.',
  },
  {
    title: '2. Datos que podemos recopilar',
    body: 'Podemos recopilar datos de identificación y contacto como nombre, correo electrónico y teléfono; información de uso de la plataforma; respuestas ingresadas en simuladores; resultados calculados; preferencias de moneda; y datos técnicos necesarios para seguridad, analítica y funcionamiento del servicio.',
  },
  {
    title: '3. Finalidades del tratamiento',
    body: 'Usamos tus datos para habilitar el acceso a calculadoras y retos, guardar resultados, generar reportes, mejorar la experiencia, medir uso de herramientas, ofrecer acompañamiento o asesoría gratuita cuando la solicites, enviar contenido educativo y cumplir obligaciones legales o de seguridad.',
  },
  {
    title: '4. Naturaleza educativa de la información',
    body: 'Los simuladores y resultados tienen finalidad educativa e informativa. No constituyen asesoría financiera, legal, tributaria o recomendación individual de inversión. Para decisiones específicas te recomendamos hablar con un asesor autorizado o con un Money Strategist.',
  },
  {
    title: '5. Conservación y seguridad',
    body: 'Conservamos la información durante el tiempo necesario para las finalidades descritas, para mantener trazabilidad de uso y para cumplir obligaciones aplicables. Aplicamos medidas razonables de seguridad técnica, administrativa y organizacional para proteger la información contra acceso no autorizado, pérdida o uso indebido.',
  },
  {
    title: '6. Compartición de información',
    body: 'Podemos usar proveedores tecnológicos para alojamiento, analítica, automatización, comunicaciones y soporte operativo. Estos terceros actúan bajo finalidades relacionadas con el servicio. No vendemos tus datos personales.',
  },
  {
    title: '7. Cookies y analítica',
    body: 'La plataforma puede usar cookies, etiquetas o herramientas de analítica para entender uso, mejorar rendimiento, medir conversiones y optimizar contenido. Puedes gestionar algunas preferencias desde tu navegador.',
  },
  {
    title: '8. Tus derechos',
    body: 'Puedes solicitar acceso, actualización, corrección, eliminación, revocatoria de autorización o información sobre el uso de tus datos, según la normativa aplicable. Para ejercer estos derechos, contáctanos por los canales oficiales indicados en esta página.',
  },
  {
    title: '9. Cambios a esta política',
    body: 'Podemos actualizar esta política para reflejar cambios operativos, legales o tecnológicos. La versión vigente estará disponible en esta misma ruta.',
  },
]

export default function PrivacyPage() {
  return (
    <>
      <Navbar variant="user" />
      <main className="min-h-screen bg-mia-black pt-24 text-mia-cream">
        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-8 rounded-[2rem] border border-mia-border bg-mia-card/70 p-6 shadow-2xl shadow-mf-coral/5 md:p-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-mf-coral">Moneyflow by MIA</p>
            <h1 className="font-heading text-4xl font-bold leading-tight sm:text-5xl">Política de privacidad</h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral sm:text-base">
              Esta política explica cómo tratamos la información personal que nos compartes al usar calculadoras, retos, reportes y canales de asesoría de la plataforma.
            </p>
            <p className="mt-4 text-xs font-semibold text-neutral/80">Última actualización: 19 de mayo de 2026</p>
          </div>

          <div className="grid gap-5">
            {sections.map(section => (
              <article key={section.title} className="rounded-3xl border border-mia-border bg-mia-surface/30 p-5 md:p-6">
                <h2 className="font-heading text-xl font-bold text-mia-cream">{section.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-neutral md:text-base">{section.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-mf-coral/25 bg-mf-coral/10 p-5 md:p-6">
            <h2 className="font-heading text-xl font-bold text-mia-cream">Canales oficiales</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a href="https://financieramentecompany.com/" target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-mf-coral/30 bg-mia-black/20 px-4 py-3 text-sm font-bold text-mf-coral transition hover:bg-mf-coral/10">
                Asesoría gratuita
              </a>
              <a href="https://www.instagram.com/estaempresaesmia/" target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-pink-400/30 bg-mia-black/20 px-4 py-3 text-sm font-bold text-pink-300 transition hover:bg-pink-400/10">
                Instagram @estaempresaesmia
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
