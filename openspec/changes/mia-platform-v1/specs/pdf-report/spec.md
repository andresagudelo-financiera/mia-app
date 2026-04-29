# PDF Report Specification

## Purpose

Generación de reporte PDF brandeado con identidad visual de Moneyflow. El usuario puede descargar un resumen profesional de su portafolio con el logo de la marca.

## Requirements

### Requirement: Estructura del PDF

El sistema MUST generar un PDF con layout de una sola página o múltiples páginas según el tamaño del portafolio.

**Layout del PDF:**

```
┌─────────────────────────────────────────┐
│  [Logo Moneyflow blanco]         MIA     │  ← Header coral #F04E37
│  Reporte de Rentabilidad de Portafolio  │
│  Usuario: {name} · Fecha: {YYYY-MM-DD}  │
├─────────────────────────────────────────┤
│  RESUMEN DEL PORTAFOLIO                 │
│  Total Invertido: $XX,XXX,XXX COP       │
│  Valor Actual: $XX,XXX,XXX COP          │
│  Ganancia/Pérdida: +$X,XXX,XXX (+XX%)  │
│  TRM usado: $X,XXX COP/USD              │
├─────────────────────────────────────────┤
│  DETALLE POR INVERSIÓN                  │
│  ┌──────────┬────────┬────────┬─────┐   │
│  │Inversión │Invertido│Valor  │TIR  │   │
│  ├──────────┼────────┼────────┼─────┤   │
│  │...       │...     │...    │...  │   │
│  └──────────┴────────┴────────┴─────┘   │
├─────────────────────────────────────────┤
│  moneyflow.co · @moneyflowco            │  ← Footer
│  Generado por MIA Platform              │
└─────────────────────────────────────────┘
```

- El PDF MUST usar `@react-pdf/renderer` (client-side, sin servidor).
- El header MUST tener fondo coral `#F04E37` con logo Moneyflow (versión blanca).
- El nombre del archivo MUST ser `mia-reporte-YYYY-MM-DD.pdf`.

#### Scenario: Generación y descarga del PDF

- GIVEN el usuario tiene inversiones con resultados calculados en el Módulo E
- WHEN hace click en "Descargar Reporte PDF"
- THEN se genera el PDF con todos los datos del portafolio
- AND el navegador lo descarga automáticamente
- AND el PDF incluye logo Moneyflow en el header

---

### Requirement: Datos Incluidos en el PDF

El sistema MUST incluir los siguientes datos en el PDF.

- **Header:** Logo Moneyflow blanco, título "Reporte de Rentabilidad", nombre del usuario, fecha de generación.
- **Resumen:** Total invertido, valor actual, ganancia/pérdida total, TRM usado.
- **Tabla de detalle:** Una fila por inversión con columnas: Nombre, Pilar, Total Invertido, Valor Actual, Ganancia/Pérdida, TIR (formato `%`).
- **Footer:** URL del sitio, nombre de la plataforma.

#### Scenario: PDF con múltiples inversiones

- GIVEN el portafolio tiene 10 inversiones con resultados
- WHEN se genera el PDF
- THEN la tabla incluye las 10 filas
- AND el resumen refleja los totales correctos de las 10 inversiones

#### Scenario: Inversión sin TIR calculable

- GIVEN una inversión tiene TIR = null (no converge)
- WHEN se genera el PDF
- THEN la columna TIR de esa inversión muestra "N/A"

#### Scenario: PDF sin datos de resultados

- GIVEN el portafolio no tiene ninguna inversión con corte registrado
- WHEN el usuario hace click en "Descargar PDF"
- THEN se muestra mensaje: "Agrega al menos un corte para generar el reporte"
- AND NO se genera el PDF

---

### Requirement: Formato de Números en PDF

El sistema MUST formatear los números correctamente según la moneda.

- Montos en COP MUST formatearse como: `$5,850,000 COP`.
- Montos en USD MUST formatearse como: `$2,500 USD`.
- TIR MUST formatearse como: `17.48%`.
- Ganancia positiva MUST ser verde; pérdida MUST ser roja (usando colores en el PDF).

#### Scenario: Formateo de montos COP

- GIVEN una inversión tiene `totalInvestedLocal = 5000000`
- WHEN se renderiza en el PDF
- THEN muestra `$5,000,000 COP` con separador de miles

---

### Non-Functional Requirements

- **Performance:** La generación del PDF MUST completar en < 3 segundos para portafolios de hasta 50 inversiones.
- **Assets:** El logo Moneyflow (blanco) MUST estar incluido como asset estático en el proyecto (`/public/logo-mf-blanco.png`).
- **Tamaño:** El PDF generado MUST ser < 2MB para portafolios normales.
- **Fonts:** El PDF MUST usar una fuente compatible con `@react-pdf/renderer` (Helvetica o fuente embebida).
