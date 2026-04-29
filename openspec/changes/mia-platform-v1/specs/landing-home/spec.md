# Landing Home Specification

## Purpose

Página de entrada a MIA Platform. Presenta la propuesta de valor de Moneyflow, genera confianza y dirige al usuario hacia la calculadora de rentabilidad como primer punto de entrada al ecosistema.

## Requirements

### Requirement: Hero Section

La sección Hero MUST mostrar una propuesta de valor clara con CTA hacia la calculadora.

- El sistema MUST renderizar un headline principal con la propuesta de valor de MIA.
- El sistema MUST mostrar un CTA primario que navega a `/calculadoras/rentabilidad`.
- El sistema MUST mostrar un CTA secundario que navega a `/calculadoras`.
- El sistema MUST mostrar animaciones de entrada (Framer Motion) con stagger en los elementos del Hero.
- El sistema MUST usar un key visual de Moneyflow como imagen de fondo o ilustración.
- El sistema SHOULD mostrar el logo Moneyflow en el navbar.

#### Scenario: Usuario llega a la landing por primera vez

- GIVEN el usuario navega a `/`
- WHEN la página carga completamente
- THEN el Hero es visible con headline, subheadline y dos CTAs
- AND las animaciones de entrada se ejecutan en secuencia con stagger

#### Scenario: Click en CTA primario

- GIVEN el usuario está en la landing
- WHEN el usuario hace click en "Calcular mi rentabilidad"
- THEN el sistema navega a `/calculadoras/rentabilidad`
- AND el evento GTM `cta_hero_click` se dispara con `{cta: 'primary'}`

#### Scenario: Click en CTA secundario

- GIVEN el usuario está en la landing
- WHEN el usuario hace click en "Ver todas las herramientas"
- THEN el sistema navega a `/calculadoras`
- AND el evento GTM `cta_hero_click` se dispara con `{cta: 'secondary'}`

---

### Requirement: Sección ¿Qué es MIA?

El sistema MUST mostrar los pilares del producto en cards visuales.

- El sistema MUST mostrar 3–4 cards: Herramientas financieras gratuitas, Educación práctica, Infoproductos (próximamente).
- El sistema MUST usar glassmorphism sobre fondo dark.
- El sistema SHOULD animar las cards al entrar en viewport (Intersection Observer + Framer Motion).

#### Scenario: Cards visibles al hacer scroll

- GIVEN el usuario hace scroll hacia la sección ¿Qué es MIA?
- WHEN los cards entran al viewport
- THEN cada card se anima con fade-in + slide-up
- AND las animaciones tienen stagger de 100ms entre cards

---

### Requirement: Grid de Calculadoras

El sistema MUST mostrar las calculadoras disponibles como lead magnets.

- El sistema MUST mostrar al menos una card activa: "Calculadora de Rentabilidad".
- El sistema MUST mostrar el estado de cada calculadora (disponible / próximamente).
- Las cards "próximamente" MUST estar deshabilitadas visualmente (opacity reducida).
- El sistema MUST mostrar: nombre, descripción, ícono y botón de acción en cada card.

#### Scenario: Click en calculadora disponible

- GIVEN la calculadora de Rentabilidad está en estado "disponible"
- WHEN el usuario hace click en "Usar gratis →"
- THEN el sistema navega a `/calculadoras/rentabilidad`

#### Scenario: Card de próximamente

- GIVEN una calculadora tiene estado "próximamente"
- WHEN el usuario intenta interactuar con la card
- THEN el botón está deshabilitado y no navega a ninguna ruta

---

### Requirement: Footer

El sistema MUST mostrar footer con links de navegación y marca.

- El sistema MUST mostrar links a: Home, Calculadoras, Política de privacidad.
- El sistema MUST mostrar el logo Moneyflow (versión blanca sobre fondo dark).
- El sistema MUST mostrar copyright: "© 2026 MIA by Moneyflow".
- El sistema SHOULD mostrar links a redes sociales de Moneyflow.

#### Scenario: Links de navegación del footer

- GIVEN el usuario está en cualquier página
- WHEN el usuario hace click en un link del footer
- THEN el sistema navega a la ruta correspondiente

---

### Requirement: Responsive Mobile-First

El sistema MUST ser completamente usable en pantallas de 375px de ancho.

- El sistema MUST adaptar el Hero a layout de una columna en mobile.
- El sistema MUST mostrar el navbar colapsable en mobile (hamburger menu).
- Las cards del grid MUST apilarse verticalmente en mobile.

#### Scenario: Vista en móvil 375px

- GIVEN el usuario accede desde un dispositivo con pantalla de 375px
- WHEN la página carga
- THEN todos los elementos son visibles sin scroll horizontal
- AND los CTAs son accesibles y tienen área de toque mínima de 44px

---

### Non-Functional Requirements

- **Performance:** LCP < 2.5s. Hero image optimizado con `next/image`.
- **SEO:** Meta title, description, OG image configurados en `metadata` de Next.js.
- **Accessibility:** CTAs con aria-label descriptivo. Contraste AA mínimo.
- **Fonts:** Syne (headings) + Inter (body) desde Google Fonts con `next/font`.
