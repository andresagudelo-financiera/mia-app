# User Registration Specification

## Purpose

Captura de datos básicos del usuario (nombre, email, moneda base) al primer acceso a la calculadora. Sin backend en v1 — datos persisten en localStorage.

## Requirements

### Requirement: Modal de Registro Inicial

El sistema MUST presentar un modal de registro al primer acceso a la calculadora.

- El sistema MUST detectar si el usuario ya tiene un perfil en localStorage bajo la key `mia-user`.
- Si NO hay perfil, el sistema MUST abrir el modal de registro automáticamente.
- Si SÍ hay perfil, el sistema MUST omitir el modal completamente.
- El modal MUST tener fondo glassmorphism con logo Moneyflow (blanco).
- El modal MUST ser no-dismissable hasta que el usuario completa el registro.

#### Scenario: Primer acceso a la calculadora

- GIVEN el usuario no tiene perfil en localStorage
- WHEN el usuario navega a `/calculadoras/rentabilidad`
- THEN el modal de registro se abre automáticamente
- AND el usuario no puede interactuar con la calculadora hasta completar el registro

#### Scenario: Acceso subsiguiente

- GIVEN el usuario tiene perfil guardado en localStorage
- WHEN el usuario navega a `/calculadoras/rentabilidad`
- THEN el modal NO aparece
- AND la calculadora carga directamente con los datos del usuario

---

### Requirement: Formulario de Registro

El sistema MUST validar los datos antes de guardar.

- El sistema MUST requerir: `name` (string, no vacío), `email` (formato válido).
- El sistema MUST requerir selección de `baseCurrency` (default: COP).
- El sistema MUST validar con Zod — mostrar errores inline en los campos.
- El sistema MUST generar un UUID local como `id` del perfil.
- El sistema MUST guardar `registeredAt` como ISO date string.

#### Scenario: Registro exitoso

- GIVEN el modal de registro está abierto
- WHEN el usuario ingresa nombre válido, email válido y selecciona moneda
- AND hace click en "Comenzar"
- THEN el perfil se guarda en localStorage bajo key `mia-user`
- AND el modal se cierra
- AND el evento GTM `user_registered` se dispara con `{currency: 'COP', has_email: true}`
- AND el usuario accede a la calculadora

#### Scenario: Email inválido

- GIVEN el modal de registro está abierto
- WHEN el usuario ingresa un email con formato inválido (ej. "juan@")
- AND hace click en "Comenzar"
- THEN el sistema muestra error inline: "Ingresa un email válido"
- AND NO guarda el perfil
- AND NO dispara el evento GTM

#### Scenario: Nombre vacío

- GIVEN el modal de registro está abierto
- WHEN el usuario deja el campo nombre vacío
- AND hace click en "Comenzar"
- THEN el sistema muestra error inline: "El nombre es requerido"
- AND NO guarda el perfil

---

### Requirement: Persistencia del Perfil

El sistema MUST persistir el perfil completo en localStorage.

```typescript
// key: "mia-user"
type UserProfile = {
  id: string               // UUID v4 generado localmente
  name: string
  email: string
  baseCurrency: string     // "COP" por defecto
  registeredAt: string     // ISO 8601
  hasCompletedOnboarding: boolean
}
```

- El sistema MUST serializar las fechas como strings ISO 8601.
- El sistema MUST parsear correctamente al recuperar desde localStorage.

#### Scenario: Persistencia tras recarga

- GIVEN el usuario completó el registro
- WHEN el usuario recarga la página
- THEN el perfil sigue disponible desde localStorage
- AND el nombre del usuario se muestra en el navbar

---

### Non-Functional Requirements

- **Seguridad:** No enviar datos a ningún servidor en v1. Datos solo en localStorage del navegador.
- **Privacidad:** El email solo se usa para personalización local. Informar al usuario en el modal.
