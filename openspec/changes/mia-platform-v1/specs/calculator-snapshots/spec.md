# Calculator Snapshots Specification

## Purpose

Módulo D: Cortes por inversión. Registra el valor actual de cada inversión en una fecha concreta. Estos valores son el "valor final" usado en los cálculos de rentabilidad (XIRR) del Módulo E.

## Data Model

```typescript
type Snapshot = {
  id: string
  investmentName: string   // join → Investment.name
  entity: string
  currency: string         // auto-completado desde Investment.currency
  cutDate: Date
  valueLocal?: number      // solo para inversiones en baseCurrency
  valueUSD?: number        // solo para inversiones en USD
  trmCut?: number          // solo para inversiones USD

  // Campo calculado (readonly):
  // valueLocalFromUSD = valueUSD * trmCut  (solo si currency === "USD")
}
```

## Requirements

### Requirement: CRUD de Cortes

El sistema MUST permitir crear, leer, actualizar y eliminar cortes.

- Columnas de tabla MUST incluir: Fecha corte, Inversión, Moneda, Valor Local, Valor USD, TRM corte, Valor USD→Local.
- El campo `trmCut` y `valueUSD` MUST aparecer solo para inversiones en USD.
- El campo `valueLocal` MUST aparecer solo para inversiones en baseCurrency.
- `valueLocalFromUSD` MUST mostrarse como campo read-only calculado.

#### Scenario: Registrar corte en COP

- GIVEN el usuario tiene una inversión en COP
- WHEN registra corte con `valueLocal = 5,850,000` y `cutDate = 2025-01-01`
- THEN el corte se guarda
- AND los campos `valueUSD` y `trmCut` NO son visibles

#### Scenario: Registrar corte en USD

- GIVEN el usuario tiene una inversión en USD
- WHEN registra `valueUSD = 6,300`, `trmCut = 3,770`, `cutDate = 2025-06-01`
- THEN `valueLocalFromUSD = 23,751,000` se calcula y muestra automáticamente (6,300 × 3,770)

---

### Requirement: Regla del Último Corte

El sistema MUST usar solo el corte más reciente de cada inversión para los cálculos de Resultados.

- El sistema MUST determinar el "último corte" comparando `cutDate` de todos los cortes de una inversión.
- Los cortes anteriores son historial pero NO afectan el cálculo principal.
- El sistema MUST mostrar un badge "Activo" o "Último corte" en la fila del corte más reciente.

#### Scenario: Múltiples cortes — solo el último en Resultados

- GIVEN la inversión "Fiduciaria Bancolombia" tiene cortes en 2024-06-01 y 2025-01-01
- WHEN el Módulo E calcula resultados
- THEN solo usa el corte de 2025-01-01 (más reciente)
- AND en la tabla de cortes el de 2025-01-01 muestra badge "Último corte"

---

### Requirement: Advertencia de Fecha Inconsistente

El sistema MUST advertir si el corte es anterior a todas las transacciones.

- Si `cutDate` es anterior a la fecha de la transacción más antigua de la inversión, MUST mostrar: "El corte es anterior a la primera transacción. Los resultados pueden no ser representativos."

#### Scenario: Corte anterior a primera transacción

- GIVEN la primera transacción de "SURA" es del 2024-03-01
- WHEN el usuario registra un corte con `cutDate = 2024-02-01`
- THEN se muestra advertencia sobre inconsistencia temporal
- AND el corte SÍ puede guardarse (la advertencia es informativa, no bloqueante)

---

### Requirement: Primer Evento de Tracking

El sistema MUST disparar evento GTM al agregar el primer corte.

- El evento `snapshot_added` MUST dispararse al guardar el primer corte.

#### Scenario: Primer corte registrado

- GIVEN el usuario no tenía cortes registrados
- WHEN guarda el primer corte
- THEN el evento GTM `snapshot_added` se dispara

---

### Non-Functional Requirements

- **Validación:** `valueLocal` y `valueUSD` MUST ser > 0. `trmCut` MUST ser > 0 cuando aplica.
- **Persistencia:** Cortes bajo `mia-rentabilidad.snapshots` en localStorage.
