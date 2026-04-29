# MIA Platform — Product Requirements Document

**Versión:** 1.0  
**Fecha:** 2026-04-29  
**Alcance actual:** Landing home + Calculadora de Rentabilidad  
**Visión futura:** Plataforma completa de educación financiera e infoproductos

---

## 1. Visión del producto

MIA es una plataforma de educación e inteligencia financiera personal. Combina contenido educativo, herramientas de análisis (calculadoras) e infoproductos en un solo ecosistema digital.

### Pilares del producto

| Pilar | Descripción | Estado |
|-------|-------------|--------|
| **Landing / Home** | Presenta MIA, su propuesta de valor y acceso a herramientas | **v1 — en scope** |
| **Calculadoras** | Herramientas financieras interactivas como lead magnets | **v1 — Rentabilidad en scope** |
| **Marketplace** | Infoproductos: cursos, guías, plantillas | Futuro |
| **Dashboard MIA** | Panel de control personal integrado | Futuro |

### Principio de arquitectura

Cada calculadora vive en su propia ruta. Esto permite:
- Agregar calculadoras nuevas sin tocar las existentes
- SEO individual por herramienta
- Analítica granular por calculadora
- Eventual paywall o acceso diferenciado por producto

---

## 2. Stack tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Framework | Next.js 14+ (App Router) | SSR, rutas dinámicas, SEO |
| Lenguaje | TypeScript | Tipado estricto para lógica financiera |
| Estilos | Tailwind CSS | Velocidad de desarrollo, consistencia |
| UI Components | shadcn/ui | Componentes accesibles y personalizables |
| Estado | Zustand | Estado global ligero (config, calculadora) |
| Persistencia local | localStorage (v1) | Sin backend en v1; datos del usuario persisten en browser |
| Tipo de cambio | ExchangeRate-API (free tier) | API pública, sin auth requerida en free |
| Cálculo XIRR | Implementación propia Newton-Raphson | No hay lib JS confiable; lógica crítica |
| Formularios | React Hook Form + Zod | Validación declarativa |
| Tablas/Datos | TanStack Table | Sorting, filtering nativo |
| Gráficas | Recharts | Ligero, compatible con React |
| Fechas | date-fns | Manejo de fechas sin Moment.js |

---

## 3. Estructura de rutas

```
/                          → Landing home (MIA)
/calculadoras              → Índice de calculadoras disponibles
/calculadoras/rentabilidad → Calculadora de Rentabilidad (v1)
/calculadoras/[slug]       → Futuras calculadoras
```

Cada ruta de calculadora es completamente independiente. Comparten layout pero no estado.

---

## 4. Estructura de carpetas (Next.js App Router)

```
src/
├── app/
│   ├── layout.tsx                     # Root layout (fuentes, metadata global)
│   ├── page.tsx                       # Landing home
│   ├── calculadoras/
│   │   ├── page.tsx                   # Índice de calculadoras
│   │   └── rentabilidad/
│   │       └── page.tsx               # Calculadora de Rentabilidad
│
├── components/
│   ├── landing/                       # Componentes exclusivos del home
│   │   ├── Hero.tsx
│   │   ├── WhatIsMIA.tsx
│   │   ├── CalculatorCard.tsx
│   │   └── Footer.tsx
│   └── calculadora-rentabilidad/      # Componentes de la calculadora
│       ├── ConfigPanel.tsx
│       ├── InvestmentForm.tsx
│       ├── TransactionForm.tsx
│       ├── SnapshotForm.tsx
│       ├── ResultsTable.tsx
│       ├── ResultsChart.tsx
│       └── TRMBadge.tsx
│
├── lib/
│   ├── xirr.ts                        # Implementación XIRR (Newton-Raphson)
│   ├── exchange-rate.ts               # Fetcher TRM con cache
│   └── financial-calculations.ts     # Funciones puras de cálculo
│
├── stores/
│   └── rentabilidad.store.ts          # Zustand store para la calculadora
│
├── types/
│   └── rentabilidad.ts                # Tipos TypeScript
│
└── hooks/
    ├── useExchangeRate.ts             # Hook para TRM actualizado
    └── useXIRR.ts                     # Hook que expone TIR calculada
```

---

## 5. Página: Landing Home (`/`)

### Objetivo

Comunicar qué es MIA, generar confianza y dirigir al usuario hacia las calculadoras como primer punto de entrada al ecosistema.

### Secciones

#### 5.1 Hero

- **Headline principal:** Propuesta de valor de MIA en una frase (ej. "Tu inteligencia financiera, en un solo lugar")
- **Subheadline:** 1-2 líneas explicando qué hace la plataforma
- **CTA primario:** Botón → `/calculadoras/rentabilidad` ("Calcular mi rentabilidad")
- **CTA secundario:** Enlace → `/calculadoras` ("Ver todas las herramientas")
- Imagen o ilustración de contexto financiero

#### 5.2 ¿Qué es MIA?

- Explicación de los pilares en cards visuales:
  - Herramientas financieras gratuitas
  - Educación práctica
  - Infoproductos (próximamente)
- No más de 3-4 cards

#### 5.3 Calculadoras disponibles (Lead Magnets)

- Grid de cards, una por calculadora disponible
- Card incluye: nombre, descripción breve, ícono, estado (disponible / próximamente)
- En v1: solo "Calculadora de Rentabilidad" activa

**Estructura de card:**
```
[ícono]
Nombre: Calculadora de Rentabilidad
Desc: Mide el retorno real de tus inversiones en COP y USD, incluyendo TIR
[Botón: Usar gratis →]
```

#### 5.4 Social proof / por qué confiar (opcional v1)

- Testimonios placeholder o métricas ("X usuarios ya calcularon su portafolio")

#### 5.5 Footer

- Links: Home, Calculadoras, Política de privacidad
- Redes sociales (si aplica)
- Copyright MIA

---

## 6. Página: Calculadora de Rentabilidad (`/calculadoras/rentabilidad`)

### 6.1 Descripción funcional

Replica completa de la lógica de la hoja de cálculo "Calculadora Inversiones V1.xlsx". Permite al usuario:

1. Configurar su portafolio (inversiones, entidades, moneda base)
2. Registrar aportes con fecha y TRM cuando aplique
3. Registrar cortes (valor actual de cada inversión)
4. Ver resultados: rentabilidad, ganancia/pérdida y TIR en moneda local, USD y USD convertido

### 6.2 Layout de la calculadora

La calculadora usa una navegación por **tabs o pasos progresivos**:

```
[Configuración] → [Mis Inversiones] → [Transacciones] → [Cortes] → [Resultados]
```

El usuario puede ir a cualquier tab en cualquier momento. El estado persiste en `localStorage`.

---

## 7. Módulo A: Configuración

### Propósito

Definir el contexto global que afecta toda la calculadora.

### Campos

| Campo | Tipo | Obligatorio | Default | Descripción |
|-------|------|-------------|---------|-------------|
| `baseCurrency` | select | Sí | COP | Moneda en la que el usuario lleva sus finanzas |
| `pillars` | lista editable | No | Ver catálogo | Categorías de inversión |
| `entities` | lista editable | No | Ver catálogo | Entidades financieras |
| `currencies` | lista editable | No | Ver catálogo | Monedas soportadas |

### Catálogos precargados

**Pilares sugeridos (editables):**
- Fondo de Imprevistos
- Reserva de Oxígeno
- Cuenta de Retiro
- Cuenta de Inversiones
- Crea Patrimonio
- Objetivo 1...7 (renombrables)

**Monedas soportadas:**
COP, USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD, CNY, HKD, SGD, KRW, SEK, NOK, DKK, MXN, CLP, ARS, PEN, BRL, UYU, BOB, PYG, CRC, DOP, GTQ, HNL, NIO, AED, SAR, INR, IDR, ZAR, TRY, PLN, CZK, HUF, ILS

**Entidades financieras precargadas:**

*Bancos Colombia:* Bancolombia, BBVA Colombia, Davivienda, Banco de Bogotá, Scotiabank Colpatria, Banco de Occidente, Banco Agrario, Banco Popular, Banco AV Villas, Banco Caja Social, Itaú Colombia, Banco GNB Sudameris, Banco Falabella, Banco Finandina, Citibank Colombia, Banco W, Coopcentral, NU

*Fiduciarias:* Fiduciaria Bancolombia, Fiduciaria Bogotá, Fiduciaria Davivienda, Fiduciaria BBVA, Fiduciaria Colpatria, Fiduciaria de Occidente, Fiduciaria Popular, Fiduciaria Itaú, Fiduciaria GNB Sudameris, Alianza Fiduciaria, BTG Pactual Fiduciaria, Fiduciaria La Previsora, Fiduciaria Central, Corficolombiana, Fiducoldex, Fiduprevisora, Fiduagraria, Fiduoccidente, Fiducoomeva

*Fondos de pensiones:* Protección, Porvenir, Colfondos, SURA

*Comisionistas / Plataformas locales:* Acciones & Valores, Alianza Valores, Valores Bancolombia, Davivienda Corredores, BTG Pactual, BBVA Valores, Casa de Bolsa, Credicorp Capital, Scotia Securities, Serfinco, Renta4 Global, Global Securities, Ultraserfinco, Compass Group, Trii, Tyba, Ualet, Hapi, Nequi Inversiones, Daviplata Inversiones

*Plataformas internacionales:* Charles Schwab, TD Ameritrade, TradeStation, eToro, XTB, Saxo Bank, Firstrade, Interactive Brokers

*Aseguradoras:* Skandia, Mapfre, Allianz, Seguros Bolívar, MetLife, Axa Colpatria, Zurich

*Transferencias / Fintech:* Global66, Wise, Remitly, Western Union

### Comportamiento

- El usuario puede agregar, editar y eliminar ítems de cada lista
- Los cambios se reflejan inmediatamente en los dropdowns de los otros módulos
- El cambio de `baseCurrency` NO recalcula retroactivamente; muestra advertencia

---

## 8. Módulo B: Mis Inversiones (Catálogo)

### Propósito

Definir cada "bucket" de inversión. Equivalente a las filas de la hoja de datos original.

### Modelo de datos

```typescript
type Investment = {
  id: string              // UUID generado automáticamente
  pilar: string           // dropdown desde config.pillars
  name: string            // nombre único — es la CLAVE de join con todos los módulos
  entity: string          // dropdown desde config.entities
  currency: string        // "COP" | "USD" | otra moneda
  createdAt: Date
}
```

### Reglas de negocio

1. `name` debe ser único en el portafolio del usuario
2. `currency` determina la lógica de flujos en transacciones y cortes:
   - Si `currency === baseCurrency`: flujos solo en moneda local
   - Si `currency === "USD"`: flujos en USD y en moneda local (con TRM)
3. Eliminar una inversión que tenga transacciones o cortes: mostrar modal de confirmación con conteo de registros afectados; eliminar en cascada si el usuario confirma
4. Cambiar `currency` de una inversión existente: advertir que los cálculos históricos pueden ser inconsistentes

### UI

- Tabla con columnas: Pilar, Nombre, Entidad, Moneda, Acciones (editar/eliminar)
- Botón "Agregar inversión" → abre modal/drawer con formulario
- Ordenable por Pilar y Nombre

---

## 9. Módulo C: Transacciones (Entradas y Salidas)

### Propósito

Registrar cada aporte realizado a cada inversión, con su fecha y tipo de cambio si aplica.

### Modelo de datos

```typescript
type Transaction = {
  id: string
  investmentName: string   // join → Investment.name (dropdown)
  entity: string           // dropdown desde config.entities
  currency: string         // "USD" | baseCurrency — se auto-completa desde Investment.currency
  date: Date               // fecha del aporte
  amountLocal: number      // monto en moneda local (siempre positivo, lo ingresa el usuario)
  trm?: number             // TRM al día del aporte — requerido solo si currency === "USD"
  note?: string            // texto libre
}
```

### Campos computados (read-only, calculados automáticamente)

```typescript
// Solo si currency === "USD"
flowUSD = -(amountLocal / trm)
// Ejemplo: -($11,050,000 / 4,420) = -$2,500 USD

// Solo si currency === baseCurrency
flowLocal = -amountLocal
// Ejemplo: -(5,000,000) = -5,000,000 COP

// Solo si currency !== baseCurrency (inversión USD)
flowLocalAsUSD = -amountLocal
// Ejemplo: -(11,050,000) = -11,050,000 COP
// → esto representa el costo en moneda local de la inversión USD
```

### Lógica de campos según tipo de inversión

**Inversión en moneda local (ej. COP):**

```
Usuario ingresa:
  ✏️ amountLocal = 5,000,000
  ✏️ date = 2024-03-15
  
Calculado automáticamente:
  ✅ flowLocal = -5,000,000
  ⚫ flowUSD = vacío
  ⚫ flowLocalAsUSD = vacío
  ⚫ trm = no se muestra
```

**Inversión en USD:**

```
Usuario ingresa:
  ✏️ amountLocal = 11,050,000   (cuántos COP pagó)
  ✏️ trm = 4,420                (precio del dólar ese día)
  ✏️ date = 2024-01-15
  
Calculado automáticamente:
  ✅ flowUSD = -2,500 USD        (los dólares que obtuvo)
  ✅ flowLocalAsUSD = -11,050,000 (costo en COP para TIR en COP)
  ⚫ flowLocal = vacío
```

### Reglas de UI

- El campo `currency` se auto-completa desde `Investment.currency` al seleccionar la inversión
- El campo `trm` solo aparece cuando `currency === "USD"`
- Los campos computados se muestran como badges o filas de solo lectura debajo del formulario
- Tabla principal: filtrable por inversión, ordenable por fecha
- El campo `amountLocal` siempre positivo (el signo negativo es interno)
- Columnas de tabla: Fecha, Inversión, Entidad, Moneda, Monto, TRM, Flujo USD, Flujo Local, Nota

---

## 10. Módulo D: Cortes por Inversión (Snapshots)

### Propósito

Registrar el valor actual de cada inversión en una fecha concreta. Estos valores son el "valor final" usado en los cálculos de rentabilidad.

### Modelo de datos

```typescript
type Snapshot = {
  id: string
  investmentName: string   // join → Investment.name
  entity: string
  currency: string         // se auto-completa desde Investment.currency
  cutDate: Date            // fecha del corte/revisión
  valueLocal?: number      // valor actual en moneda local → solo para inversiones en baseCurrency
  valueUSD?: number        // valor actual en USD → solo para inversiones en USD
  trmCut?: number          // TRM del día del corte → solo para inversiones USD
}
```

### Campo computado

```typescript
// Solo si currency === "USD"
valueLocalFromUSD = valueUSD * trmCut
// Ejemplo: 6,300 USD × 3,770 = 23,751,000 COP
```

### Regla crítica: último corte

En los Resultados solo se usa el corte **más reciente** de cada inversión (el de mayor `cutDate`). Si hay múltiples cortes, los anteriores son historial pero no afectan el cálculo principal.

### Reglas de UI

- El campo `trmCut` y `valueUSD` solo aparecen para inversiones en USD
- El campo `valueLocal` solo aparece para inversiones en baseCurrency
- `valueLocalFromUSD` se muestra como campo read-only cuando `currency === "USD"`
- Tabla con columnas: Fecha corte, Inversión, Moneda, Valor Local, Valor USD, TRM corte, Valor USD→Local
- Indicador visual del "corte más reciente" por inversión (ej. badge "Activo")

---

## 11. Módulo E: Resultados por Inversión

### Propósito

Mostrar las métricas de rentabilidad calculadas para cada inversión. Es el módulo de solo lectura.

### 11.1 TRM en tiempo real

- Al cargar la pantalla de Resultados, se hace un fetch a la API de tipo de cambio
- **API:** ExchangeRate-API (`https://open.er-api.com/v6/latest/USD`) — free tier, sin API key para COP
- **Cache:** 1 hora en memoria (no re-fetch en cada render); mostrar timestamp de última actualización
- **Fallback:** Si la API falla, mostrar input manual para que el usuario ingrese el TRM del día
- El TRM actual se muestra prominentemente en la pantalla: `Valor USD hoy: $4,120.50 COP` + "Actualizado hace 5 min"

### 11.2 Modelo de resultado por inversión

```typescript
type InvestmentResult = {
  investment: Investment

  // Dimensión A: Moneda local (solo para inversiones en baseCurrency)
  totalInvestedLocal?: number     // suma absoluta de flowLocal
  currentValueLocal?: number      // latestSnapshot.valueLocal
  gainLossLocal?: number          // currentValueLocal - totalInvestedLocal
  irrLocal?: number               // XIRR resultado como decimal (0.17 = 17% anual)

  // Dimensión B: USD (solo para inversiones en USD)
  totalInvestedUSD?: number       // suma absoluta de flowUSD
  currentValueUSD?: number        // latestSnapshot.valueUSD
  gainLossUSD?: number            // currentValueUSD - totalInvestedUSD
  irrUSD?: number                 // XIRR en USD

  // Dimensión C: USD convertido a moneda local (al TRM de hoy)
  currentTRM: number              // TRM obtenido de API
  totalInvestedUSDtoLocal?: number    // totalInvestedUSD * currentTRM
  currentValueUSDtoLocal?: number     // currentValueUSD * currentTRM
  gainLossUSDtoLocal?: number         // currentValueUSDtoLocal - totalInvestedUSDtoLocal
  irrUSDtoLocal?: number              // XIRR en moneda local de inversiones USD
}
```

### 11.3 Cálculo XIRR — Especificación

XIRR calcula la Tasa Interna de Retorno para flujos de caja con fechas irregulares.

**Algoritmo: Newton-Raphson**

```typescript
function xirr(flows: number[], dates: Date[]): number {
  // flows: array de montos — negativos = aportes, positivo = valor final
  // dates: array de fechas correspondientes a cada flujo
  // Devuelve: tasa anual como decimal (ej. 0.18 = 18%)
  
  // Fórmula: NPV = Σ( flows[i] / (1 + rate)^((dates[i] - dates[0]) / 365) ) = 0
  // Resolver para rate iterativamente
}
```

**Construcción de inputs XIRR según dimensión:**

```
// Dimensión A — TIR en moneda local (inversión COP):
flows = [
  ...transactions
    .filter(t => t.investmentName === inv.name)
    .map(t => t.flowLocal),      // negativos (aportes)
  latestSnapshot.valueLocal       // positivo (valor actual)
]
dates = [
  ...transactions.map(t => t.date),
  latestSnapshot.cutDate
]

// Dimensión B — TIR en USD (inversión USD):
flows = [
  ...transactions.map(t => t.flowUSD),   // negativos
  latestSnapshot.valueUSD                 // positivo
]
dates = [
  ...transactions.map(t => t.date),
  latestSnapshot.cutDate
]

// Dimensión C — TIR USD expresada en moneda local:
flows = [
  ...transactions.map(t => t.flowLocalAsUSD),    // negativos (COP pagados)
  latestSnapshot.valueLocalFromUSD                // positivo (USD × TRM corte)
]
dates = [
  ...transactions.map(t => t.date),
  latestSnapshot.cutDate
]
```

**Notas de implementación XIRR:**
- Máximo 1000 iteraciones; si no converge devolver `null`
- Tolerancia: `|NPV| < 1e-6`
- Estimación inicial: `rate = 0.1` (10%)
- Si todos los flujos son del mismo signo: devolver `null` (no calculable)
- Si solo hay 1 flujo (sin corte): devolver `null`

### 11.4 Tabla de Resultados

**Columnas principales (las más importantes para el usuario):**

| Columna | Descripción | Highlight |
|---------|-------------|-----------|
| Inversión | Nombre + pilar | — |
| Total invertido (local) | Suma aportes en moneda local | — |
| Valor actual (local) | Último corte en moneda local | — |
| Ganancia/Pérdida (local) | Valor - Invertido | 🟢 positivo / 🔴 negativo |
| **TIR local** | XIRR en moneda local | ⭐ Principal |
| Total invertido (USD) | Suma aportes en USD | — |
| Valor actual (USD) | Último corte en USD | — |
| Ganancia/Pérdida (USD) | Valor - Invertido | 🟢/🔴 |
| **TIR USD** | XIRR en USD | ⭐ Principal |
| TRM hoy | Tipo de cambio actual | — |
| Total invertido USD→local | Total USD × TRM hoy | — |
| Valor actual USD→local | Valor USD × TRM hoy | — |
| Ganancia/Pérdida USD→local | | 🟢/🔴 |
| **TIR USD→local** | XIRR en COP de inversión USD | ⭐ Principal |

**Columnas TIR formateadas:** `17.48%` (multiplicar decimal × 100, 2 decimales)

**Filas vacías:** Si una inversión no tiene corte registrado, las columnas de resultado muestran `—` con tooltip "Agrega un corte para ver resultados"

### 11.5 Vista de resumen del portafolio

Encima de la tabla, cards de resumen agregado:

```
[Total invertido COP]  [Valor actual COP]  [Ganancia total COP]  [TRM hoy]
```

### 11.6 Gráfica de portafolio

- **Tipo:** Gráfica de barras horizontal o donut por pilar (agrupando inversiones del mismo pilar)
- **Eje:** Valor actual total por pilar en moneda local
- **Opcional v1:** línea de tiempo de aportes acumulados

---

## 12. Persistencia de datos (v1)

En v1 no hay backend ni autenticación. Todos los datos viven en `localStorage`.

### Estructura de almacenamiento

```typescript
// localStorage key: "mia-rentabilidad"
type RentabilidadStore = {
  config: Config
  investments: Investment[]
  transactions: Transaction[]
  snapshots: Snapshot[]
  lastUpdated: string   // ISO date
}
```

### Consideraciones

- Serialización/deserialización de fechas como ISO strings
- Límite de localStorage (~5MB) es suficiente para cientos de transacciones
- Exportar datos como JSON: botón "Exportar mis datos" en la calculadora
- Importar datos desde JSON: botón "Importar" para recuperar datos
- Advertencia al usuario al limpiar datos del navegador

---

## 13. API de Tipo de Cambio

### Endpoint

```
GET https://open.er-api.com/v6/latest/USD
```

### Respuesta relevante

```json
{
  "result": "success",
  "base_code": "USD",
  "rates": {
    "COP": 4120.5,
    "EUR": 0.92,
    "MXN": 17.1,
    ...
  },
  "time_last_update_unix": 1714320000
}
```

### Implementación en Next.js

```typescript
// lib/exchange-rate.ts
// Route handler: app/api/exchange-rate/route.ts
// → Proxy que llama a la API externa y cachea en memoria 1 hora
// → Evita exponer el fetch directo al cliente y permite reemplazar la fuente en el futuro
```

### Flujo

1. Al montar el componente de Resultados → `GET /api/exchange-rate`
2. Si respuesta exitosa: usar `rates[baseCurrency]` como TRM actual
3. Si falla: mostrar campo de input manual con label "Ingresa el TRM de hoy"
4. Mostrar badge: `TRM: $4,120 COP/USD · Actualizado: hace 3 min`

---

## 14. Manejo de errores y edge cases

| Caso | Comportamiento |
|------|---------------|
| Inversión sin transacciones | Mostrar en tabla con valores `—` |
| Inversión sin corte | Columnas de resultado vacías con tooltip |
| XIRR no converge | Mostrar `N/A` con tooltip "No se pudo calcular" |
| API de TRM falla | Input manual, persistir el último valor conocido |
| Todos los aportes el mismo día | XIRR puede no converger → mostrar `N/A` |
| `amountLocal = 0` | Validar en formulario: mínimo > 0 |
| `trm = 0` | Validar en formulario: TRM debe ser > 0 |
| `cutDate` anterior a todos los aportes | Advertencia: el corte es anterior a la primera transacción |

---

## 15. Requerimientos de UX

### Principios

1. **Progresividad:** El usuario puede empezar con una sola inversión y expandir después
2. **Feedback inmediato:** Campos computados se actualizan en tiempo real al editar
3. **Sin sorpresas:** Si algo no puede calcularse, explicar por qué (tooltips)
4. **Mobile-first:** La calculadora debe ser usable en móvil (tablas con scroll horizontal)

### Estados de la calculadora

```
Estado vacío → onboarding con pasos sugeridos:
  "1. Configura tu moneda base"
  "2. Agrega tu primera inversión"
  "3. Registra tus aportes"
  "4. Agrega un corte para ver resultados"
```

### Indicadores visuales

- Ganancia: verde (`text-green-600`)
- Pérdida: rojo (`text-red-600`)
- TIR destacada con badge o tipografía grande
- Corte más reciente de cada inversión: badge "Último corte"
- Campos editables: fondo amarillo claro (como la hoja original)
- Campos calculados: fondo gris o verde claro

---

## 16. Roadmap post-v1

| Fase | Feature |
|------|---------|
| v1.1 | Autenticación (Clerk o NextAuth) + datos en base de datos |
| v1.2 | Múltiples portafolios por usuario |
| v1.3 | Calculadora de interés compuesto |
| v1.4 | Calculadora de FIRE (independencia financiera) |
| v2.0 | Marketplace de infoproductos |
| v2.1 | Dashboard MIA unificado |
| v2.2 | Calculadora de deuda y amortización |

---

## 17. Métricas de éxito (v1)

| Métrica | Objetivo |
|---------|---------|
| Tasa de completación | % usuarios que agregan ≥1 inversión + ≥1 transacción + ≥1 corte |
| Retención | % usuarios que vuelven en 7 días |
| Conversión CTA | % clicks en botones del landing hacia la calculadora |
| Tiempo en calculadora | Indicador de engagement |

---

## 18. Checklist de implementación v1

### Setup inicial
- [ ] Crear proyecto Next.js 14 con TypeScript y Tailwind
- [ ] Instalar shadcn/ui, Zustand, React Hook Form, Zod, date-fns, Recharts, TanStack Table
- [ ] Configurar ESLint + Prettier
- [ ] Configurar estructura de carpetas

### Landing
- [ ] Componente Hero con CTAs
- [ ] Sección ¿Qué es MIA?
- [ ] Grid de calculadoras (1 activa)
- [ ] Footer

### Calculadora — Infraestructura
- [ ] Definir tipos TypeScript completos
- [ ] Implementar XIRR (Newton-Raphson) con tests unitarios
- [ ] Zustand store con persistencia en localStorage
- [ ] Route handler `/api/exchange-rate` con cache 1h

### Calculadora — Módulos
- [ ] Módulo A: Configuración (moneda base, catálogos)
- [ ] Módulo B: Inversiones (CRUD)
- [ ] Módulo C: Transacciones (CRUD + campos calculados)
- [ ] Módulo D: Cortes (CRUD + campos calculados)
- [ ] Módulo E: Resultados (tabla + TRM en tiempo real)

### Polish
- [ ] Estados vacíos con onboarding
- [ ] Validaciones de formularios con Zod
- [ ] Exportar/importar datos JSON
- [ ] Responsive móvil
- [ ] Tooltips en métricas complejas (TIR, TRM)

---

*Documento generado para iniciar el desarrollo de MIA Platform v1.*
