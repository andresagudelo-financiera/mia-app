# Analytics Tracking Specification

## Purpose

Instrumentación completa de eventos de usuario via Google Tag Manager como orquestador, con GA4, Meta Pixel y Microsoft Clarity como destinos. Permite medir conversión, engagement y comportamiento en toda la plataforma.

## Requirements

### Requirement: Implementación de Scripts de Analytics

El sistema MUST cargar todos los scripts de analytics de forma correcta en Next.js.

- GTM MUST cargarse en `<head>` y `<body>` del root layout (`app/layout.tsx`).
- GTM head script: `<Script>` con `strategy="beforeInteractive"` para el snippet JS.
- GTM body: `<noscript>` con iframe justo después de `<body>`.
- Meta Pixel MUST cargarse con `strategy="afterInteractive"`.
- Microsoft Clarity MUST cargarse con `strategy="afterInteractive"`.
- Todos los IDs MUST leerse desde variables de entorno (`process.env.NEXT_PUBLIC_*`).

#### Scenario: Carga exitosa de GTM en producción

- GIVEN `NEXT_PUBLIC_GTM_ID` está configurado en `.env`
- WHEN el usuario carga cualquier página
- THEN el script de GTM está presente en el `<head>`
- AND el dataLayer está inicializado: `window.dataLayer = window.dataLayer || []`

#### Scenario: Variables de entorno no configuradas

- GIVEN `NEXT_PUBLIC_GTM_ID` no está configurado
- WHEN la aplicación carga
- THEN los scripts de analytics NO se cargan (null-safety)
- AND la aplicación funciona normalmente sin analytics

---

### Requirement: Función pushEvent para dataLayer

El sistema MUST proveer una función helper para enviar eventos al dataLayer.

```typescript
function pushEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event: eventName, ...params })
}
```

- La función MUST ser null-safe (no romper si GTM no está cargado).
- La función MUST estar disponible como importación desde `@/lib/analytics`.

#### Scenario: pushEvent en entorno de servidor

- GIVEN el código corre en SSR (server-side)
- WHEN se llama a `pushEvent('some_event')`
- THEN NO lanza error (null-safety con `typeof window`)

---

### Requirement: 9 Eventos Definidos

El sistema MUST implementar exactamente estos 9 eventos:

| Evento | Trigger | Payload |
|--------|---------|---------|
| `cta_hero_click` | Click en CTA del Hero | `{cta: 'primary' \| 'secondary'}` |
| `calculator_started` | Usuario entra a `/calculadoras/rentabilidad` | `{user_registered: boolean}` |
| `investment_added` | Primera inversión guardada | `{currency: string}` |
| `transaction_added` | Primera transacción guardada | `{currency: string, has_trm: boolean}` |
| `snapshot_added` | Primer corte guardado | `{investment_currency: string}` |
| `results_viewed` | Usuario llega al tab Resultados | `{has_investments: boolean, has_snapshots: boolean}` |
| `pdf_downloaded` | PDF descargado exitosamente | `{investment_count: number}` |
| `user_registered` | Registro inicial completado | `{currency: string}` |
| `trm_manual_override` | Usuario usa TRM manual (API falló) | `{trm_value: number}` |

#### Scenario: Evento cta_hero_click

- GIVEN el usuario está en la landing
- WHEN hace click en el CTA primario del Hero
- THEN `pushEvent('cta_hero_click', {cta: 'primary'})` se ejecuta
- AND el evento aparece en el GTM dataLayer

#### Scenario: Evento calculator_started

- GIVEN el usuario navega a `/calculadoras/rentabilidad`
- WHEN la página monta (useEffect)
- THEN `pushEvent('calculator_started', {user_registered: true})` se ejecuta

#### Scenario: Evento pdf_downloaded

- GIVEN el usuario descarga el PDF
- WHEN la descarga se inicia exitosamente
- THEN `pushEvent('pdf_downloaded', {investment_count: N})` se ejecuta

---

### Requirement: Meta Pixel — Eventos Estándar

El sistema MUST llamar a eventos estándar de Meta Pixel en puntos clave.

- `fbq('track', 'PageView')` MUST llamarse en cada navegación.
- `fbq('track', 'Lead')` MUST llamarse cuando el usuario completa el registro.
- `fbq('track', 'ViewContent')` MUST llamarse cuando el usuario ve la calculadora.

#### Scenario: Lead tracking al registrarse

- GIVEN el usuario completa el formulario de registro
- WHEN se guarda el perfil en localStorage
- THEN `fbq('track', 'Lead')` se llama

---

### Non-Functional Requirements

- **Privacy:** Ningún dato de identificación personal (email, nombre) MUST enviarse a analytics. Solo comportamiento.
- **IDs de configuración:**
  - `NEXT_PUBLIC_GTM_ID` — GTM Container ID (formato `GTM-XXXXXXX`)
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID` — GA4 (formato `G-XXXXXXXXXX`)
  - `NEXT_PUBLIC_META_PIXEL_ID` — Meta Pixel ID (numérico)
  - `NEXT_PUBLIC_CLARITY_ID` — Microsoft Clarity ID (string)
- **Entorno:** Los scripts de analytics MUST deshabilitarse en `NODE_ENV === 'test'`.
