# Proposal: MIA Platform v1 — Construcción Inicial

**Change name:** `mia-platform-v1`  
**Date:** 2026-04-29  
**Author:** Moneyflow Engineering  
**Status:** Approved

---

## Intent

Construir desde cero la plataforma **Moneyflow** (by MIA): landing home premium + calculadora de rentabilidad completa con 5 módulos (Configuración, Inversiones, Transacciones, Cortes, Resultados), registro de usuario local, exportación a PDF brandeado, y analytics completo vía GTM.

## Motivation

- Crear el primer lead magnet digital de Moneyflow: una calculadora de rentabilidad que replica la lógica de "Calculadora Inversiones V1.xlsx"
- Capturar leads (registro de usuario) antes de implementar backend
- Trackear comportamiento del usuario para optimizar conversión
- Entregar reporte de portafolio profesional descargable en PDF

## Scope

### In Scope

- Landing home (`/`) con Hero animado, secciones de producto, footer
- Calculadora de Rentabilidad (`/calculadoras/rentabilidad`) — 5 módulos completos
- Índice de calculadoras (`/calculadoras`)
- Perfil de usuario (`/perfil`) — configuración, export/import JSON
- Sistema de registro en modal (localStorage, sin backend)
- XIRR Newton-Raphson (3 dimensiones: local, USD, USD→local)
- TRM en tiempo real via ExchangeRate-API con cache 1h
- PDF brandeado descargable (`@react-pdf/renderer`)
- Analytics: GTM + GA4 + Meta Pixel + Microsoft Clarity (9 eventos)
- Persistencia: Zustand + localStorage

### Out of Scope (v1)

- Backend / base de datos
- Autenticación real (Clerk/NextAuth)
- Múltiples portafolios por usuario
- Marketplace de infoproductos
- Calculadoras adicionales (interés compuesto, FIRE, deuda)

## Affected Areas

- `app/` — rutas y layouts (nuevo proyecto)
- `components/` — todos los componentes (nuevo)
- `lib/` — XIRR, exchange-rate, PDF helpers (nuevo)
- `stores/` — Zustand (nuevo)
- `types/` — TypeScript types (nuevo)

## Capabilities

### New Capabilities

1. **landing-home** — Página de presentación con animaciones premium y key visuals Moneyflow
2. **user-registration** — Captura de datos de usuario (nombre, email, moneda base) en localStorage
3. **user-profile** — Página de configuración, exportar/importar datos JSON
4. **calculator-config** — Módulo A: configuración de pilares, entidades, monedas, moneda base
5. **calculator-investments** — Módulo B: CRUD de inversiones/buckets
6. **calculator-transactions** — Módulo C: registro de aportes con campos calculados (flowLocal, flowUSD, flowLocalAsUSD)
7. **calculator-snapshots** — Módulo D: cortes de valor actual por inversión con TRM
8. **calculator-results** — Módulo E: tabla de resultados con XIRR (3 dimensiones), TRM live, gráfica Recharts
9. **xirr-engine** — Implementación propia Newton-Raphson de XIRR con tolerancia 1e-6
10. **trm-live** — Fetch de TRM via API proxy con cache 1h, fallback a input manual
11. **pdf-report** — PDF brandeado con logo Moneyflow, resumen y tabla de portafolio
12. **analytics-tracking** — GTM + GA4 + Meta Pixel + Clarity con 9 eventos definidos

## Rollback Plan

Este es un proyecto greenfield. No hay sistema previo que proteger. En caso de regresión:

1. Git revert al último commit estable
2. Los datos de usuario están en localStorage del navegador — no hay riesgo de pérdida de datos del servidor

## Success Criteria

- Build exitoso (`npm run build`) sin errores TypeScript
- XIRR calcula correctamente en los 3 casos definidos en PRD
- Usuario puede completar flujo completo: registro → inversión → transacción → corte → resultados → PDF
- 9 eventos llegan correctamente al GTM dataLayer
- PDF se descarga con logo y datos del portafolio del usuario
- Responsive mobile-first funciona en pantalla 375px
