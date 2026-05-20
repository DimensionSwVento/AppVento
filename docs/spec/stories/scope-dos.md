---
version: 3.0
date: 2026-04-20
scope: contractual-segunda-entrega
origen: continuación del scope-primera-entrega.md
equipo: 1 fulltime (winx) + 2 part-time
estado: borrador propuesto — HUs estrictamente del spec del cliente, con tareas técnicas detalladas adentro
---

# Scope Contractual — Segunda Entrega

Sigue al [scope-primera-entrega.md](./scope-primera-entrega.md). Continuación del flujo: selección → variables → características → informe.

Cada HU listada aquí viene **literalmente del spec del cliente**. Las tareas técnicas necesarias para implementarla (endpoints backend, helpers, componentes auxiliares) se listan **dentro de la HU**, no como HUs separadas.

> **Estado de precondiciones**: scope-1 entregado, feedback v1 atendido. US05 bloqueada esperando reunión con equipo de datos. Modelo multicriterio en desarrollo — donde no haya datos reales se usan placeholders.

---

## Reuniones requeridas

| Reunión | Objetivo | HUs bloqueadas |
|---------|----------|----------------|
| **Datos — Definición de "Características del Proyecto"** | El enfoque ya no es turbina-por-turbina (eso cambió). La reunión define cómo se modela ahora. | US05 (las 3 HUs) |
| **Modelo multicriterio — Output esperado** | Confirmar entregables del modelo para conectar datos reales al informe | US03 (parte viabilidad) y US06 datos reales (diferidos) |

---

## Resumen de historias scope-dos

| Prioridad | ID | Historia | Épica | Preparado_para_desarrollo? |
|-----------|----|----------|-------|--------|
| 🔴 Crítica | **US03-P2** | Cálculo de área y viabilidad del área (Mapa Parte 2) | E2 | ✅ Listo (viabilidad con placeholders hasta modelo) |
| 🟡 Alta | **US03-AC10** | Heatmap clippeado a la selección (variables activas) | E2 | ✅ Listo |
| 🟡 Alta | **US03-AC11** | Toggle de paleta GIS (inferno / viridis) | E2 | ✅ Listo |
| 🟡 Alta | **US03-AC12** | Bloqueo de selección fuera de fase Selección de Área | E2 | ✅ Listo |
| 🟢 Media | **US03-AC13** | Leyenda del heatmap (rampa de paleta vigente, siempre visible) | E2 | ✅ Listo |
| 🟡 Alta | **US04-AC1** | Subpágina Dimensiones (cards colapsables, switches, búsqueda, contador X/Y) | E4 | ✅ Listo |
| 🟡 Alta | **US04-AC2** | Tooltip con definición de cada variable | E4 | ✅ Listo |
| 🟡 Alta | **US05-AC1** | Formulario dinámico para aerogeneradores | E5 | ⏸ Reunión datos |
| 🟡 Alta | **US05-AC2** | Selección de catálogo de modelos | E5 | ⏸ Reunión datos |
| 🟡 Alta | **US05-AC3** | Validación de rangos técnicos permitidos | E5 | ⏸ Reunión datos |
| 🔴 Crítica | **US06-AC3** | Previsualización en pantalla del informe PDF | E6 | ⏸ ADR-013 |

**Total: 11 HUs** (5 + 2 + 3 + 1)

---

# E2 — Mapa SIG (Parte 2: Calcular área y viabilidad)

> **Objetivo:** Calcular y mostrar el área (km²) y la viabilidad agregada del área seleccionada en el mapa como insumo del flujo y del informe.

**Dependencias:** US03, US03-AC6

---

### US03-P2 — Cálculo de Área y Viabilidad del Área Seleccionada
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E2 (Mapa SIG — Parte 2)
- **Dependencia:** US03, US03-AC6
- **Criterios de Aceptación:**
  1. Cálculo de área usando `cellArea(h, 'km2')` de h3-js, sumado sobre `selectedHexes`
  2. Área visible en un **panel flotante pequeño a la derecha del mapa** (siempre visible, ~180-220px de ancho) con formato `1,234.56 km²` y separadores de miles
  3. Indicador de viabilidad del área seleccionada — valor agregado a partir de los scores de los hexágonos, mostrado en el mismo panel
  4. Actualización reactiva al añadir/quitar hexágonos sin recargar
  5. Comportamiento robusto con `0 hexágonos seleccionados` → `0 km²` y sin indicador de viabilidad, sin crash
  6. Responsive: en mobile el panel se acopla en la parte inferior (no superpuesto al mapa)
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Helper**: `Vento/src/app/Utils/areaCalc.ts` — `calcArea(hexes: Set<string>): number` y `calcViability(hexes, scores): number`
  - 📦 **FE Contenedor flotante**: `Vento/src/app/Components/MapInfoPanel.tsx` — panel flotante a la derecha del mapa, ancho ~200px, siempre visible. Reutilizable para futuros widgets (tooltips US04-AC2, leyenda, etc.)
  - 📦 **FE Componente**: `<AreaDisplay>` dentro del panel — renderiza el área + valor de viabilidad. Lee `selectedHexes` del context con `useAprincipal()` y usa `useMemo` para no recalcular en cada render
  - 📦 **FE Integración**: insertar `<MapInfoPanel>` en [Map.tsx](../../../Vento/src/app/Components/Map.tsx) como hijo del contenedor del mapa (posición `absolute right-3 top-3`)
  - 📦 **BE (opcional)**: si los scores de viabilidad por hex no están ya en los tiles, exponer `GET /api/scores?h3=...` — **verificar con backend antes de empezar si ya existe**
  - 🧪 **Tests**: unitario de `areaCalc.ts` (0 hex, 1 hex, N hex); integración del componente al cambiar `selectedHexes`
- **Notas:**
  - El panel es la base UI para US04-AC2 (tooltips variables) y posibles widgets futuros — diseño escalable.
  - La viabilidad usa scores actuales del backend (placeholders mientras el modelo multicriterio avanza). Cuando llegue versión avanzada, los valores se reemplazan sin tocar el cálculo ni el componente.

---

### US03-AC10 — Heatmap Clippeado a la Selección (agregado multi-variable ponderado, res 8)
- **Prioridad:** 🟡 Alta
- **Épica origen:** E2 (Mapa SIG)
- **Dependencia:** US03 (selección de área), US04-AC1 (variables activas)
- **Criterios de Aceptación:**
  1. El heatmap se pinta **solo sobre el área cubierta por `selectedHexes`** — fuera de la selección los hexes no muestran color de variables
  2. El heatmap refleja el **agregado multi-variable** de las variables activas (de US04-AC1). Pesos signados en `variableWeights.ts`. **Las penalizadoras sólo restan** del promedio aditivo, no se mezclan en él: `final = clamp(baseAditivo - penalty, 0, 1)`. Al añadir/quitar variables el heatmap se recompone — ejemplo: añadir "Cigarrillos ilegales" enfría hexes que eran calientes por "Velocidad del viento"
  3. Pintado **siempre a resolución H3 = 8** (la más fina del rango soportado): los hexes seleccionados de menor resolución se expanden a sus hijos res-8 antes de colorear, ignorando el promedio del hex padre
  4. Color de cada celda res-8 deriva del agregado normalizado (0..1) usando la paleta vigente (de US03-AC11)
  5. Si no hay variables activas → no se renderiza heatmap (selección sólo con su color de borde)
  6. Si no hay selección → no se renderiza heatmap (mapa base limpio)
  7. Actualización reactiva al cambiar selección o variables activas sin recargar
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Helper**: `Vento/src/app/Utils/heatmap.ts` — `expandToRes8` (usa `cellToChildren`), `scoreFor(variableId, hex)` (placeholder casi-uniforme [0.6, 0.8) por hex, independiente de la variable, para observar el efecto neto al activar variables), `aggregateScore(activeVariables, hex)` (promedio aditivo de positivas menos promedio de penalizadoras, clamp [0,1])
  - 📦 **FE Helper de pesos**: `Vento/src/app/Utils/variableWeights.ts` — `Record<string, number>` con peso signado por variable. Aislado del catálogo para que el cliente reemplace los valores desde BD sin tocar la UI ni el cálculo
  - 📦 **FE Map.tsx**: nueva `PolygonLayer` dedicada al heatmap que recibe los hexes res-8 + paleta + `aggregateScore`
  - 📦 **FE**: lectura de `activeVariables` vía `VariablesContext` (de US04-AC1)
  - 📦 **BE**: **no requiere endpoint nuevo** todavía — el clipping, expansión a res 8 y agregado se hacen client-side. Cuando el cliente entregue los pesos en BD se reemplaza `variableWeights.ts` por un fetch al backend manteniendo la misma forma
  - 🧪 **Tests**: `expandToRes8` produce hijos esperados; `scoreFor` determinista; `aggregateScore` con 0/1/N variables, polaridad opuesta, ignora pesos 0; render con/sin variables activas y con/sin selección

---

### US03-AC11 — Toggle de Paleta GIS (Inferno / Viridis)
- **Prioridad:** 🟡 Alta
- **Épica origen:** E2 (Mapa SIG)
- **Dependencia:** US03-AC10
- **Criterios de Aceptación:**
  1. Control visible en la parte superior del mapa para alternar entre dos paletas GIS estándar
  2. Opción **Inferno**: rampa morado → rojo → amarillo (térmica)
  3. Opción **Viridis**: rampa morado → azul → verde → amarillo (perceptualmente uniforme)
  4. El cambio de paleta actualiza inmediatamente los colores del heatmap clippeado (US03-AC10)
  5. Paleta seleccionada se mantiene mientras el usuario navega entre fases (selección, dimensiones, características, informe)
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Utils**: `Vento/src/app/Utils/gisPalette.ts` — exporta `INFERNO` y `VIRIDIS` como arrays de stops `[t, [r,g,b]]` + helper `interpolateColor(palette, score)`
  - 📦 **FE Componente**: `<PaletteToggle>` posicionado `absolute top-3 left-3` o similar en `Map.tsx`
  - 📦 **FE Estado**: paleta vigente en context (extender `AccionPrincipalContext` o nuevo `MapPaletteContext`)
  - 🧪 **Tests**: cambio de paleta dispara re-render del heatmap; `interpolateColor` devuelve color correcto en stops conocidos

---

### US03-AC12 — Bloqueo de Selección Fuera de Fase "Selección de Área"
- **Prioridad:** 🟡 Alta
- **Épica origen:** E2 (Mapa SIG)
- **Dependencia:** US03
- **Criterios de Aceptación:**
  1. Cuando `accion === "seleccion-area"` → click en el mapa modifica `selectedHexes` (comportamiento actual)
  2. Cuando `accion !== "seleccion-area"` (dimensiones, características, informe) → click en el mapa **NO** modifica `selectedHexes`
  3. Los hexes seleccionados permanecen visibles en todas las fases (no se borran al cambiar de acción)
  4. Feedback visual al hover sobre el mapa en fase bloqueada (cursor `not-allowed` o similar) para comunicar el estado
  5. Garantiza coherencia entre el área seleccionada, el heatmap mostrado y el informe descargado
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Map.tsx**: condicionar el handler `onClick` de la PolygonLayer de selección a `accion === "seleccion-area"`; mantener resto del rendering
  - 📦 **FE Cursor**: aplicar `getCursor` condicional al DeckGL container según `accion`
  - 🧪 **Tests**: click en fase "dimensiones" no modifica `selectedHexes`; click en fase "seleccion-area" sí; los hexes seleccionados sobreviven al cambio de acción

---

### US03-AC13 — Leyenda del Heatmap + Ayuda "?"
- **Prioridad:** 🟢 Media
- **Épica origen:** E2 (Mapa SIG)
- **Dependencia:** US03-AC10, US03-AC11
- **Criterios de Aceptación:**
  1. Cuando el heatmap es visible (al menos una variable activa + selección), se muestra una leyenda junto al `PaletteToggle` arriba del mapa
  2. La leyenda es **siempre visible** mientras el heatmap esté activo (pill con rampa + etiquetas, no requiere acción para mostrarse)
  3. Renderiza la **rampa de la paleta vigente** (inferno o viridis) como gradiente horizontal usando los stops de `heatmap.ts`
  4. Etiquetas en los extremos: **"Baja"** (izquierda) ←→ **"Alta"** (derecha) — interpretación de viabilidad
  5. Cambia de gradiente automáticamente al alternar paleta (US03-AC11)
  6. **Icono "?" al final** de la pill: hover abre un popover con la descripción de cómo funciona el heatmap (variables que suman vs restan, rol de la paleta). Click sobre "?" alterna el popover de forma sticky. Cierre con ESC, click fuera o segundo click
  7. Accesibilidad: rampa con `role="img"` + `aria-label`; botón "?" con `aria-expanded`/`aria-controls`; popover con `role="tooltip"`
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Componente**: `<HeatmapLegend palette={palette} />` — gradiente CSS desde `INFERNO_STOPS` / `VIRIDIS_STOPS`, botón "?" con estado `open` controlado por hover/focus/click + listeners de click-fuera y ESC
  - 📦 **FE Integración**: en `Map.tsx`, montado al lado de `<PaletteToggle>` dentro del mismo contenedor flex, condicionado a `activeVariables.size > 0 && selectedHexes.size > 0`
  - 🧪 **Tests**: pill siempre visible; hover abre popover, mouseleave lo cierra; click alterna; ESC cierra; gradiente cambia entre paletas

---

# E4 — Configuración de Dimensiones (Variables)

> **Objetivo:** Permitir al analista visualizar las variables del análisis agrupadas por dimensión, con definición clara y feedback de progreso.

**Dependencias:** US01 (sesión válida), US03 (área seleccionada)

---

### US04-AC1 — Subpágina Dimensiones (Cards Colapsables, Switches, Búsqueda, Contador X/Y)
- **Prioridad:** 🟡 Alta
- **Épica origen:** E4 (Variables)
- **Dependencia:** —
- **Origen del diseño:** Figma de la subpágina Dimensiones (cliente, mayo 2026)
- **Criterios de Aceptación:**
  1. Subpágina renderizada en el SideBar cuando `accion === "dimensiones"`, con título "Configura las variables de interés por cada dimensión"
  2. **Search bar** "Buscar variables" arriba de las cards — filtra variables por label o descripción dentro de todas las dimensiones
  3. Variables agrupadas en las **5 dimensiones** (ambiental, técnica, regulatoria, socioeconómica, macroeconómica)
  4. Cada dimensión se renderiza como **card colapsable** con header que muestra: nombre de dimensión + **contador `X / Y`** (X = variables activas, Y = total de variables de la dimensión) + chevron de expandir/colapsar
  5. Cards colapsables individualmente — el estado de expandido/colapsado de cada dimensión es independiente
  6. Cuando una card está expandida, muestra la lista de variables de esa dimensión. Cada fila contiene: **switch** + **label** de la variable + **descripción breve** + **icono** (ℹ para tooltip, definido en US04-AC2)
  7. El switch determina si la variable está **activa** (encendido = pinta su contribución en el heatmap del mapa, vía US03-AC10) o **inactiva**
  8. Activar/desactivar un switch actualiza inmediatamente el contador `X / Y` del header de su dimensión
  9. Botón "Siguiente paso" al final de la subpágina avanza la fase a "características"
  10. **Multi-selección con pesos signados**: múltiples variables pueden estar activas simultáneamente. Cada variable tiene un peso signado en `Vento/src/app/Utils/variableWeights.ts` (positivo = aditiva, negativo = penalizadora; magnitud = importancia relativa). **Las penalizadoras sólo restan**: no entran al promedio aditivo, restan directamente del base aditivo. Ejemplo: activar "Cigarrillos ilegales" enfría los hexes donde se concentra esa actividad aunque "Velocidad del viento" sea excelente
  11. Estado de la variable activa vive en context en memoria (no persiste entre sesiones — la decisión de persistencia se toma cuando se justifique)
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Catálogo**: `Vento/src/app/Utils/variablesCatalog.ts` — variables hardcoded agrupadas por dimensión (mientras `GET /api/variables` no exista) con `{ id, dimension, label, description, color }`. Colores en un módulo aparte para cambio fácil futuro
  - 📦 **FE Context**: `Vento/src/app/Utils/VariablesContext.tsx` — `activeVariables: Set<string>`, `toggleVariable(id)`, `isActive(id)`, contadores derivados por dimensión
  - 📦 **FE Componente**: reescribir [Dimensions.tsx](../../../Vento/src/app/Components/Dimensions.tsx) con search bar + cards colapsables
  - 📦 **FE Componente**: `<DimensionCard>` — header colapsable + body con stack de `<VariableSwitch>`
  - 📦 **FE Componente**: `<VariableSwitch>` — switch + label + descripción + icono (ℹ delega a US04-AC2)
  - 📦 **FE Provider**: añadir `VariablesProvider` en [Providers.tsx](../../../Vento/src/app/Providers.tsx) para que el mapa (US03-AC10) y la subpágina compartan estado
  - 📦 **BE (diferido)**: `GET /api/variables` en FastAPI — **no es bloqueante**, se conecta cuando esté listo; el catálogo hardcoded inicial es la fuente de verdad temporal
  - 🧪 **Tests**: render con 5 cards, expand/collapse individual, switch toggle actualiza contador, search filtra variables por label y descripción
- **Estado:** ✅ Sin bloqueantes (catálogo hardcoded)

---

### US04-AC2 — Tooltip Accesible con Definición de cada Variable
- **Prioridad:** 🟡 Alta
- **Épica origen:** E4 (Variables)
- **Dependencia:** US04-AC1
- **Criterios de Aceptación:**
  1. Cada variable tiene un icono ℹ al lado del label dentro de la fila de `<VariableSwitch>`
  2. Click sobre el icono abre un popover en español con: descripción de la variable + indicador **"Suma a viabilidad"** o **"Resta a viabilidad"** (derivado del signo de `variableWeights.ts`)
  3. Popover se cierra: ESC, click fuera, segundo click sobre el icono
  4. Texto del popover viene del campo `description` del catálogo (o `definition` del endpoint cuando exista)
  5. Accesibilidad: el botón usa `aria-expanded`/`aria-controls` y el popover tiene `role="tooltip"`
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Componente**: `<VariableTooltip>` con estado local `open` + listeners (mousedown fuera, keydown ESC) + cleanup en `useEffect`
  - 📦 **FE Integración**: `<VariableSwitch>` reemplaza el `title=` nativo por `<VariableTooltip variable={variable} />`
  - 📦 **FE Datos**: descripción del catálogo hardcoded (US04-AC1); polaridad de `weightFor(variable.id)` en `variableWeights.ts`
  - 🧪 **Tests**: click abre/cierra; ESC y click-fuera cierran; polaridad correcta para viento (suma) y cigarrillos-ilegales (resta)
- **Estado:** ✅ Sin bloqueantes

---

# E5 — Características del Proyecto

> **Objetivo:** Capturar las características del proyecto eólico. **Enfoque pendiente de reunión con equipo de datos** — el cliente confirmó que ya no es turbina-por-turbina como se planteó originalmente, la nueva definición se acuerda en la reunión.

**Dependencias:** US03 (área), US04 (variables configuradas)

> ⏸ Todas las HUs de esta épica están **bloqueadas hasta la reunión**. Las ACs listadas son las del spec original; la reunión puede modificarlas, mantenerlas o reemplazarlas.

---

### US05-AC1 — Formulario Dinámico para Aerogeneradores
- **Prioridad:** 🟡 Alta
- **Épica origen:** E5 (Proyecto)
- **Dependencia:** Reunión equipo de datos (definición de campos)
- **Criterios de Aceptación (provisionales):**
  1. Formulario con los campos que se definan en la reunión con el equipo de datos
  2. Los campos se renderizan dinámicamente según definición (añadir/quitar campos no requiere rediseño)
  3. Cada campo tiene label en español, tipo apropiado y placeholder
  4. Layout responsive (grid desktop, columna mobile)
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Componente**: nuevo `<CaracteristicasProyectoForm>` en `Vento/src/app/Components/`
  - 📦 **FE Tipos**: definir interfaz `CaracteristicasPayload` en `Vento/src/app/types/`
  - 📦 **BE (posiblemente)**: endpoint que reciba/persista las características — definir si es transitorio (solo para informe) o persistente en DB. **A confirmar en reunión**
  - 🧪 **Tests**: render con N campos, captura de valores correcta
- **Estado:** ⏸ **BLOQUEADA** — espera reunión

---

### US05-AC2 — Selección de Catálogo de Modelos
- **Prioridad:** 🟡 Alta
- **Épica origen:** E5 (Proyecto)
- **Dependencia:** Reunión equipo de datos
- **Criterios de Aceptación (provisionales):**
  1. Selector con dropdown searchable de modelos del catálogo
  2. Búsqueda filtra por fabricante y/o nombre del modelo
  3. Al seleccionar un modelo, los campos relevantes del formulario se autocompletan con sus valores nominales
  4. Opción "modelo personalizado" permite ingresar valores manualmente
- **Tareas técnicas / desarrollo:**
  - 📊 **Datos**: definir formato del catálogo y su mantenedor en la reunión (cliente, investigación, equipo dev)
  - 📦 **FE Componente**: `<TurbineCatalogSelector>` con búsqueda local (`fuse.js`-like o simple `includes`)
  - 📦 **FE/BE Fuente**: decidir entre JSON estático en `public/data/turbines.json` o endpoint backend (decisión a documentar en mini-ADR o nota en la HU)
  - 🧪 **Tests**: búsqueda filtra correctamente; selección autocompleta el form
- **Estado:** ⏸ **BLOQUEADA** — espera reunión

---

### US05-AC3 — Validación de Rangos Técnicos Permitidos
- **Prioridad:** 🟡 Alta
- **Épica origen:** E5 (Proyecto)
- **Dependencia:** Reunión equipo de datos (rangos exactos), US05-AC1
- **Criterios de Aceptación (provisionales):**
  1. Cada campo numérico valida que el valor caiga dentro del rango técnico permitido (rangos definidos en la reunión)
  2. Mensaje inline en español al usuario si el valor está fuera de rango
  3. El botón "Siguiente paso" queda deshabilitado mientras haya errores
  4. Errores se limpian cuando el usuario corrige el valor
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Validación**: usar Zod (recomendado) o validación manual; schema deriva de la definición de campos
  - 📦 **FE Componente**: `<FieldError>` reutilizable para mensajes
  - 📊 **Datos**: rangos del catálogo (ver US05-AC2) — vienen del mismo origen
  - 🧪 **Tests**: valor fuera de rango bloquea submit; valor válido permite avanzar
- **Estado:** ⏸ **BLOQUEADA** — espera reunión

---

# E6 — Reportes (Parte 1: Generación y Visualización)

> **Objetivo:** Mostrar los resultados del informe de viabilidad en una pantalla nativa de la app (siguiendo el diseño Figma) — scores por dimensión + valor de viabilidad agregado — con botón de descarga de PDF. La generación del PDF y el template van dentro de esta HU como tareas técnicas.

**Dependencias:** US03, US04, US05; diseño Figma del informe

---

### US06-AC3 — Pantalla de Informe (UI nativa según Figma) + Descarga PDF
- **Prioridad:** 🔴 Crítica
- **Épica origen:** E6 (Reportes — Parte 1: Generación y Visualización)
- **Dependencia:** ADR-013 (decisión de tecnología de PDF), Figma del informe, US04 (variables), US05 (características — datos placeholder si la reunión no llegó)
- **Criterios de Aceptación:**
  1. Pantalla de informe en UI nativa de la app (no iframe), siguiendo el diseño Figma del informe
  2. Muestra los resultados por dimensión — cada una de las 5 dimensiones (técnica, ambiental, regulatoria, socioeconómica, macroeconómica) con su score
  3. Muestra el valor de viabilidad agregado del área seleccionada
  4. Botón "Descargar PDF" visible en la pantalla
  5. Al hacer click en el botón, se genera y descarga un PDF con el mismo contenido (scores por dimensión + viabilidad + área + variables + características)
  6. PDF descargado tiene branding institucional (Vento + ANH + EAFIT + mavalan)
  7. Indicador de carga mientras se genera el PDF al descargar
  8. Mensaje de error claro si la generación falla
- **Tareas técnicas / desarrollo:**
  - 🛠️ **ADR-013**: escribir decisión de tecnología — WeasyPrint vs ReportLab vs jsPDF. Recomendado: WeasyPrint
  - 🎨 **UI**: traducir el diseño Figma del informe a componentes React
  - 📦 **FE Página**: `Vento/src/app/informe/page.tsx` con UI nativa del informe + botón descarga
  - 📦 **FE Componentes**: `<DimensionResult>` (muestra una dimensión con su score), `<ViabilityScore>` (valor agregado), `<DownloadPDFButton>`
  - 📦 **FE Llamada**: helper que llama al endpoint y descarga el `Blob` como archivo (`<a download>` o `window.URL.createObjectURL`)
  - 📦 **BE Endpoint**: `POST /api/reports/pdf` que reciba `{ hexes, variables, caracteristicas, scores }` y retorne `application/pdf` con header `Content-Disposition: attachment`
  - 📦 **FE UI**: spinner durante generación + componente `<ErrorBanner>` si falla
  - 🧪 **Tests**: endpoint retorna PDF válido (`application/pdf` ≥ 1KB); componente FE renderiza N dimensiones con scores correctos; botón descarga dispara fetch + descarga del blob; manejo robusto de `0 hexágonos seleccionados`
- **Notas:**
  - La pantalla **NO** usa iframe — es UI nativa que refleja exactamente el Figma
  - El PDF se genera **solo al descargar**, no en cada render de la pantalla
  - Si llegan datos reales del modelo multicriterio durante el sprint, se conectan a la UI y al template sin cambios estructurales
  - Parte 2 (futuro, fuera de este scope): histórico de informes, compartir vía link

---

# Resumen Consolidado

## Resumen por épica

| Bloque | HUs |
|--------|-----|
| E2 (US03-P2, AC10, AC11, AC12) | 4 |
| E4 (US04-AC1, AC2) | 2 |
| E5 (US05-AC1, AC2, AC3) | 3 |
| E6 (US06-AC3) | 1 |
| **Total** | **10** |

## Dependencias

```
US03-P2 ───────────────────────────────────► (independiente)

US04-AC1 ──┬─► US04-AC2
           └─► US03-AC10 (heatmap usa variables activas)

US03-AC10 ──► US03-AC11 (paleta aplica al heatmap)

US03 ──► US03-AC12 (bloqueo de selección)

(Reunión datos) ──► US05-AC1 ──► US05-AC3
                    US05-AC2 (paralelo)

ADR-013 + US04 + US05 (placeholder OK) ──► US06-AC3
```

## Empezables sin reunión (6 HUs)

- US03-P2 (cálculo área + viabilidad placeholder)
- US03-AC10 (heatmap clippeado a selección)
- US03-AC11 (toggle paleta GIS inferno/viridis)
- US03-AC12 (bloqueo de selección fuera de fase)
- US04-AC1 (subpágina dimensiones con cards colapsables, switches, búsqueda)
- US04-AC2 (tooltip de variables)

## Bloqueadas por reunión (3 HUs)

- US05-AC1, AC2, AC3 — todas esperan la reunión con el equipo de datos

## Bloqueadas por decisión interna (1 HU)

- US06-AC3 — espera ADR-013 (decisión interna de winx) + Figma del informe

## Propuesta de asignación

| Dev | HUs |
|-----|-----|
| **Winx (full-time)** | ADR-013 + US06-AC3 (UI Figma + generación + template + descarga) + reviews + reuniones |
| **Part-time A** | US04-AC1 (catálogo hardcoded + cards colapsables + switches + búsqueda) + US04-AC2 (tooltips) |
| **Part-time B** | US03-P2 + US03-AC10/AC11/AC12 (heatmap clippeado + paleta + bloqueo selección) + (tras reunión) US05-AC1/AC2/AC3 |

## Decisiones técnicas pendientes (resumen)

| # | Decisión | Owner |
|---|----------|-------|
| 1 | ADR-013 — Motor PDF | winx |
| 2 | Fuente del catálogo aerogeneradores | reunión datos |
| 3 | Persistencia del proyecto (transitorio vs BD) | reunión datos |

---

## Cierre esperado del scope-dos

- ✅ 8 HUs cerradas (US05 si reunión llegó; si no, parcial)
- ✅ ADR-013 escrito
- ✅ Tests para cada HU (cobertura ≥ tareas técnicas críticas)
- ✅ Deploy a `deploy-test` validado
- ✅ Demo del flujo end-to-end con placeholders donde aplique
