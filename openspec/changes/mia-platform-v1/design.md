# Design: MIA Platform v1

**Change:** `mia-platform-v1`  
**Date:** 2026-04-29  
**Status:** Approved

---

## 1. Visión de Arquitectura

```
┌────────────────────────────────────────────────────────────────────┐
│                        Next.js 14 App Router                        │
├─────────────┬──────────────────────────────┬───────────────────────┤
│   /         │  /calculadoras/rentabilidad  │  /perfil              │
│  Landing    │  Calculadora (5 módulos)     │  Perfil + Config      │
├─────────────┴──────────────────────────────┴───────────────────────┤
│                         Component Layer                             │
│  landing/  │  calculadora-rentabilidad/  │  auth/  │  analytics/   │
├────────────────────────────────────────────────────────────────────┤
│                       State Layer (Zustand)                         │
│  useRentabilidadStore()  │  useUserStore()                         │
├────────────────────────────────────────────────────────────────────┤
│                       Persistence Layer                             │
│  localStorage["mia-rentabilidad"]  │  localStorage["mia-user"]     │
├────────────────────────────────────────────────────────────────────┤
│                       Infrastructure                                │
│  /api/exchange-rate   │  GTM dataLayer   │  @react-pdf/renderer    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Sistema de Diseño — Tokens de Marca

### 2.1 Paleta MIA (del Brand Document v4.0)

```typescript
// tailwind.config.ts
colors: {
  // MIA Holding Base
  "mia-black":   "#0A0A0A",   // Fondo universal
  "mia-cream":   "#F5F3EE",   // Texto principal
  "mia-card":    "#1A1A1A",   // Superficies card
  "mia-surface": "#2A2A2A",   // Superficies alternativa
  "mia-border":  "#333333",   // Bordes sutiles
  
  // MIA Institutional
  "mia-blue":    "#5C8BC4",   // Azul MIA institucional
  "mia-teal":    "#3ABFAA",   // Teal MIA acento
  "mia-deep":    "#2D4A6E",   // Azul profundo
  
  // Moneyflow Brand (calculadora / herramientas)
  "mf-coral":    "#F04E37",   // Coral Moneyflow primario
  "mf-orange":   "#FF8C42",   // Naranja cálido (gradiente)
  
  // Semánticos financieros
  "gain":        "#22C55E",   // Ganancia verde
  "loss":        "#EF4444",   // Pérdida rojo
  "neutral":     "#A1A1AA",   // Zinc-400
}
```

**Uso de marca:**
- **Landing MIA:** Paleta dark `mia-black` + `mia-blue` + `mia-teal` (identidad holding)
- **Calculadora Moneyflow:** Acento `mf-coral` sobre fondo dark (herramienta de la marca)
- **PDF:** Header `mf-coral` con logo blanco Moneyflow

### 2.2 Tipografía

```typescript
// app/layout.tsx
import { Inter, Syne } from 'next/font/google'

const syne = Syne({   // Headings premium — presencia, autoridad
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '700', '800'],
})

const inter = Inter({ // Body — legibilidad, financiero
  subsets: ['latin'],
  variable: '--font-body',
})
```

| Elemento | Font | Weight | Size |
|---------|------|--------|------|
| Hero headline | Syne | 800 | `text-5xl`–`text-7xl` |
| Section heading | Syne | 700 | `text-3xl`–`text-4xl` |
| Card title | Syne | 400 | `text-xl` |
| Body / labels | Inter | 400 | `text-base` |
| Montos financieros | Inter | 600 | `text-lg`–`text-2xl` |
| TIR destacada | Inter | 700 | `text-3xl` |

### 2.3 Efectos Visuales

```css
/* Glassmorphism (modales, cards premium) */
.glass {
  background: rgba(26, 26, 26, 0.8);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08);
}

/* Gradiente Moneyflow */
.gradient-mf {
  background: linear-gradient(135deg, #F04E37, #FF8C42);
}

/* Gradiente institucional MIA */
.gradient-mia {
  background: linear-gradient(135deg, #5C8BC4, #3ABFAA);
}

/* Glow coral (hover en botones primarios) */
.glow-coral {
  box-shadow: 0 0 24px rgba(240, 78, 55, 0.4);
}
```

---

## 3. Arquitectura de Componentes

### 3.1 Árbol de Rutas

```
app/
├── layout.tsx              # RootLayout — GTM, Meta Pixel, Clarity, fonts
├── page.tsx                # Landing / Home MIA
├── calculadoras/
│   ├── page.tsx            # Índice de calculadoras
│   └── rentabilidad/
│       └── page.tsx        # Calculadora de Rentabilidad
└── perfil/
    └── page.tsx            # Perfil + Configuración del usuario
```

### 3.2 Árbol de Componentes

```
components/
├── analytics/
│   ├── GoogleTagManager.tsx     # GTM head + noscript body
│   ├── MetaPixel.tsx            # fbq pixel script
│   └── MicrosoftClarity.tsx     # clarity script
│
├── landing/
│   ├── Navbar.tsx               # Logo + nav + botón CTA
│   ├── Hero.tsx                 # Key visual + headline + CTAs animados
│   ├── WhatIsMIA.tsx            # 3-4 cards glassmorphism con íconos
│   ├── CalculatorCards.tsx      # Grid de calculadoras disponibles
│   ├── SocialProof.tsx          # Métricas / testimonios placeholder
│   └── Footer.tsx               # Links + logo + copyright
│
├── calculadora-rentabilidad/
│   ├── CalculadoraLayout.tsx    # Shell con tabs [Config|Inversiones|Trans|Cortes|Resultados]
│   ├── EmptyState.tsx           # Onboarding para estado vacío
│   ├── ConfigPanel.tsx          # Módulo A
│   ├── InvestmentsPanel.tsx     # Módulo B
│   ├── TransactionsPanel.tsx    # Módulo C
│   ├── SnapshotsPanel.tsx       # Módulo D
│   ├── ResultsPanel.tsx         # Módulo E
│   ├── TRMBadge.tsx             # Badge TRM live con estado color
│   ├── SummaryCards.tsx         # 4 cards de resumen en Resultados
│   ├── PortfolioChart.tsx       # Gráfica Recharts por pilar
│   ├── ExportPDFButton.tsx      # Botón de descarga PDF
│   └── PDFReport.tsx            # Template @react-pdf/renderer
│
├── auth/
│   ├── UserRegistrationModal.tsx # Modal glassmorphism — primer acceso
│   └── UserProfileCard.tsx       # Card de usuario en navbar/perfil
│
└── ui/                           # shadcn/ui components (auto-generados)
    ├── button.tsx
    ├── dialog.tsx
    ├── input.tsx
    ├── select.tsx
    ├── tabs.tsx
    ├── toast.tsx
    ├── alert-dialog.tsx
    ├── badge.tsx
    ├── card.tsx
    ├── tooltip.tsx
    └── table.tsx
```

---

## 4. State Management Design

### 4.1 RentabilidadStore (Zustand + localStorage)

```typescript
// stores/rentabilidad.store.ts
interface RentabilidadStore {
  // State
  config: Config
  investments: Investment[]
  transactions: Transaction[]
  snapshots: Snapshot[]
  lastUpdated: string

  // Config actions
  setBaseCurrency: (currency: string) => void
  addPillar: (name: string) => void
  updatePillar: (oldName: string, newName: string) => void
  removePillar: (name: string) => void
  addEntity: (name: string) => void
  removeEntity: (name: string) => void

  // Investment actions
  addInvestment: (inv: Omit<Investment, 'id' | 'createdAt'>) => void
  updateInvestment: (id: string, updates: Partial<Investment>) => void
  removeInvestment: (id: string) => void  // elimina en cascada

  // Transaction actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  removeTransaction: (id: string) => void

  // Snapshot actions
  addSnapshot: (snap: Omit<Snapshot, 'id'>) => void
  updateSnapshot: (id: string, updates: Partial<Snapshot>) => void
  removeSnapshot: (id: string) => void

  // Data actions
  exportData: () => RentabilidadStoreData
  importData: (data: RentabilidadStoreData) => void
  clearData: () => void
}

// Persistencia Zustand:
persist(store, {
  name: 'mia-rentabilidad',
  storage: createJSONStorage(() => localStorage),
  // serialize dates as ISO strings
})
```

### 4.2 UserStore (Zustand + localStorage)

```typescript
// stores/user.store.ts
interface UserStore {
  profile: UserProfile | null
  isRegistered: boolean

  // Actions
  register: (data: RegisterInput) => void
  updateProfile: (updates: Partial<UserProfile>) => void
  clearProfile: () => void
}

// Persistencia:
persist(store, { name: 'mia-user' })
```

### 4.3 Flujo de Datos — Cálculo de Resultados

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ investments  │    │ transactions │    │  snapshots   │
│ (store)      │    │ (store)      │    │  (store)     │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └──────────┬────────┘                   │
                  ▼                            │
         getLatestSnapshot(inv)◄───────────────┘
                  │
                  ▼
         buildXIRRInputs(inv, txs, snap)
         ┌─────────────────────────┐
         │  Dimensión A: COP       │ → xirr(flowsLocal, dates)
         │  Dimensión B: USD       │ → xirr(flowsUSD, dates)
         │  Dimensión C: USD→COP   │ → xirr(flowsLocalAsUSD, dates)
         └─────────────────────────┘
                  │
                  ▼
         InvestmentResult[] ← useMemo([investments, txs, snaps, trm])
                  │
                  ▼
         ResultsPanel (tabla + cards + chart)
```

---

## 5. Diseño de XIRR

### 5.1 Diagrama de Secuencia Newton-Raphson

```
xirr(flows, dates):
  1. Guard: len(flows) < 2 → return null
  2. Guard: all same sign → return null
  3. Guard: all dates equal → return null
  4. rate = 0.1
  5. LOOP i=0..999:
     a. npv = Σ( flows[k] / (1+rate)^((dates[k]-dates[0])/365) )
     b. d_npv = Σ( -flows[k] * (dates[k]-dates[0])/365
                   / (1+rate)^((dates[k]-dates[0])/365 + 1) )
     c. rate_new = rate - npv / d_npv
     d. if |rate_new - rate| < 1e-6 → return rate_new
     e. rate = rate_new
  6. return null  // no convergió
```

### 5.2 Casos de Prueba de Referencia

| Caso | flows | dates | Expected |
|------|-------|-------|----------|
| Simple 1 año | [-5M, 5.85M] | [2024-01-01, 2025-01-01] | ~0.17 (17%) |
| USD ejemplo PRD | [-11.05M, 23.75M] | [2024-01-01, 2025-06-01] | Positivo |
| Mismo signo | [-5M, -1M] | cualquiera | null |
| Un solo flujo | [-5M] | [2024-01-01] | null |

---

## 6. Diseño de TRM Live

### 6.1 Diagrama de Secuencia

```
Cliente                    Next.js Route Handler        ExchangeRate-API
   │                              │                            │
   │── GET /api/exchange-rate ───►│                            │
   │                              │ cache hit?                 │
   │                              │──────────┐                 │
   │                              │          │ YES → return     │
   │                              │◄─────────┘                 │
   │                              │ NO → GET /v6/latest/USD ──►│
   │                              │                            │
   │                              │◄──────── rates JSON ───────│
   │                              │ store in cache (1h)        │
   │◄─── { rates, updatedAt } ───│                            │
   │                              │
   [Si error 503]
   │
   │ Mostrar input manual TRM
   │ pushEvent('trm_manual_override', {trm_value})
```

### 6.2 Cache en Route Handler

```typescript
// app/api/exchange-rate/route.ts
let cache: { rates: Record<string, number>; ts: number } | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hora

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ rates: cache.rates, updatedAt: new Date(cache.ts).toISOString() })
  }
  // fetch + set cache
}
```

---

## 7. Diseño de Analytics

### 7.1 Arquitectura de Tracking

```
Browser
  │
  ├── pushEvent(name, params) → window.dataLayer.push()
  │                                    │
  │                              GTM Container
  │                                    │
  │                    ┌───────────────┼───────────────┐
  │                    ▼               ▼               ▼
  │                 GA4 Tag       Meta Pixel       Clarity Tag
  │               (G4 events)   (fbq custom)     (session rec.)
  │
  ├── fbq('track', event) → Meta Pixel (directo para eventos estándar)
  └── clarity() → Clarity (sesión automática)
```

### 7.2 Función helper

```typescript
// lib/analytics.ts
export function pushEvent(event: AnalyticsEvent, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV === 'test') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event, ...params })
}

export type AnalyticsEvent =
  | 'cta_hero_click'
  | 'calculator_started'
  | 'investment_added'
  | 'transaction_added'
  | 'snapshot_added'
  | 'results_viewed'
  | 'pdf_downloaded'
  | 'user_registered'
  | 'trm_manual_override'
```

---

## 8. Diseño de PDF

### 8.1 Estructura de Componente React-PDF

```typescript
// Paleta PDF
const PDF_COLORS = {
  coral: '#F04E37',
  white: '#FFFFFF',
  dark: '#0A0A0A',
  gray: '#F5F3EE',
  green: '#22C55E',
  red: '#EF4444',
  border: '#E5E7EB',
}

// Secciones:
<Document>
  <Page size="A4" style={styles.page}>
    <PDFHeader user={user} date={today} />      // coral bg + logo blanco
    <PDFSummary totals={portfolioTotals} trm={trm} />
    <PDFTable results={investmentResults} />
    <PDFFooter />                                // "moneyflow.co · MIA Platform"
  </Page>
</Document>
```

---

## 9. Diseño de Landing Home

### 9.1 Animaciones con Framer Motion

```typescript
// Hero — stagger de entrada
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}
```

### 9.2 Scroll Animations

```typescript
// Cards — animación al entrar en viewport
const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5 }
  })
}
// Usar whileInView + viewport={{ once: true }}
```

---

## 10. Decisions de Diseño (ADRs)

| # | Decisión | Alternativa Rechazada | Razón |
|---|---------|----------------------|-------|
| 1 | Zustand + localStorage para estado | Redux, React Context | Ligero, sin boilerplate, persist middleware nativo |
| 2 | `@react-pdf/renderer` client-side | Puppeteer/Chrome en servidor | Sin servidor en v1; funciona 100% en browser |
| 3 | ExchangeRate-API proxy en Next.js route handler | Fetch directo del cliente | Oculta URL externa; permite cambiar fuente sin tocar frontend |
| 4 | XIRR Newton-Raphson propio | librería `xirr` de npm | No hay lib JS confiable para este caso según PRD |
| 5 | Framer Motion para animaciones | GSAP solo | Mejor integración React; GSAP solo para efectos de scroll avanzados |
| 6 | Paleta MIA dark (#0A0A0A base) con accento coral (#F04E37) | Light mode | Coherente con brand identity de Moneyflow |
| 7 | TanStack Table para módulos de datos | tabla HTML manual | Sorting/filtering nativo sin reescribir lógica |
| 8 | Modal de registro no-dismissable | Opcional / skip | Garantiza captura de moneda base necesaria para todos los cálculos |

---

## 11. Variables de Entorno

```bash
# .env.example
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=000000000000
NEXT_PUBLIC_CLARITY_ID=xxxxxxxxxx
```

> **Nota:** Todos son `NEXT_PUBLIC_*` — se exponen al cliente intencionalmente (son IDs de tracking públicos, no secrets).

---

## 12. Estructura de localStorage

```
mia-user                     → UserProfile (registro del usuario)
mia-rentabilidad             → RentabilidadStore completo:
  ├── config
  │   ├── baseCurrency: "COP"
  │   ├── pillars: string[]
  │   ├── entities: string[]
  │   └── currencies: string[]
  ├── investments: Investment[]
  ├── transactions: Transaction[]
  ├── snapshots: Snapshot[]
  └── lastUpdated: ISO string
```
