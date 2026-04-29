# Calculator Config Specification

## Purpose

Módulo A de la calculadora de rentabilidad. Define el contexto global: moneda base, pilares de inversión, entidades financieras y monedas soportadas. Estos catálogos son usados como dropdowns en los demás módulos.

## Requirements

### Requirement: Moneda Base

El sistema MUST permitir configurar una moneda base que afecta todos los módulos.

- El sistema MUST ofrecer un select de moneda base con las 40+ monedas del catálogo del PRD.
- El default MUST ser COP.
- Al cambiar `baseCurrency`, el sistema MUST mostrar advertencia: "Los cálculos históricos no se recalculan retroactivamente."
- El cambio MUST persistir en el store y localStorage inmediatamente.

#### Scenario: Configuración inicial de moneda base

- GIVEN el usuario completa el registro con moneda COP
- WHEN abre el Módulo A
- THEN el select muestra COP seleccionado por defecto

#### Scenario: Cambio de moneda con advertencia

- GIVEN el usuario tiene inversiones registradas en COP
- WHEN cambia `baseCurrency` a USD
- THEN aparece advertencia visible sobre inconsistencia histórica
- AND el cambio se aplica al confirmar

---

### Requirement: Catálogos Editables (Pilares, Entidades, Monedas)

El sistema MUST permitir agregar, editar y eliminar ítems en cada catálogo.

- Los cambios MUST reflejarse inmediatamente en los dropdowns de los módulos B, C y D.
- El sistema MUST precargar los catálogos del PRD como defaults.
- Los catálogos MUST persistir en localStorage bajo la key `mia-rentabilidad`.

**Pilares sugeridos precargados:**
Fondo de Imprevistos, Reserva de Oxígeno, Cuenta de Retiro, Cuenta de Inversiones, Crea Patrimonio, Objetivo 1–7.

**Entidades precargadas:**
Bancolombia, BBVA, Davivienda, Banco de Bogotá, Scotiabank Colpatria, Banco de Occidente, Banco Agrario, Banco Popular, Banco AV Villas, Banco Caja Social, Itaú Colombia, NU, Fiduciaria Bancolombia, BTG Pactual, Protección, Porvenir, Colfondos, SURA, Interactive Brokers, Charles Schwab, Wise, Global66 (y demás del PRD).

#### Scenario: Agregar nuevo pilar

- GIVEN el usuario está en el Módulo A
- WHEN agrega "Objetivo 8" a la lista de pilares
- THEN "Objetivo 8" aparece en el dropdown de Pilar del Módulo B

#### Scenario: Eliminar entidad en uso

- GIVEN la entidad "Bancolombia" está asignada a al menos una inversión
- WHEN el usuario intenta eliminar "Bancolombia" del catálogo
- THEN el sistema muestra advertencia: "Esta entidad está en uso en N inversiones"
- AND permite proceder con eliminación forzada o cancelar

#### Scenario: Editar nombre de pilar

- GIVEN el pilar "Objetivo 1" existe en el catálogo
- WHEN el usuario lo renombra a "Viaje a Europa"
- THEN todas las inversiones asignadas a "Objetivo 1" ahora muestran "Viaje a Europa"

---

### Non-Functional Requirements

- **Persistencia:** Toda la config MUST estar bajo key `mia-rentabilidad` con sub-key `config`.
- **Validación:** Nombres de catálogo no pueden estar vacíos ni duplicados dentro del mismo catálogo.
