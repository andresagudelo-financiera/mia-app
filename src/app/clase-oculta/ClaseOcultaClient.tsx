'use client'

import { useState } from 'react'
import Image from 'next/image'

const HOTMART_LINK = 'https://pay.hotmart.com/S106005132C?off=dplwat15'
const HOTMART_EMBED = 'https://pay.hotmart.com/S106005132C?off=dplwat15&embed=1'
const CUPOS = 'X'

function CTAButton({
  label = 'Quiero mi cupo — $89.99 →',
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  label?: string
  variant?: 'primary' | 'white'
  size?: 'md' | 'lg'
  className?: string
}) {
  const base =
    'inline-block font-semibold rounded-2xl shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl'
  const variants = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white',
    white: 'bg-white hover:bg-orange-50 text-orange-600',
  }
  const sizes = {
    md: 'text-base px-7 py-3.5',
    lg: 'text-lg px-10 py-5',
  }
  return (
    <a
      href={HOTMART_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {label}
    </a>
  )
}

// Tipografía de sección: Syne en el título + subtítulo liviano en Inter
function SectionHeading({
  label,
  title,
  titleHighlight,
  subtitle,
  center = true,
  light = false,
}: {
  label?: string
  title: string
  titleHighlight?: string
  subtitle?: string
  center?: boolean
  light?: boolean
}) {
  return (
    <div className={`mb-10 ${center ? 'text-center' : ''}`}>
      {label && (
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] mb-3 ${light ? 'text-orange-300' : 'text-orange-500'}`}>
          {label}
        </p>
      )}
      <h2
        className={`text-4xl md:text-5xl font-bold leading-tight mb-3 ${light ? 'text-white' : 'text-stone-900'}`}
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {title}{' '}
        {titleHighlight && (
          <span className={light ? 'text-orange-400' : 'text-orange-500'}>{titleHighlight}</span>
        )}
      </h2>
      {subtitle && (
        <p className={`text-lg font-normal leading-relaxed max-w-2xl ${center ? 'mx-auto' : ''} ${light ? 'text-stone-400' : 'text-stone-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

const faqItems = [
  {
    q: '¿Cuándo es la sesión?',
    a: 'La fecha se confirma por email después de tu registro. Recibes el enlace de acceso con anticipación.',
  },
  {
    q: '¿Cuándo recibo el acceso a Financieramente?',
    a: 'Inmediatamente después de la compra. Tu año empieza desde el momento en que confirmas el pago.',
  },
  {
    q: '¿Qué necesito para entrar a la sesión?',
    a: 'Solo conexión a internet. La sesión es por videollamada — sin instalar nada.',
  },
  {
    q: '¿Puedo acceder desde cualquier país?',
    a: 'Sí. Funciona desde cualquier lugar del mundo hispanohablante.',
  },
  {
    q: '¿Y si no puedo asistir en la fecha confirmada?',
    a: 'El acceso a Financieramente es inmediato y lo tienes durante un año completo. La sesión en vivo no tiene replay — si no puedes asistir, el cupo no se transfiere. Por eso confirmamos la fecha antes de que pagues.',
  },
  {
    q: '¿Hay algo que me van a vender dentro de la sesión?',
    a: 'No. Los 90 minutos son de trabajo real. No hay pitch, no hay upsell, no hay oferta al final.',
  },
  {
    q: '¿La anualidad de Financieramente se renueva automáticamente?',
    a: 'No. Es un año completo sin renovación automática. Al vencer, decides si continúas.',
  },
  {
    q: '¿Qué pasa si no me gusta Financieramente?',
    a: 'La plataforma está diseñada para quien empieza desde cero. Si en los primeros 7 días sientes que no es para ti, escríbenos y revisamos tu caso.',
  },
]

const valueRows = [
  { item: 'Clase Oculta — sesión en vivo con Claudia', value: '$500 USD' },
  { item: 'Financieramente — plan anual completo', value: '$120 USD' },
  { item: 'Rifa libro autografiado', value: 'Exclusivo' },
  { item: 'Rifa grupo privado con Claudia', value: 'Exclusivo' },
  { item: 'Sorpresa de bienvenida', value: 'Sorpresa' },
]

export default function ClaseOcultaClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-orange-50 text-stone-900">

      {/* BARRA SUPERIOR FIJA */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-400 text-stone-900 py-2.5 px-4 shadow-md text-center">
        <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>
          ⚡ Quedan <strong>{CUPOS} cupos</strong> &nbsp;·&nbsp; Valor total $620 USD &nbsp;·&nbsp; Hoy solo <strong>$89.99</strong>
        </p>
      </div>

      <div className="pt-10">

        {/* ─────────────────────────────────
            SECCIÓN 1 — HERO
        ───────────────────────────────── */}
        <section className="bg-white pt-16 pb-14 px-4">
          <div className="max-w-2xl mx-auto text-center">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-700 text-xs font-semibold uppercase tracking-[0.18em] px-4 py-2 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
              Sesión en vivo &nbsp;·&nbsp; Cupos limitados &nbsp;·&nbsp; Sin grabación
            </div>

            {/* Título principal */}
            <h1
              className="text-6xl md:text-7xl font-bold leading-tight text-stone-900 mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Clase <span className="text-orange-500">Oculta</span>
            </h1>

            <p className="text-2xl md:text-3xl font-normal text-stone-500 leading-snug mb-3"
              style={{ fontFamily: 'var(--font-body)' }}>
              90 minutos con Claudia Uribe en vivo
            </p>

            <p className="text-xl font-semibold text-orange-500 mb-8"
              style={{ fontFamily: 'var(--font-body)' }}>
              + Un año completo de Financieramente, gratis
            </p>

            <p className="text-stone-500 text-base md:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
              La sesión privada donde Claudia muestra el Método Vórtex en tiempo real — con números reales, casos reales y preguntas directas. Incluye un año de Financieramente para aplicarlo desde el día siguiente.
            </p>

            <CTAButton label="Quiero mi cupo — $89.99 →" size="lg" />

            <div className="mt-6 inline-flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-stone-400">
              <span>Clase Oculta <strong className="text-stone-600">$500</strong></span>
              <span>+</span>
              <span>Financieramente <strong className="text-stone-600">$120</strong></span>
              <span>=</span>
              <span>Total real <strong className="text-stone-600">$620</strong></span>
              <span>·</span>
              <span>Hoy <strong className="text-orange-500">$89.99</strong></span>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────
            PASARELA HOTMART — AL TOPE
        ───────────────────────────────── */}
        <section className="bg-orange-50 py-14 px-4">
          <div className="max-w-3xl mx-auto">
            <SectionHeading
              label="Registro"
              title="Asegura tu cupo"
              titleHighlight="ahora"
              subtitle="Completa tu pago directamente aquí. Pago único, sin suscripción."
            />

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-100">
              <iframe
                src={HOTMART_EMBED}
                title="Checkout Clase Oculta"
                width="100%"
                height="680"
                className="w-full border-0"
                allow="payment"
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation"
              />
            </div>

            <p className="text-stone-400 text-xs text-center mt-4">
              Pago procesado de forma segura por Hotmart &nbsp;·&nbsp; Si el formulario no carga,{' '}
              <a href={HOTMART_LINK} target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">
                haz clic aquí
              </a>
            </p>
          </div>
        </section>

        {/* IMAGEN PRINCIPAL */}
        <section className="bg-orange-100 py-8 px-4">
          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-xl">
            <Image
              src="/claudia/evento-grupo.png"
              alt="Claudia Uribe dando conferencia rodeada de personas"
              width={1200}
              height={600}
              className="w-full h-auto object-cover"
              priority
            />
          </div>
        </section>

        {/* ─────────────────────────────────
            SECCIÓN 2 — STACK DE VALOR
        ───────────────────────────────── */}
        <section className="bg-white py-16 px-4">
          <div className="max-w-3xl mx-auto">

            <SectionHeading
              label="Lo que recibes"
              title="Todo esto por"
              titleHighlight="$89.99"
              subtitle="Un solo pago. Sin suscripciones. Sin condiciones."
            />

            {/* Oferta principal */}
            <div className="border-2 border-orange-400 bg-orange-50 rounded-2xl p-7 mb-6">
              <p className="text-xs font-bold text-orange-500 uppercase tracking-[0.15em] mb-2">🔴 Oferta principal</p>
              <h3
                className="text-2xl font-bold text-stone-900 mb-1"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Clase Oculta con Claudia Uribe
              </h3>
              <p className="text-orange-500 font-medium text-sm mb-3">Valor real: $500 USD</p>
              <p className="text-stone-600 leading-relaxed text-sm">
                Una sesión en vivo, cupos limitados, donde Claudia abre la pantalla y muestra el Método Vórtex con casos y números reales. Puedes hacer preguntas directamente. No hay grabación. No hay replay. Cuando termina, desaparece.
              </p>
              <p className="text-stone-800 font-semibold mt-3 text-sm">No es un webinar. No es un curso. Es Claudia — en vivo, contigo.</p>
            </div>

            {/* Bonos — grid 2 columnas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {[
                {
                  label: '🎁 Regalo incluido',
                  title: 'Financieramente · Plan anual',
                  value: 'Valor real: $120 USD',
                  desc: 'Un año completo: las 4 cuentas, seguimiento diario, proyección de metas y guías de inversión. Lo que aprendas en la Clase Oculta, lo aplicas desde el día siguiente.',
                },
                {
                  label: '🎁 Bono 2',
                  title: 'Rifa: Libro autografiado',
                  value: 'Valor: Exclusivo',
                  desc: 'El libro donde Claudia cuenta cómo construyó el Método Vórtex. Firmado por ella, con dedicatoria personal. Un ganador al cierre del registro.',
                },
                {
                  label: '🎁 Bono 3',
                  title: 'Rifa: Grupo privado con Claudia',
                  value: 'Valor: Exclusivo',
                  desc: 'Acceso a un espacio cerrado donde Claudia acompaña la implementación de las 4 cuentas en vivo. Un ganador al cierre del registro.',
                },
                {
                  label: '🎁 Bono 4',
                  title: 'Sorpresa de bienvenida',
                  value: 'Se revela después de la compra',
                  desc: 'Al confirmar tu compra recibirás algo que no está anunciado en ningún lado. Solo lo saben quienes ya entraron.',
                },
              ].map((b) => (
                <div key={b.title} className="border border-orange-200 bg-orange-50 rounded-2xl p-6">
                  <p className="text-xs font-bold text-amber-500 uppercase tracking-[0.15em] mb-1">{b.label}</p>
                  <h3
                    className="text-lg font-bold text-stone-900 mb-0.5"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {b.title}
                  </h3>
                  <p className="text-amber-500 text-xs font-medium mb-3">{b.value}</p>
                  <p className="text-stone-600 text-sm leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>

            {/* Tabla resumen */}
            <div className="bg-stone-900 text-white rounded-2xl overflow-hidden shadow-xl mb-8">
              <div className="p-6 pb-2">
                <p
                  className="text-xl font-bold text-orange-400 text-center mb-5"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Resumen de valor
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {valueRows.map(({ item, value }) => (
                      <tr key={item} className="border-b border-stone-700">
                        <td className="py-3 pr-4 text-stone-300">{item}</td>
                        <td className="py-3 text-right font-semibold text-orange-300 whitespace-nowrap">{value}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-stone-600">
                      <td className="py-3 font-bold text-white">VALOR TOTAL</td>
                      <td className="py-3 text-right font-bold text-orange-400">$620 USD</td>
                    </tr>
                    <tr>
                      <td className="pt-4 pb-5 font-bold text-lg text-white">Tu inversión hoy</td>
                      <td className="pt-4 pb-5 text-right font-bold text-3xl text-orange-400">$89.99</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-5 text-center border-t border-stone-800">
                <CTAButton label="Quiero todo esto por $89.99 →" variant="white" size="md" />
              </div>
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────
            SECCIÓN 3 — PARA QUIÉN ES
        ───────────────────────────────── */}
        <section className="bg-orange-50 py-16 px-4">
          <div className="max-w-3xl mx-auto">

            <SectionHeading
              label="Ideal para ti"
              title="¿Esta sesión es"
              titleHighlight="para ti?"
              subtitle="Si te identificas con alguno de estos puntos, la respuesta es sí."
            />

            <div className="space-y-3 mb-10">
              {[
                'Ganas dinero — pero al final del mes no sabes exactamente a dónde fue',
                'Has oído hablar de inversiones, CDTs, ETFs — y sigues sin dar el primer paso porque no sabes por dónde empezar',
                'Tienes algo ahorrado pero no tienes claro si lo estás usando bien',
                'Has intentado organizarte con apps o presupuestos y los abandonas antes de los 15 días',
                'Quieres que alguien que sepa te explique exactamente qué hacer con tu plata — sin jerga, sin cursos de 40 horas, sin rodeos',
                'Llevas tiempo diciéndote que te organizas "el próximo mes" — y el próximo mes llega igual',
              ].map((text) => (
                <div key={text} className="flex items-start gap-3 bg-white rounded-xl px-5 py-4 shadow-sm">
                  <span className="text-orange-500 font-bold text-base leading-none mt-1">✓</span>
                  <p className="text-stone-700 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <h3
              className="text-2xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Esto <span className="text-stone-400">NO</span> es para ti si:
            </h3>
            <div className="space-y-3 mb-10">
              {[
                'Buscas contenido grabado que puedes ver cuando quieras',
                'Quieres asesoría privada uno a uno (para eso existe la Revisión de Portafolio a $5,000 USD)',
                'No tienes intención de aplicar lo que aprendas',
              ].map((text) => (
                <div key={text} className="flex items-start gap-3 bg-stone-100 rounded-xl px-5 py-4">
                  <span className="text-stone-400 font-bold text-base leading-none mt-1">✗</span>
                  <p className="text-stone-500 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <div className="text-center">
              <CTAButton label="Sí, me identifico — quiero mi cupo →" size="lg" />
              <p className="text-stone-400 text-xs mt-3">Pago único · $89.99 · Cupos limitados</p>
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────
            SECCIÓN 4 — POR QUÉ SE LLAMA CLASE OCULTA
        ───────────────────────────────── */}
        <section className="bg-white py-16 px-4">
          <div className="max-w-3xl mx-auto">

            <SectionHeading
              label="La sesión"
              title="¿Por qué se llama"
              titleHighlight="Clase Oculta?"
              subtitle="Porque no está anunciada en ningún lado. No aparece en las redes. Existe para un grupo pequeño, en un momento específico, y luego desaparece."
            />

            <h3
              className="text-2xl font-bold mb-5"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Lo que ocurre en los <span className="text-orange-500">90 minutos</span>
            </h3>
            <div className="space-y-4 mb-10">
              {[
                {
                  icon: '🖥️',
                  title: 'La plataforma en vivo — Financieramente abierta en pantalla',
                  desc: 'Claudia comparte su pantalla y muestra la herramienta funcionando con números reales: el dashboard de las 4 cuentas, cómo se registra un ingreso variable, cómo se proyecta una meta. No capturas. No presentación. La herramienta abierta en tiempo real.',
                },
                {
                  icon: '🎯',
                  title: 'El Vórtex aplicado a casos reales',
                  desc: 'Claudia toma una situación financiera real y muestra cómo se estructura con el Método Vórtex desde cero: qué va a cada cuenta, en qué porcentaje, con qué vehículo de inversión. Ves cómo se toman las decisiones — no solo el resultado.',
                },
                {
                  icon: '💬',
                  title: 'Preguntas directas. Sin intermediario.',
                  desc: 'El grupo es pequeño a propósito. Puedes preguntar sobre tu situación. No hay asistente respondiendo por Claudia.',
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 bg-orange-50 rounded-xl p-6">
                  <span className="text-3xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <h4
                      className="font-bold text-stone-900 mb-1"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {item.title}
                    </h4>
                    <p className="text-stone-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <CTAButton label="Reservar mi lugar en la Clase Oculta →" size="lg" />
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────
            SECCIÓN 5 — FINANCIERAMENTE POR DENTRO
        ───────────────────────────────── */}
        <section className="bg-orange-50 py-16 px-4">
          <div className="max-w-3xl mx-auto">

            <SectionHeading
              label="Tu regalo"
              title="Un año completo de"
              titleHighlight="Financieramente"
              subtitle="La plataforma donde aplicas todo lo que aprendiste — con tus números, desde el día siguiente."
            />

            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {[
                {
                  icon: '📚',
                  title: 'El Método Vórtex completo',
                  desc: 'Las 4 cuentas paso a paso: cuánto va a cada una según tus ingresos, en qué vehículos financieros invertir según tu perfil.',
                },
                {
                  icon: '🛠️',
                  title: 'Herramienta de seguimiento diario',
                  desc: 'Registra ingresos y gastos. El sistema te muestra en tiempo real cómo va creciendo tu capital con base al Vórtex.',
                },
                {
                  icon: '🎯',
                  title: 'Proyección de metas financieras',
                  desc: '¿Cuándo puedes comprar ese apartamento? ¿En cuánto tiempo construyes tu fondo de emergencias? La plataforma te lo muestra con tus datos.',
                },
                {
                  icon: '📖',
                  title: 'Guías de vehículos financieros',
                  desc: 'CDTs, fondos, acciones, ETFs — explicados en lenguaje humano. Sin jerga. Con criterios claros.',
                },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-6 shadow-sm">
                  <span className="text-3xl block mb-3">{item.icon}</span>
                  <h4
                    className="font-bold text-stone-900 mb-2"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {item.title}
                  </h4>
                  <p className="text-stone-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-stone-400 text-sm mb-8">Todo desde tu celular o computador. Sin instalar nada.</p>

            <div className="text-center">
              <CTAButton label="Quiero la Clase Oculta + Financieramente →" size="lg" />
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────
            SECCIÓN 6 — SIN GRABACIÓN
        ───────────────────────────────── */}
        <section className="bg-stone-900 text-white py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400 mb-3">Por qué funciona</p>
            <h2
              className="text-4xl md:text-5xl font-bold leading-tight text-white mb-3"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              La sesión no se graba
            </h2>
            <p className="text-xl font-normal text-orange-400 mb-8">Deliberadamente.</p>
            <p className="text-stone-400 text-lg leading-relaxed mb-4">
              Cuando una sesión se graba, todo cambia. El grupo se dispersa, las preguntas se vuelven más cautelosas, y Claudia ya no puede hablar con la misma libertad sobre dinero real.
            </p>
            <p className="text-stone-400 text-lg leading-relaxed mb-8">
              La Clase Oculta funciona porque es un espacio cerrado. Lo que se comparte ahí existe en ese momento y para quienes estuvieron presentes.
            </p>
            <p className="text-orange-400 font-medium text-xl">
              Por eso vale $500. Y por eso te la estamos dando hoy por $89.99 junto con un año de Financieramente.
            </p>
          </div>
        </section>

        {/* ─────────────────────────────────
            SECCIÓN 7 — ESCASEZ
        ───────────────────────────────── */}
        <section className="bg-orange-500 text-white py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-200 mb-3">Disponibilidad</p>
            <h2
              className="text-4xl md:text-5xl font-bold leading-tight text-white mb-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Cupos limitados
            </h2>
            <p className="text-xl font-normal text-orange-100 mb-8">Sin excepciones.</p>
            <p className="text-orange-100 text-lg leading-relaxed mb-4">
              No es un webinar con 2,000 personas donde nadie te ve. Son <strong className="text-white">70 personas</strong> — el número que permite que el grupo sea real y que las preguntas sean posibles.
            </p>
            <p className="text-orange-100 text-lg leading-relaxed mb-8">
              Cuando los 70 cupos se llenen, el registro cierra. No hay lista de espera. No hay próxima oferta con este precio.
            </p>
            <p
              className="text-white font-bold text-2xl mb-10"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Quedan <span className="text-yellow-300">{CUPOS} cupos</span> disponibles
            </p>
            <CTAButton label="Reservar mi cupo — $89.99 →" variant="white" size="lg" />
          </div>
        </section>

        {/* ─────────────────────────────────
            SECCIÓN 8 — SOBRE CLAUDIA
        ───────────────────────────────── */}
        <section className="bg-white py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <SectionHeading
              label="La creadora del Método Vórtex"
              title="Quién es"
              titleHighlight="Claudia Uribe"
            />
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <Image
                  src="/claudia/claudia-nueva.jpg"
                  alt="Claudia Uribe"
                  width={220}
                  height={280}
                  className="rounded-2xl object-cover shadow-lg border-4 border-orange-100 w-44 h-56 sm:w-52 sm:h-64"
                />
              </div>
              <div>
                <p className="text-stone-600 leading-relaxed mb-4">
                  Claudia Uribe es fundadora de MIA y creadora del Método Vórtex — una arquitectura financiera que organiza el dinero desde el momento en que llega, sin depender de fuerza de voluntad ni de conocimiento previo de inversiones.
                </p>
                <p className="text-stone-600 leading-relaxed mb-4">
                  Construyó el método desde su propia experiencia: ejecutiva en Londres que por fuera tenía todo y por dentro contaba las monedas del bus. Lo que no encontró en libros ni cursos, lo construyó ella misma.
                </p>
                <p className="text-stone-700 font-medium">
                  La Clase Oculta es uno de los pocos espacios donde puedes hacerle preguntas directamente — sin agenda, sin productos que vender, sin script.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────
            SECCIÓN 9 — PREGUNTAS FRECUENTES
        ───────────────────────────────── */}
        <section className="bg-orange-50 py-16 px-4">
          <div className="max-w-3xl mx-auto">

            <SectionHeading
              label="Resolvemos tus dudas"
              title="Preguntas"
              titleHighlight="frecuentes"
            />

            <div className="space-y-3 mb-10">
              {faqItems.map(({ q, a }, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex justify-between items-center px-6 py-5 text-left"
                  >
                    <span
                      className="font-semibold text-stone-900 text-sm pr-4"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {q}
                    </span>
                    <span className={`text-orange-500 font-bold text-sm transition-transform duration-200 flex-shrink-0 ${openFaq === i ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 text-stone-600 text-sm leading-relaxed border-t border-orange-100">
                      <p className="pt-4">{a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center">
              <CTAButton label="Ya no tengo dudas — quiero entrar →" size="lg" />
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────
            CTA FINAL
        ───────────────────────────────── */}
        <section className="bg-stone-900 text-white py-20 px-4">
          <div className="max-w-2xl mx-auto text-center">

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400 mb-4">Última oportunidad</p>

            <h2
              className="text-5xl md:text-6xl font-bold leading-tight text-white mb-3"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              $620 en valor real
            </h2>
            <p className="text-3xl font-normal text-orange-400 mb-8">Por solo $89.99 hoy</p>

            <p className="text-stone-400 text-lg leading-relaxed mb-4">
              La Clase Oculta sola vale $500. El año de Financieramente vale $120. Los estás llevando juntos por $89.99.
            </p>
            <p className="text-stone-400 text-lg leading-relaxed mb-4">
              No hay forma de comprar solo la sesión más barata. No hay forma de acceder a Financieramente por menos del año completo. Y no hay otra fecha anunciada para la Clase Oculta.
            </p>
            <p className="text-orange-400 font-medium text-xl mb-10">
              Solo quedan {CUPOS} cupos. Cuando se llenen, esta oferta cierra.
            </p>

            <CTAButton label="Quiero los $620 por $89.99 →" size="lg" />

            <p className="text-stone-600 text-sm mt-8">
              Clase Oculta $500 + Financieramente anual $120 + Bonos exclusivos &nbsp;·&nbsp; Todo por $89.99 &nbsp;·&nbsp; Pago único
            </p>

          </div>
        </section>

        {/* PIE DE PÁGINA */}
        <footer className="bg-stone-950 text-stone-500 py-8 px-4 text-center text-sm">
          <p className="mb-3">© MIA · Claudia Uribe · Todos los derechos reservados</p>
          <div className="flex justify-center gap-6 flex-wrap">
            <a href="/terminos" className="hover:text-orange-400 transition-colors">Términos y condiciones</a>
            <a href="/privacidad" className="hover:text-orange-400 transition-colors">Política de privacidad</a>
            <a href="mailto:hola@financieramentecu.co" className="hover:text-orange-400 transition-colors">Contacto</a>
          </div>
        </footer>

      </div>

      {/* BARRA FLOTANTE MÓVIL */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-orange-200 px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <div>
          <p className="font-bold text-stone-900 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Clase Oculta · $89.99</p>
          <p className="text-stone-400 text-xs">Solo {CUPOS} cupos disponibles</p>
        </div>
        <a
          href={HOTMART_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-md transition-colors flex-shrink-0"
        >
          Reservar →
        </a>
      </div>

    </div>
  )
}
