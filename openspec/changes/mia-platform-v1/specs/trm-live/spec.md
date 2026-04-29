# TRM Live Specification

## Purpose

Fetch del tipo de cambio USD en tiempo real via API proxy con cache de 1 hora. Provee el TRM (Tasa Representativa del Mercado) necesario para cálculos de rentabilidad en múltiples monedas.

## Requirements

### Requirement: API Proxy Route Handler

El sistema MUST implementar un route handler en Next.js que proxea la API externa.

- El route MUST estar en `app/api/exchange-rate/route.ts`.
- El route MUST llamar a `https://open.er-api.com/v6/latest/USD`.
- El route MUST cachear la respuesta en memoria por 1 hora.
- El route MUST retornar `{ rates: Record<string, number>, updatedAt: string }`.
- El route MUST evitar múltiples llamadas simultáneas a la API externa (single-flight pattern).

#### Scenario: Fetch exitoso dentro del cache

- GIVEN el cache tiene datos de menos de 1 hora
- WHEN el cliente llama a `GET /api/exchange-rate`
- THEN el sistema retorna los datos cacheados sin llamar a la API externa

#### Scenario: Cache expirado o vacío

- GIVEN no hay cache o el cache tiene más de 1 hora
- WHEN el cliente llama a `GET /api/exchange-rate`
- THEN el sistema llama a `open.er-api.com`
- AND guarda la respuesta en cache
- AND retorna los datos actualizados

#### Scenario: API externa falla

- GIVEN `open.er-api.com` responde con error (timeout, 5xx)
- WHEN el cliente llama a `GET /api/exchange-rate`
- THEN el sistema retorna HTTP 503 con `{ error: 'exchange_rate_unavailable' }`

---

### Requirement: Hook useExchangeRate

El sistema MUST proveer un hook React para consumir el TRM.

- El hook MUST llamar a `/api/exchange-rate` al montar.
- El hook MUST exponer: `{ rate, isLoading, isError, updatedAt }`.
- El hook MUST usar `baseCurrency` del user store para seleccionar el rate correcto.
- El hook MUST cachear el resultado en memoria por la duración de la sesión.

#### Scenario: TRM cargado exitosamente

- GIVEN la API de exchange-rate está disponible
- WHEN el componente de Resultados monta
- THEN `isLoading` cambia a `false` y `rate` tiene el valor del tipo de cambio
- AND el badge muestra `TRM: $X,XXX COP/USD · Actualizado: hace N min`

#### Scenario: API falla — fallback a input manual

- GIVEN la API de exchange-rate retorna error
- WHEN el componente de Resultados monta
- THEN `isError` es `true`
- AND el sistema muestra un input manual: "Ingresa el TRM de hoy"
- AND el evento GTM `trm_manual_override` se dispara al confirmar el valor manual
- AND el valor manual persiste en el store para la sesión

---

### Requirement: TRM Badge Visual

El sistema MUST mostrar el TRM actual de forma prominente en la pantalla de Resultados.

- El badge MUST mostrar: `TRM: $4,120 COP/USD · Actualizado: hace 3 min`.
- El badge MUST calcular el tiempo relativo desde `updatedAt`.
- El badge MUST tener indicador de estado: verde (reciente < 30min), amarillo (30–60min), rojo (> 1h).

#### Scenario: Badge verde (TRM reciente)

- GIVEN el TRM fue actualizado hace 10 minutos
- WHEN el usuario ve la pantalla de Resultados
- THEN el badge muestra indicador verde
- AND el texto muestra "Actualizado: hace 10 min"

#### Scenario: Badge con input manual activo

- GIVEN el usuario está usando TRM manual
- WHEN el badge se renderiza
- THEN muestra el valor ingresado manualmente
- AND muestra etiqueta "TRM manual" en lugar del tiempo de actualización

---

### Non-Functional Requirements

- **Cache:** La implementación de cache en el route handler MUST ser en memoria del proceso Node.js (Map). No requiere Redis en v1.
- **Timeout:** El fetch a la API externa MUST tener timeout de 5 segundos.
- **Seguridad:** No exponer la URL de la API externa directamente al cliente.
