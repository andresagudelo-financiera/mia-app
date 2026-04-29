# User Profile Specification

## Purpose

Página `/perfil` donde el usuario puede editar sus datos, cambiar la moneda base, exportar/importar datos de la calculadora y limpiar su información.

## Requirements

### Requirement: Edición de Perfil

El sistema MUST permitir al usuario editar sus datos personales.

- El sistema MUST mostrar campos editables: nombre, email.
- El sistema MUST validar los cambios con Zod antes de guardar.
- El sistema MUST persistir los cambios en localStorage inmediatamente al guardar.
- El sistema MUST mostrar feedback visual de éxito/error tras guardar.

#### Scenario: Edición exitosa de nombre

- GIVEN el usuario está en `/perfil`
- WHEN edita su nombre y hace click en "Guardar cambios"
- THEN el nombre se actualiza en localStorage
- AND el navbar refleja el nuevo nombre
- AND se muestra un toast de confirmación

#### Scenario: Cambio de email a valor inválido

- GIVEN el usuario está en `/perfil`
- WHEN ingresa un email con formato inválido y hace click en "Guardar"
- THEN se muestra error inline en el campo email
- AND NO se guardan los cambios

---

### Requirement: Cambio de Moneda Base

El sistema MUST permitir cambiar la `baseCurrency` con advertencia explícita.

- El sistema MUST mostrar un select con todas las monedas disponibles del catálogo.
- Al cambiar `baseCurrency`, el sistema MUST mostrar un modal de advertencia: "Cambiar la moneda base NO recalcula retroactivamente tus datos históricos."
- El sistema MUST requerir confirmación explícita antes de aplicar el cambio.
- El cambio MUST actualizarse en el store de Zustand y en localStorage.

#### Scenario: Cambio de moneda con confirmación

- GIVEN el usuario está en `/perfil` con moneda base COP
- WHEN selecciona USD y confirma en el modal de advertencia
- THEN `baseCurrency` se actualiza a USD en el store y localStorage
- AND el cambio aplica en todos los módulos de la calculadora

#### Scenario: Cambio de moneda cancelado

- GIVEN el usuario seleccionó nueva moneda y aparece el modal de advertencia
- WHEN el usuario hace click en "Cancelar"
- THEN el select vuelve a la moneda anterior
- AND NO se guarda ningún cambio

---

### Requirement: Exportar Datos

El sistema MUST permitir exportar todos los datos de la calculadora como JSON.

- El sistema MUST exportar un JSON con estructura `RentabilidadStore` completa.
- El nombre del archivo MUST ser `mia-datos-YYYY-MM-DD.json`.
- El JSON MUST incluir: config, investments, transactions, snapshots, lastUpdated.

#### Scenario: Exportación exitosa

- GIVEN el usuario tiene datos en la calculadora
- WHEN hace click en "Exportar mis datos"
- THEN el navegador descarga un archivo `.json` con todos los datos
- AND el JSON es válido y parseable

---

### Requirement: Importar Datos

El sistema MUST permitir importar datos desde un JSON exportado previamente.

- El sistema MUST validar que el JSON tiene la estructura `RentabilidadStore` correcta.
- El sistema MUST mostrar advertencia: "Importar sobrescribirá tus datos actuales."
- El sistema MUST requerir confirmación antes de aplicar.
- Si el JSON es inválido, MUST mostrar error descriptivo.

#### Scenario: Importación exitosa

- GIVEN el usuario tiene un archivo JSON válido exportado de MIA
- WHEN sube el archivo y confirma
- THEN los datos se cargan en el store y localStorage
- AND la calculadora refleja los datos importados

#### Scenario: JSON con estructura inválida

- GIVEN el usuario sube un JSON con estructura incorrecta
- WHEN hace click en "Importar"
- THEN el sistema muestra: "El archivo no es un export válido de MIA"
- AND NO modifica los datos existentes

---

### Requirement: Borrar Datos

El sistema MUST permitir limpiar todos los datos con confirmación doble.

- El sistema MUST mostrar botón "Limpiar todos mis datos".
- El sistema MUST mostrar modal de confirmación: "Esta acción es irreversible."
- El sistema MUST requerir que el usuario escriba "CONFIRMAR" para proceder.
- Al confirmar, MUST eliminar todas las keys de localStorage de MIA.
- El sistema MUST redirigir a `/` tras borrar.

#### Scenario: Borrado confirmado

- GIVEN el usuario hace click en "Limpiar todos mis datos"
- AND escribe "CONFIRMAR" en el campo de verificación
- WHEN hace click en "Borrar definitivamente"
- THEN se eliminan las keys `mia-user` y `mia-rentabilidad` de localStorage
- AND el usuario es redirigido a `/`

#### Scenario: Borrado cancelado o texto incorrecto

- GIVEN el modal de confirmación está abierto
- WHEN el usuario hace click en "Cancelar" o el texto no es exactamente "CONFIRMAR"
- THEN el modal se cierra
- AND NO se borra ningún dato

---

### Non-Functional Requirements

- **Observabilidad:** El cambio de moneda base dispara evento GTM `currency_changed`.
- **UX:** Usar shadcn/ui `AlertDialog` para todas las confirmaciones destructivas.
