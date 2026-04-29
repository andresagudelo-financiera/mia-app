# Calculator Investments Specification

## Purpose

Módulo B: Catálogo de inversiones. Define cada "bucket" de inversión del portafolio del usuario. Es la entidad central que relaciona transacciones y cortes.

## Data Model

```typescript
type Investment = {
  id: string           // UUID generado automáticamente
  pilar: string        // dropdown desde config.pillars
  name: string         // nombre único — CLAVE de join
  entity: string       // dropdown desde config.entities
  currency: string     // "COP" | "USD" | otra moneda
  createdAt: Date
}
```

## Requirements

### Requirement: CRUD de Inversiones

El sistema MUST permitir crear, leer, actualizar y eliminar inversiones.

- El sistema MUST mostrar una tabla con columnas: Pilar, Nombre, Entidad, Moneda, Acciones.
- El sistema MUST permitir agregar inversión via modal con formulario validado.
- El sistema MUST permitir editar inversión existente via modal.
- El sistema MUST permitir eliminar inversión con confirmación.
- El campo `name` MUST ser único en el portafolio del usuario.

#### Scenario: Agregar inversión exitosamente

- GIVEN el usuario está en el Módulo B
- WHEN hace click en "Agregar inversión" y completa el formulario con datos válidos
- THEN la inversión se guarda en el store
- AND aparece en la tabla inmediatamente
- AND el evento GTM `investment_added` se dispara

#### Scenario: Nombre duplicado

- GIVEN ya existe una inversión llamada "Bancolombia CDT"
- WHEN el usuario intenta crear otra inversión con el mismo nombre
- THEN el sistema muestra error: "Ya existe una inversión con este nombre"
- AND NO guarda la inversión

#### Scenario: Ordenamiento de tabla

- GIVEN hay múltiples inversiones en la tabla
- WHEN el usuario hace click en la columna "Pilar"
- THEN las filas se ordenan alfabéticamente por pilar

---

### Requirement: Eliminación en Cascada

El sistema MUST eliminar en cascada transacciones y cortes al eliminar una inversión.

- Al eliminar una inversión con transacciones o cortes, el sistema MUST mostrar modal de confirmación con el conteo: "Esta inversión tiene N transacciones y M cortes que también serán eliminados."
- Si el usuario confirma, el sistema MUST eliminar la inversión + todas sus transacciones + todos sus cortes.

#### Scenario: Eliminar inversión con datos

- GIVEN la inversión "Davivienda CDT" tiene 3 transacciones y 1 corte
- WHEN el usuario hace click en eliminar
- THEN aparece modal: "Esta inversión tiene 3 transacciones y 1 corte que también serán eliminados"
- WHEN el usuario confirma
- THEN se eliminan la inversión, sus 3 transacciones y su 1 corte del store

#### Scenario: Eliminar inversión vacía

- GIVEN la inversión "Nueva cuenta" no tiene transacciones ni cortes
- WHEN el usuario hace click en eliminar y confirma
- THEN se elimina directamente sin mostrar modal de conteo

---

### Requirement: Cambio de Moneda en Inversión Existente

El sistema MUST advertir sobre inconsistencias al cambiar `currency` de una inversión existente.

- Al cambiar `currency` en una inversión que ya tiene transacciones, MUST mostrar advertencia: "Cambiar la moneda puede causar inconsistencias en los cálculos históricos."
- El cambio MUST requerir confirmación explícita.

#### Scenario: Cambio de moneda con advertencia

- GIVEN una inversión en COP ya tiene 2 transacciones
- WHEN el usuario cambia la moneda a USD
- THEN aparece modal de advertencia con descripción del riesgo
- AND el cambio solo se aplica si el usuario confirma

---

### Requirement: Estado Vacío con Onboarding

El sistema MUST mostrar guía de primer uso cuando no hay inversiones.

- El estado vacío MUST mostrar: "Agrega tu primera inversión para comenzar."
- MUST incluir un botón de acción directa "Agregar primera inversión".

#### Scenario: Estado vacío

- GIVEN el usuario no tiene inversiones registradas
- WHEN abre el Módulo B
- THEN se muestra el estado vacío con instrucciones de onboarding
- AND el botón "Agregar primera inversión" abre el modal de formulario

---

### Non-Functional Requirements

- **Tabla:** Usar TanStack Table con sorting nativo.
- **Formulario:** React Hook Form + Zod con validación declarativa.
- **Persistencia:** Inversiones bajo key `mia-rentabilidad.investments` en localStorage.
