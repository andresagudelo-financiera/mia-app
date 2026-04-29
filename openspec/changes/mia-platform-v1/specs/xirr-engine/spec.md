# XIRR Engine Specification

## Purpose

Implementación propia del algoritmo XIRR (Extended Internal Rate of Return) usando Newton-Raphson. Calcula la tasa interna de retorno para flujos de caja con fechas irregulares. Es el núcleo de cálculo de la plataforma.

## Requirements

### Requirement: Función XIRR Core

El sistema MUST implementar XIRR con Newton-Raphson con tolerancia 1e-6.

```typescript
function xirr(flows: number[], dates: Date[]): number | null
// flows: negativos = aportes, positivo = valor final
// dates: fechas correspondientes a cada flujo
// returns: tasa anual como decimal (0.18 = 18%) o null si no converge
```

- El sistema MUST usar la fórmula: `NPV = Σ( flows[i] / (1 + rate)^((dates[i] - dates[0]) / 365) ) = 0`
- El sistema MUST resolver iterativamente con Newton-Raphson.
- El sistema MUST iniciar con estimación `rate = 0.1` (10%).
- El sistema MUST correr máximo 1000 iteraciones.
- El sistema MUST retornar `null` si `|NPV| < 1e-6` no se alcanza en 1000 iteraciones.
- El sistema MUST retornar `null` si todos los flujos son del mismo signo.
- El sistema MUST retornar `null` si hay menos de 2 flujos (sin corte).

#### Scenario: Cálculo exitoso simple

- GIVEN `flows = [-5_000_000, 5_850_000]` y `dates = [2024-01-01, 2025-01-01]`
- WHEN se llama a `xirr(flows, dates)`
- THEN retorna un valor cercano a `0.17` (17% anual, tolerancia ±0.001)

#### Scenario: No converge — flujos del mismo signo

- GIVEN `flows = [-5_000_000, -1_000_000]` (ambos negativos)
- WHEN se llama a `xirr(flows, dates)`
- THEN retorna `null`

#### Scenario: Un solo flujo sin corte

- GIVEN `flows = [-5_000_000]` y `dates = [2024-01-01]`
- WHEN se llama a `xirr(flows, dates)`
- THEN retorna `null`

#### Scenario: Flujos en el mismo día

- GIVEN todos los `dates` son idénticos
- WHEN se llama a `xirr(flows, dates)`
- THEN retorna `null` (no calculable)

#### Scenario: Convergencia en muchas iteraciones

- GIVEN flujos irregulares complejos que requieren más de 100 iteraciones
- WHEN se llama a `xirr(flows, dates)`
- THEN retorna el valor correcto si converge antes de la iteración 1000

---

### Requirement: Construcción de Inputs XIRR por Dimensión

El sistema MUST construir los arrays de inputs correctamente según la dimensión de cálculo.

**Dimensión A — TIR en moneda local (inversión COP):**

- El sistema MUST usar `flowLocal` de cada transacción como flujos negativos.
- El sistema MUST usar `latestSnapshot.valueLocal` como flujo positivo final.

**Dimensión B — TIR en USD (inversión USD):**

- El sistema MUST usar `flowUSD` de cada transacción como flujos negativos.
- El sistema MUST usar `latestSnapshot.valueUSD` como flujo positivo final.

**Dimensión C — TIR USD expresada en moneda local:**

- El sistema MUST usar `flowLocalAsUSD` de cada transacción como flujos negativos.
- El sistema MUST usar `latestSnapshot.valueLocalFromUSD` como flujo positivo final.

#### Scenario: Construcción correcta Dimensión A

- GIVEN una inversión en COP con 2 transacciones y 1 corte
- WHEN se construye el input para Dimensión A
- THEN `flows` tiene `n_transacciones + 1` elementos
- AND los primeros `n` son negativos (flowLocal)
- AND el último es positivo (valueLocal del último corte)

#### Scenario: Inversión sin corte registrado

- GIVEN una inversión que tiene transacciones pero ningún corte
- WHEN el sistema intenta calcular XIRR
- THEN retorna `null` para todas las dimensiones
- AND en la tabla de resultados se muestra `—` con tooltip "Agrega un corte para ver resultados"

---

### Non-Functional Requirements

- **Testing:** Cada escenario de esta spec MUST tener un test unitario en Vitest.
- **Pureza:** `xirr()` MUST ser una función pura — sin side effects, sin llamadas a API.
- **Performance:** El cálculo de una cartera de 50 inversiones MUST completar en < 100ms.
- **Ubicación:** `src/lib/xirr.ts`
