# Calculator Results Specification

## Purpose

Módulo E: Pantalla de resultados de rentabilidad. Muestra las métricas calculadas (XIRR en 3 dimensiones, ganancia/pérdida, TRM actual) para cada inversión del portafolio. Es el módulo de solo lectura que convierte los datos en inteligencia financiera.

## Data Model

```typescript
type InvestmentResult = {
  investment: Investment

  // Dimensión A — Moneda local (solo inversiones en baseCurrency)
  totalInvestedLocal?: number
  currentValueLocal?: number
  gainLossLocal?: number
  irrLocal?: number | null    // XIRR decimal o null

  // Dimensión B — USD (solo inversiones en USD)
  totalInvestedUSD?: number
  currentValueUSD?: number
  gainLossUSD?: number
  irrUSD?: number | null

  // Dimensión C — USD → moneda local (al TRM de hoy)
  currentTRM: number
  totalInvestedUSDtoLocal?: number
  currentValueUSDtoLocal?: number
  gainLossUSDtoLocal?: number
  irrUSDtoLocal?: number | null
}
```

## Requirements

### Requirement: Tabla de Resultados por Inversión

El sistema MUST mostrar la tabla completa de métricas por inversión.

- Columnas MUST incluir todas las definidas en PRD sección 11.4.
- TIR MUST formatearse como: `17.48%` (decimal × 100, 2 decimales).
- Ganancia positiva MUST mostrarse en verde; pérdida en rojo.
- Si una inversión no tiene corte, las columnas de resultado MUST mostrar `—` con tooltip "Agrega un corte para ver resultados".
- Si XIRR retorna null, MUST mostrar `N/A` con tooltip "No se pudo calcular".

#### Scenario: Inversión con datos completos

- GIVEN la inversión "Davivienda CDT" tiene 2 transacciones y 1 corte
- WHEN el usuario abre el Módulo E
- THEN la fila muestra Total Invertido, Valor Actual, Ganancia/Pérdida y TIR calculadas
- AND la TIR positiva se muestra en verde con formato `%`

#### Scenario: Inversión sin corte

- GIVEN la inversión "Objetivo 1" tiene transacciones pero ningún corte
- WHEN el usuario abre el Módulo E
- THEN las columnas de resultado muestran `—`
- AND al hacer hover muestra tooltip: "Agrega un corte para ver resultados"

#### Scenario: XIRR no converge

- GIVEN todos los aportes de una inversión son del mismo día
- WHEN el sistema intenta calcular la TIR
- THEN muestra `N/A` en la columna TIR
- AND al hacer hover muestra tooltip: "No se pudo calcular la tasa de retorno"

---

### Requirement: Cards de Resumen del Portafolio

El sistema MUST mostrar 4 cards de resumen agregado encima de la tabla.

- Card 1: Total invertido (suma en moneda local).
- Card 2: Valor actual (suma en moneda local).
- Card 3: Ganancia/Pérdida total (con color verde/rojo).
- Card 4: TRM hoy (con badge de actualización).

#### Scenario: Cards calculadas correctamente

- GIVEN el portafolio tiene 3 inversiones con datos completos
- WHEN el usuario abre el Módulo E
- THEN las 4 cards muestran las sumas correctas de todas las inversiones

---

### Requirement: Gráfica de Portafolio

El sistema MUST mostrar una gráfica de barras o donut agrupada por pilar.

- La gráfica MUST mostrar el valor actual total por pilar en moneda local.
- La gráfica MUST usar Recharts.
- La gráfica MUST ser responsive (ResponsiveContainer).

#### Scenario: Gráfica con múltiples pilares

- GIVEN el portafolio tiene inversiones en 3 pilares diferentes
- WHEN el usuario ve la gráfica
- THEN cada pilar es visible con su valor total
- AND los colores son consistentes con la paleta de Moneyflow

---

### Requirement: TRM Prominente

El sistema MUST mostrar el TRM actual de forma prominente al cargar los Resultados.

- Al montar el Módulo E, MUST llamar a `/api/exchange-rate`.
- El TRM MUST usarse para calcular los valores de Dimensión C.
- Ver spec `trm-live` para detalles de badge y fallback manual.

#### Scenario: TRM cargado al abrir Resultados

- GIVEN el usuario navega al tab Resultados
- WHEN el componente monta
- THEN se hace fetch a `/api/exchange-rate`
- AND el evento GTM `results_viewed` se dispara
- AND la tabla usa el TRM correcto para cálculos Dimensión C

---

### Requirement: Exportar PDF

El sistema MUST ofrecer botón de descarga de reporte PDF brandeado.

- El botón MUST estar visible en la pantalla de Resultados.
- Ver spec `pdf-report` para detalles de estructura del PDF.

#### Scenario: Click en exportar PDF

- GIVEN el usuario está en el Módulo E con datos calculados
- WHEN hace click en "Descargar Reporte PDF"
- THEN se genera el PDF on-demand
- AND el navegador descarga `mia-reporte-YYYY-MM-DD.pdf`
- AND el evento GTM `pdf_downloaded` se dispara

---

### Non-Functional Requirements

- **Performance:** El cálculo de resultados para 50 inversiones MUST completar en < 500ms.
- **Memoización:** Los resultados MUST estar memoizados (useMemo) para evitar recálculo en cada render.
