# Tasks: MIA Platform v1

**Change:** `mia-platform-v1`  
**Date:** 2026-04-29  
**Status:** Pending

---

## Fase 0 — Setup del Proyecto

- [ ] **0.1** Crear proyecto Next.js 14 con TypeScript, Tailwind, ESLint, App Router, src-dir
  - Comando: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- [ ] **0.2** Instalar shadcn/ui y configurar
  - Comando: `npx shadcn@latest init` (tema: dark, color: zinc)
  - Agregar componentes: `button card dialog input select tabs toast alert-dialog badge tooltip table`
- [ ] **0.3** Instalar dependencias del proyecto
  - `npm install zustand @tanstack/react-table recharts date-fns`
  - `npm install react-hook-form zod @hookform/resolvers`
  - `npm install @react-pdf/renderer framer-motion`
  - `npm install -D @types/react-pdf`
- [ ] **0.4** Configurar Tailwind con tokens de marca MIA
  - Agregar colores custom en `tailwind.config.ts`: `mia-black`, `mia-cream`, `mia-card`, `mia-blue`, `mia-teal`, `mf-coral`, `mf-orange`, `gain`, `loss`
  - Agregar variables de fuentes: `--font-heading`, `--font-body`
- [ ] **0.5** Crear archivo `.env.example` con variables de analytics
  - `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_CLARITY_ID`
- [ ] **0.6** Copiar assets de marca a `/public`
  - `logo-mf-blanco.png` → `/public/logo-mf-blanco.png`
  - `logo-mf-negro.png` → `/public/logo-mf-negro.png`
  - Key visuals Moneyflow → `/public/key-visuals/`
- [ ] **0.7** Configurar estructura de carpetas base
  - Crear: `src/lib/`, `src/stores/`, `src/types/`, `src/hooks/`

---

## Fase 1 — Tipos TypeScript y Lógica Core

- [ ] **1.1** Definir todos los tipos en `src/types/rentabilidad.ts`
  - `Config`, `Investment`, `Transaction`, `Snapshot`, `InvestmentResult`
  - `UserProfile`, `RegisterInput`, `RentabilidadStoreData`
  - `AnalyticsEvent` (union type de los 9 eventos)
- [ ] **1.2** Implementar XIRR en `src/lib/xirr.ts`
  - Función `xirr(flows: number[], dates: Date[]): number | null`
  - Newton-Raphson: máx 1000 iteraciones, tolerancia 1e-6, seed 0.1
  - Guards: mismo signo, < 2 flujos, fechas iguales
  - Funciones helper: `buildXIRRDimA`, `buildXIRRDimB`, `buildXIRRDimC`
- [ ] **1.3** Implementar helpers financieros en `src/lib/financial-calculations.ts`
  - `computeFlows(transaction, baseCurrency)` → `{ flowLocal, flowUSD, flowLocalAsUSD }`
  - `getLatestSnapshot(snapshots, investmentName)` → Snapshot | null
  - `computeInvestmentResult(inv, txs, snaps, trm)` → InvestmentResult
  - `aggregatePortfolioTotals(results)` → `{ totalInvested, currentValue, gainLoss }`
- [ ] **1.4** Implementar helper de analytics en `src/lib/analytics.ts`
  - `pushEvent(event: AnalyticsEvent, params?)` → void (null-safe, no SSR, no test)
  - Export de tipo `AnalyticsEvent`
- [ ] **1.5** Implementar helper de formato en `src/lib/formatters.ts`
  - `formatCurrency(amount, currency)` → `"$5,000,000 COP"`
  - `formatPercent(decimal)` → `"17.48%"`
  - `formatRelativeTime(isoDate)` → `"hace 3 min"`
- [ ] **1.6** Escribir tests unitarios para XIRR (Vitest)
  - Caso simple 1 año → ~17%
  - Caso flujos mismo signo → null
  - Caso un solo flujo → null
  - Caso fechas iguales → null
  - Caso del PRD con datos reales

---

## Fase 2 — Stores Zustand

- [ ] **2.1** Implementar `src/stores/rentabilidad.store.ts`
  - Estado: `config`, `investments`, `transactions`, `snapshots`, `lastUpdated`
  - Actions CRUD: investments, transactions, snapshots
  - Actions config: `setBaseCurrency`, pillar CRUD, entity CRUD
  - Actions data: `exportData`, `importData`, `clearData`
  - Validación: `addInvestment` verifica nombre único
  - Cascada: `removeInvestment` elimina txs + snapshots relacionados
  - Persist middleware: key `mia-rentabilidad`, serialización ISO de fechas
- [ ] **2.2** Implementar `src/stores/user.store.ts`
  - Estado: `profile: UserProfile | null`, `isRegistered: boolean`
  - Actions: `register(data)`, `updateProfile(updates)`, `clearProfile()`
  - `register()` genera UUID y `registeredAt` automáticamente
  - Persist middleware: key `mia-user`

---

## Fase 3 — Analytics e Infrastructure

- [ ] **3.1** Implementar `src/components/analytics/GoogleTagManager.tsx`
  - Head script con `NEXT_PUBLIC_GTM_ID`
  - Noscript iframe para `<body>`
  - Null-safe si variable no configurada
- [ ] **3.2** Implementar `src/components/analytics/MetaPixel.tsx`
  - Script con `strategy="afterInteractive"`
  - Helpers: `trackMetaEvent(event)`, declaración global `fbq`
- [ ] **3.3** Implementar `src/components/analytics/MicrosoftClarity.tsx`
  - Script Clarity con `strategy="afterInteractive"`
  - Null-safe si `NEXT_PUBLIC_CLARITY_ID` no configurado
- [ ] **3.4** Actualizar `src/app/layout.tsx`
  - Fuentes: Syne (heading) + Inter (body) con `next/font/google`
  - Variables CSS de fuentes en `<html>`
  - `<GoogleTagManager>` en head
  - `<MetaPixel>` + `<MicrosoftClarity>` antes de `</body>`
  - Metadata global: title, description, OG image
- [ ] **3.5** Crear route handler `src/app/api/exchange-rate/route.ts`
  - Cache en memoria (Map) con TTL de 1 hora
  - Fetch a `https://open.er-api.com/v6/latest/USD` con timeout 5s
  - Retorna: `{ rates, updatedAt }`
  - Error 503 si API externa falla

---

## Fase 4 — Registro de Usuario

- [ ] **4.1** Implementar `src/components/auth/UserRegistrationModal.tsx`
  - Modal con `Dialog` de shadcn, no-dismissable (`onInteractOutside={e => e.preventDefault()}`)
  - Logo Moneyflow (blanco) en header coral del modal
  - Campos: nombre (text), email (email), moneda base (Select)
  - Validación Zod: nombre required, email válido, currency required
  - Al submit: `register()` del store + `pushEvent('user_registered')` + `fbq('track', 'Lead')`
  - Sin botón de cierre — el usuario DEBE registrarse
- [ ] **4.2** Implementar `src/hooks/useUser.ts`
  - Retorna: `{ profile, isRegistered, showRegistrationModal }`
  - `showRegistrationModal = !isRegistered`
- [ ] **4.3** Integrar modal en `src/app/calculadoras/rentabilidad/page.tsx`
  - `useUser()` → si `!isRegistered` → render `<UserRegistrationModal />`

---

## Fase 5 — Landing Home

- [ ] **5.1** Implementar `src/components/landing/Navbar.tsx`
  - Logo Moneyflow (negro en light / blanco en dark) — usar dark
  - Links: Home, Calculadoras, Perfil
  - Botón CTA coral: "Calcular rentabilidad" → `/calculadoras/rentabilidad`
  - Hamburger menu en mobile (shadcn Sheet)
  - Muestra nombre de usuario si está registrado
- [ ] **5.2** Implementar `src/components/landing/Hero.tsx`
  - Fondo: `money flow-01.png` como imagen principal (next/image, priority)
  - Overlay dark gradient para legibilidad
  - `motion.div` con `containerVariants` (stagger 0.15s)
  - Headline: `"La arquitectura de tu libertad financiera"` (Syne 800)
  - Subheadline: descripción breve de MIA
  - CTA primario (coral): `pushEvent('cta_hero_click', {cta: 'primary'})`
  - CTA secundario (outlined): `pushEvent('cta_hero_click', {cta: 'secondary'})`
- [ ] **5.3** Implementar `src/components/landing/WhatIsMIA.tsx`
  - 3 cards glassmorphism con íconos (lucide-react)
  - Herramientas financieras gratuitas / Educación práctica / Infoproductos (pronto)
  - `whileInView` + `viewport={{ once: true }}` por card
  - Stagger de 100ms entre cards
- [ ] **5.4** Implementar `src/components/landing/CalculatorCards.tsx`
  - Card activa: "Calculadora de Rentabilidad" — borde coral, botón coral
  - Card coming soon: "Más herramientas" — deshabilitada, opacidad 0.5
  - Estructura: ícono + nombre + descripción + CTA
- [ ] **5.5** Implementar `src/components/landing/SocialProof.tsx`
  - Métricas placeholder: "100+ usuarios calcularon su portafolio"
  - Diseño minimalista con números grandes (Syne)
- [ ] **5.6** Implementar `src/components/landing/Footer.tsx`
  - Logo Moneyflow blanco
  - Links: Home, Calculadoras, Política de privacidad
  - Redes sociales (ícono Instagram: @we.are.mia)
  - Copyright: "© 2026 MIA · Moneyflow"
  - Disclaimer: "Este contenido es educativo y no constituye una recomendación de inversión."
- [ ] **5.7** Ensamblar `src/app/page.tsx`
  - `<Navbar>` + `<Hero>` + `<WhatIsMIA>` + `<CalculatorCards>` + `<SocialProof>` + `<Footer>`
  - Metadata: title, description, OG
- [ ] **5.8** Crear `src/app/calculadoras/page.tsx` — índice de calculadoras
  - Grid similar a CalculatorCards pero más completo

---

## Fase 6 — Calculadora: Infraestructura + Módulo A

- [ ] **6.1** Implementar `src/components/calculadora-rentabilidad/CalculadoraLayout.tsx`
  - `Tabs` de shadcn: [Configuración | Inversiones | Transacciones | Cortes | Resultados]
  - Persistencia del tab activo en URL query param (`?tab=inversiones`)
  - `pushEvent('calculator_started')` al montar (useEffect, solo 1 vez)
  - `fbq('track', 'ViewContent')` al montar
  - Responsive: tabs scrollables horizontalmente en mobile
- [ ] **6.2** Implementar `src/components/calculadora-rentabilidad/EmptyState.tsx`
  - Mensaje de onboarding con 4 pasos: Configura → Agrega inversión → Registra aportes → Agrega corte
  - Botón de acción contextual según tab activo
- [ ] **6.3** Implementar `src/components/calculadora-rentabilidad/ConfigPanel.tsx`
  - Select de moneda base con advertencia al cambiar
  - Lista editable de Pilares (add/edit/delete inline)
  - Lista editable de Entidades (add/edit/delete inline)
  - Validación: nombres únicos, no vacíos
  - Catálogos precargados desde constante en `src/lib/constants.ts`
- [ ] **6.4** Crear `src/lib/constants.ts`
  - `DEFAULT_PILLARS: string[]` — 11 pilares del PRD
  - `DEFAULT_ENTITIES: string[]` — todas las entidades del PRD (~60+)
  - `SUPPORTED_CURRENCIES: string[]` — 40+ monedas del PRD
- [ ] **6.5** Crear `src/app/calculadoras/rentabilidad/page.tsx`
  - `useUser()` → `<UserRegistrationModal>` si no registrado
  - Metadata de la página
  - `<CalculadoraLayout>` con los 5 paneles

---

## Fase 7 — Calculadora: Módulos B, C y D

- [ ] **7.1** Implementar `src/components/calculadora-rentabilidad/InvestmentsPanel.tsx` (Módulo B)
  - TanStack Table con columnas: Pilar, Nombre, Entidad, Moneda, Acciones
  - Sorting por Pilar y Nombre
  - Botón "Agregar inversión" → modal con formulario
  - Formulario: React Hook Form + Zod — campos: pilar (select), nombre (text), entidad (select), moneda (select)
  - Validación: nombre único
  - Edit en modal reutilizable
  - Delete: modal de confirmación con conteo de cascada
  - `pushEvent('investment_added')` al agregar primera inversión
  - Estado vacío: `<EmptyState>`
- [ ] **7.2** Implementar `src/components/calculadora-rentabilidad/TransactionsPanel.tsx` (Módulo C)
  - TanStack Table con columnas completas del PRD (sección 9)
  - Filtro por inversión (select)
  - Sorting por fecha
  - Modal formulario: investmentName (select), date (datepicker), amountLocal (number), trm (number, condicional), note (text)
  - Auto-completar currency y entity desde inversión seleccionada
  - Campos calculados en tiempo real: flowLocal, flowUSD, flowLocalAsUSD (badges read-only)
  - Validación: amountLocal > 0, trm > 0 si aplica
  - `pushEvent('transaction_added')` al agregar primera transacción
  - Estado vacío: `<EmptyState>`
- [ ] **7.3** Implementar `src/components/calculadora-rentabilidad/SnapshotsPanel.tsx` (Módulo D)
  - TanStack Table con columnas: Fecha corte, Inversión, Moneda, Valor Local, Valor USD, TRM corte, USD→Local
  - Badge "Último corte" en el corte más reciente de cada inversión
  - Modal formulario: investmentName (select), cutDate, valueLocal ó valueUSD + trmCut (según moneda)
  - Campo calculado: `valueLocalFromUSD` (badge read-only)
  - Advertencia si cutDate < fecha primera transacción (informativa, no bloqueante)
  - Validación: valores > 0
  - `pushEvent('snapshot_added')` al agregar primer corte
  - Estado vacío: `<EmptyState>`

---

## Fase 8 — Calculadora: Módulo E (Resultados)

- [ ] **8.1** Implementar `src/hooks/useExchangeRate.ts`
  - Fetch a `/api/exchange-rate` al montar
  - Retorna: `{ rate, isLoading, isError, updatedAt }`
  - Selecciona `rates[baseCurrency]` del store
  - Cache en memoria durante la sesión
- [ ] **8.2** Implementar `src/components/calculadora-rentabilidad/TRMBadge.tsx`
  - Muestra: `TRM: $X,XXX COP/USD · Actualizado: hace N min`
  - Indicador de estado: verde (<30min), amarillo (30-60min), rojo (>1h)
  - Si `isError`: muestra input manual + botón confirmar
  - Al confirmar TRM manual: `pushEvent('trm_manual_override', {trm_value})`
- [ ] **8.3** Implementar `src/components/calculadora-rentabilidad/SummaryCards.tsx`
  - 4 cards: Total Invertido / Valor Actual / Ganancia Total / TRM Hoy
  - Ganancia/Pérdida con color semántico (gain/loss)
  - Calculados con `aggregatePortfolioTotals()`
- [ ] **8.4** Implementar `src/components/calculadora-rentabilidad/PortfolioChart.tsx`
  - Recharts `BarChart` o `PieChart` por pilar
  - Agrupa inversiones por pilar y suma valor actual
  - `ResponsiveContainer` para responsive
  - Colores: palette MIA (azul, teal, coral…)
  - Tooltip con valor formateado
- [ ] **8.5** Implementar `src/components/calculadora-rentabilidad/ResultsPanel.tsx`
  - `useMemo` para calcular `InvestmentResult[]` (investments × txs × snaps × trm)
  - TanStack Table con todas las columnas del PRD sección 11.4
  - TIR formateada: `17.48%`; color verde/rojo según signo
  - Celdas vacías: `—` con Tooltip "Agrega un corte para ver resultados"
  - Celdas XIRR null: `N/A` con Tooltip "No se pudo calcular"
  - `<TRMBadge>` prominente en top
  - `<SummaryCards>` encima de la tabla
  - `<PortfolioChart>` debajo de la tabla
  - `<ExportPDFButton>` en esquina superior derecha
  - `pushEvent('results_viewed')` al montar (useEffect, 1 vez)

---

## Fase 9 — PDF Brandeado

- [ ] **9.1** Implementar `src/components/calculadora-rentabilidad/PDFReport.tsx`
  - `Document > Page` A4 con `@react-pdf/renderer`
  - `PDFHeader`: View coral + Image (logo-mf-blanco.png) + título + usuario + fecha
  - `PDFSummary`: texto total invertido, valor actual, ganancia/pérdida, TRM
  - `PDFTable`: columnas Inversión | Pilar | Invertido | Valor | Ganancia | TIR
  - `PDFFooter`: "moneyflow.co · MIA Platform · Reporte generado el DD/MM/YYYY"
  - Formateo de números: `formatCurrency()` y `formatPercent()`
  - TIR null → "N/A"; ganancias positivas en verde, negativas en rojo
- [ ] **9.2** Implementar `src/components/calculadora-rentabilidad/ExportPDFButton.tsx`
  - Import dinámico de `PDFDownloadLink` (lazy, solo client-side)
  - Nombre de archivo: `mia-reporte-YYYY-MM-DD.pdf`
  - Estado de carga: spinner mientras genera
  - Guard: si no hay inversiones con corte → toast "Agrega al menos un corte para generar el reporte"
  - `pushEvent('pdf_downloaded', {investment_count: N})` al click

---

## Fase 10 — Perfil de Usuario

- [ ] **10.1** Implementar `src/app/perfil/page.tsx`
  - Guard: si `!isRegistered` → redirigir a `/`
  - Secciones: Editar perfil | Cambiar moneda base | Exportar datos | Importar datos | Borrar datos
- [ ] **10.2** Sección "Editar Perfil"
  - React Hook Form + Zod para nombre y email
  - Submit: `updateProfile()` + toast de confirmación
- [ ] **10.3** Sección "Cambiar Moneda Base"
  - Select de monedas
  - Al cambiar: `AlertDialog` con advertencia de inconsistencia histórica
  - Confirm: `setBaseCurrency()` + toast
- [ ] **10.4** Sección "Exportar/Importar Datos"
  - Botón "Exportar": `exportData()` → descarga `mia-datos-YYYY-MM-DD.json`
  - Input file "Importar": valida estructura JSON, `AlertDialog` de sobreescritura, `importData()`
  - Toast de error si JSON inválido
- [ ] **10.5** Sección "Borrar Datos"
  - `AlertDialog` con campo de verificación (escribir "CONFIRMAR")
  - Al confirmar: `clearData()` + `clearProfile()` + redirect a `/`

---

## Fase 11 — Polish, Responsive y SEO

- [ ] **11.1** Revisar responsive en todos los módulos (mobile 375px)
  - Tabs de calculadora: scroll horizontal en mobile
  - Tablas: `overflow-x-auto` wrapper
  - Modales: full-width en mobile
  - Hero: layout columna única en mobile
- [ ] **11.2** Revisar metadata SEO en todas las rutas
  - `/` → "MIA | Tu inteligencia financiera en un solo lugar"
  - `/calculadoras/rentabilidad` → "Calculadora de Rentabilidad | MIA"
  - `/perfil` → "Mi perfil | MIA"
  - OG image para compartir en redes (usar key visual)
- [ ] **11.3** Revisar accesibilidad
  - Aria-labels en botones de acción
  - Contraste AA mínimo en colores de texto
  - Tooltips con `Tooltip` de shadcn
- [ ] **11.4** Revisar animaciones
  - `prefers-reduced-motion` — desactivar animaciones si el usuario lo prefiere
- [ ] **11.5** Revisar edge cases de UI
  - Estado vacío en cada módulo muestra `<EmptyState>` correcto
  - Loading states en TRM fetch (skeleton o spinner)
  - Error states explícitos en toda la app

---

## Fase 12 — Build y Verificación Final

- [ ] **12.1** Correr `npm run build` — cero errores TypeScript y Next.js
- [ ] **12.2** Correr `npm run lint` — cero warnings ESLint
- [ ] **12.3** Correr tests unitarios: `npm run test`
  - XIRR: todos los casos pasan
- [ ] **12.4** Verificación manual del flujo completo
  - [ ] Landing carga con animaciones y key visual correcto
  - [ ] Modal de registro aparece al primer acceso a la calculadora
  - [ ] Registro guarda en localStorage y cierra modal
  - [ ] Tab Configuración: cambio de moneda muestra advertencia
  - [ ] Tab Inversiones: CRUD funciona, nombre duplicado falla correctamente
  - [ ] Tab Transacciones: campos calculados se actualizan en tiempo real
  - [ ] Tab Cortes: badge "Último corte" aparece en el corte más reciente
  - [ ] Tab Resultados: TRM se carga, XIRR se calcula, tabla muestra datos
  - [ ] PDF se descarga con logo y datos correctos
  - [ ] Página Perfil: editar, exportar, importar y borrar funcionan
  - [ ] 9 eventos llegan al GTM dataLayer (verificar con GTM Preview)
  - [ ] Responsive 375px: sin scroll horizontal no deseado

---

## Notas de Implementación

> **Orden de dependencias:**
> - Fase 1 (tipos + lib) DEBE completarse antes de Fase 2 (stores)
> - Fase 2 (stores) DEBE completarse antes de Fases 6-10 (componentes)
> - Fase 3 (analytics) puede hacerse en paralelo con Fase 4-5
> - Fases 6-10 pueden hacerse en paralelo dentro de cada fase

> **Assets:**
> - Los logos y key visuals deben estar en `/public` antes de que los componentes los usen

> **Testing:**
> - Los tests unitarios de XIRR son críticos — deben escribirse junto con la implementación (task 1.6)
