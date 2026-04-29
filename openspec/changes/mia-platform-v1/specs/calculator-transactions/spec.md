# Calculator Transactions Specification

## Purpose

Módulo C: Registro de aportes (entradas y salidas) a cada inversión. Calcula automáticamente los flujos de caja según la moneda de la inversión. Es el input principal para el XIRR.

## Data Model

```typescript
type Transaction = {
  id: string
  investmentName: string   // join → Investment.name
  entity: string           // auto-completado desde Investment.entity
  currency: string         // auto-completado desde Investment.currency
  date: Date               // fecha del aporte
  amountLocal: number      // siempre positivo (el usuario ingresa)
  trm?: number             // requerido solo si currency === "USD"
  note?: string
}

// Campos calculados (readonly, no persisten por separado):
// flowLocal    = -amountLocal            (solo si currency === baseCurrency)
// flowUSD      = -(amountLocal / trm)    (solo si currency === "USD")
// flowLocalAsUSD = -amountLocal          (solo si currency !== baseCurrency — representa COP pagados)
```

## Requirements

### Requirement: CRUD de Transacciones

El sistema MUST permitir crear, leer, actualizar y eliminar transacciones.

- El sistema MUST mostrar tabla filtrable por inversión y ordenable por fecha.
- Columnas MUST incluir: Fecha, Inversión, Entidad, Moneda, Monto, TRM, Flujo USD, Flujo Local, Nota.
- `currency` y `entity` MUST auto-completarse desde la inversión seleccionada.
- El campo `trm` MUST aparecer solo cuando `currency === "USD"`.

#### Scenario: Registrar aporte en COP

- GIVEN el usuario selecciona una inversión en COP
- WHEN ingresa `amountLocal = 5,000,000` y `date = 2024-03-15`
- THEN `flowLocal = -5,000,000` se muestra como campo calculado
- AND los campos TRM, flowUSD y flowLocalAsUSD NO son visibles

#### Scenario: Registrar aporte en USD

- GIVEN el usuario selecciona una inversión en USD
- WHEN ingresa `amountLocal = 11,050,000`, `trm = 4,420` y `date = 2024-01-15`
- THEN `flowUSD = -2,500` se muestra automáticamente
- AND `flowLocalAsUSD = -11,050,000` se muestra
- AND `flowLocal` NO es visible

---

### Requirement: Validaciones de Formulario

El sistema MUST validar los campos antes de guardar.

- `amountLocal` MUST ser > 0.
- `trm` MUST ser > 0 cuando aplica.
- `date` MUST ser una fecha válida.
- `investmentName` MUST seleccionarse de inversiones existentes.

#### Scenario: amountLocal = 0

- GIVEN el usuario ingresa `amountLocal = 0`
- WHEN hace click en "Guardar"
- THEN se muestra error: "El monto debe ser mayor a 0"

#### Scenario: TRM = 0 en inversión USD

- GIVEN el usuario tiene una inversión USD seleccionada
- WHEN ingresa `trm = 0`
- THEN se muestra error: "La TRM debe ser mayor a 0"

---

### Requirement: Campos Calculados en Tiempo Real

El sistema MUST calcular los flujos mientras el usuario edita el formulario.

- Los campos calculados MUST actualizarse en tiempo real al cambiar `amountLocal` o `trm`.
- Los campos calculados MUST mostrarse como badges o filas de solo lectura.

#### Scenario: Actualización en tiempo real de flowUSD

- GIVEN el usuario tiene una transacción USD en edición
- WHEN cambia `amountLocal` de 10,000,000 a 11,050,000
- THEN `flowUSD` se actualiza de -2,262.44 a -2,500 instantáneamente (con trm=4,420)

---

### Requirement: Primer Evento de Tracking

El sistema MUST disparar evento GTM al agregar la primera transacción de la sesión.

- El evento `transaction_added` MUST dispararse al guardar la primera transacción.
- Payload MUST incluir `{currency, has_trm: boolean}`.

#### Scenario: Primera transacción registrada

- GIVEN el usuario no tenía transacciones registradas
- WHEN guarda la primera transacción
- THEN el evento GTM `transaction_added` se dispara

---

### Non-Functional Requirements

- **UX:** El campo `amountLocal` siempre positivo — el signo negativo es interno al flujo.
- **Tabla:** Filtrable por `investmentName` con input de búsqueda.
- **Persistencia:** Transacciones bajo `mia-rentabilidad.transactions` en localStorage.
