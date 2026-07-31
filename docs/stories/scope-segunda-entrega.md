---
version: 3.0
date: 2026-04-20
scope: contractual-segunda-entrega
origen: continuación del scope-primera-entrega.md
equipo: Mavalan Software
estado: ✅ entregado — Scope 2 cerrado 2026-06-01 (residuales en Sprint 3)
---

# Scope Contractual — Segunda Entrega

Sigue al [scope-primera-entrega.md](./scope-primera-entrega.md). Continuación del flujo: selección → variables → características → informe.

Cada HU listada aquí viene **literalmente del spec del cliente**. Las tareas técnicas necesarias para implementarla (endpoints backend, helpers, componentes auxiliares) se listan **dentro de la HU**, no como HUs separadas.

> **✅ Scope 2 ENTREGADO (cerrado 2026-06-01).** Las HUs de US03P2 / US04 / US05 / US06 se entregaron (US05 con placeholders donde aún faltan datos reales). Los **residuales** — negociación de cambios de alcance de US05 y conexión a **datos reales del modelo** — continúan en el **Sprint 3** (ver [sprint-3.md](sprint-3.md) y [feedback-cliente-v2.md](feedback-cliente-v2.md)). Las marcas "⏸ BLOQUEADA" de más abajo reflejan el estado de **planificación original** del doc, no el estado actual.

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
| 🟡 Alta | **US03-AC12** | Bloqueo de selección fuera de fase Selección de Área | E2 | ✅ Listo |
| 🟡 Alta | **US04-AC1** | Subpágina Dimensiones (cards colapsables, switches, búsqueda, contador X/Y) | E4 | ✅ Listo |
| 🟡 Alta | **US04-AC2** | Tooltip con definición de cada variable | E4 | ✅ Listo |
| 🟡 Alta | **US04-AC4** | Chips de variables seleccionadas en esquina del mapa (con popup info) | E4 | ✅ Listo |
| 🟡 Alta | **US06-HEAT-AC1** | Heatmap clippeado multivariable (movido a fase Informe) | E6 | 🔁 Migrar a rama PDF — código en `Vento/src/app/heatmap/` |
| 🟡 Alta | **US06-HEAT-AC2** | Toggle de paleta GIS (inferno / viridis) — junto al heatmap del Informe | E6 | 🔁 Migrar a rama PDF |
| 🟢 Media | **US06-HEAT-AC3** | Leyenda del heatmap (rampa + ayuda "?") — junto al heatmap del Informe | E6 | 🔁 Migrar a rama PDF |
| 🟡 Alta | **US05-AC1** | Formulario dinámico para aerogeneradores | E5 | ⏸ Reunión datos |
| 🟡 Alta | **US05-AC2** | Selección de catálogo de modelos | E5 | ⏸ Reunión datos |
| 🟡 Alta | **US05-AC3** | Validación de rangos técnicos permitidos | E5 | ⏸ Reunión datos |
| 🔴 Crítica | **US06-AC3** | Previsualización en pantalla del informe PDF | E6 | ⏸ ADR-013 |

**Total: 12 HUs** (2 + 3 + 3 + 4)
**Nota de scope-shift (2026-05-19):** el cliente reorientó el heatmap multivariable de la fase Dimensiones a la fase Informe. Las HUs US03-AC10/11/13 se renombraron a US06-HEAT-AC1/2/3 y se migran a la rama de previsualización del PDF. El código asociado vive en `Vento/src/app/heatmap/` (autocontenido) para copiarlo a la otra rama sin rehacer. En su lugar, la fase Dimensiones gana US04-AC4 (chips de variables seleccionadas).

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
  - 📦 **FE Helper**: `Vento/src/app/Utils/report/areaCalc.ts` — `calcArea(hexes: Set<string>): number` y `calcViability(hexes, scores): number`
  - 📦 **FE Contenedor flotante**: `Vento/src/app/Components/MapInfoPanel.tsx` — panel flotante a la derecha del mapa, ancho ~200px, siempre visible. Reutilizable para futuros widgets (tooltips US04-AC2, leyenda, etc.)
  - 📦 **FE Componente**: `<AreaDisplay>` dentro del panel — renderiza el área + valor de viabilidad. Lee `selectedHexes` del context con `useAprincipal()` y usa `useMemo` para no recalcular en cada render
  - 📦 **FE Integración**: insertar `<MapInfoPanel>` en [Map.tsx](../../Vento/src/app/Components/map/Map.tsx) como hijo del contenedor del mapa (posición `absolute right-3 top-3`)
  - 📦 **BE (opcional)**: si los scores de viabilidad por hex no están ya en los tiles, exponer `GET /api/scores?h3=...` — **verificar con backend antes de empezar si ya existe**
  - 🧪 **Tests**: unitario de `areaCalc.ts` (0 hex, 1 hex, N hex); integración del componente al cambiar `selectedHexes`
- **Notas:**
  - El panel es la base UI para US04-AC2 (tooltips variables) y posibles widgets futuros — diseño escalable.
  - La viabilidad usa scores actuales del backend (placeholders mientras el modelo multicriterio avanza). Cuando llegue versión avanzada, los valores se reemplazan sin tocar el cálculo ni el componente.

---

### US03-AC12 — Bloqueo de Selección Fuera de Fase "Selección de Área" + Bordes Condicionales
- **Prioridad:** 🟡 Alta
- **Épica origen:** E2 (Mapa SIG)
- **Dependencia:** US03
- **Criterios de Aceptación:**
  1. Cuando `accion === "seleccion-area"` → click en el mapa modifica `selectedHexes` (comportamiento actual)
  2. Cuando `accion !== "seleccion-area"` (dimensiones, características, informe) → click en el mapa **NO** modifica `selectedHexes`
  3. Los hexes seleccionados permanecen visibles (relleno) en todas las fases (no se borran al cambiar de acción)
  4. **Bordes de la selección — comportamiento por fase:**
     - En **"seleccion-area"**: cada hex seleccionado lleva su **borde completo individual** (grid de selección visible)
     - En otras fases: sólo el **contorno exterior** del conjunto (los hexes contiguos fusionan sus bordes en una sola línea perimetral, usando `cellsToMultiPolygon` de h3-js)
  5. Feedback visual al hover sobre el mapa en fase bloqueada (cursor `not-allowed`) para comunicar el estado
  6. Labels H3 y efectos de hover ("+") sólo aparecen en `seleccion-area`
  7. Garantiza coherencia entre el área seleccionada, el heatmap del informe y el informe descargado
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Map.tsx**: condicionar el handler `onClick` de la PolygonLayer de selección a `accion === "seleccion-area"`; mantener resto del rendering
  - 📦 **FE Cursor**: aplicar `getCursor` condicional al DeckGL container según `accion`
  - 📦 **FE Bordes**: una sola `selectedBordersLayer` con lógica dual — `data = selectedArr` (per-hex) en fase seleccionable, o `data = cellsToMultiPolygon(...)` (contorno fusionado) en otras fases
  - 🧪 **Tests**: click en fase "dimensiones" no modifica `selectedHexes`; click en fase "seleccion-area" sí; los hexes seleccionados sobreviven al cambio de acción

---

# E4 — Configuración de Dimensiones (Variables)

> **Objetivo:** Permitir al analista visualizar las variables del análisis agrupadas por dimensión, con definición clara y feedback de progreso.

**Dependencias:** US01 (sesión válida), US03 (área seleccionada)

---

### US04-AC1 — Subpágina Dimensiones (forma final)
- **Prioridad:** 🟡 Alta
- **Épica origen:** E4 (Variables)
- **Dependencia:** —
- **Origen del diseño:** Figma + iteraciones con cliente, cerrada 2026-05-19
- **Criterios de Aceptación:**
  1. Subpágina renderizada cuando `accion === "dimensiones"`, layout `flex flex-col h-full` con título + buscador + cards en zona scrollable arriba y botón "Siguiente paso" pegado al fondo
  2. **Título** "Configura las variables de interés por cada dimensión" con margin-top hacia arriba para separarlo del borde del contenedor
  3. **Search bar** "Buscar variables" filtra variables por label o descripción dentro de todas las dimensiones; muestra resultados con las cards auto-expandidas
  4. **Scrollbar siempre visible** en el contenedor de cards (`overflow-y-scroll` + `scrollbar-gutter: stable`) para feedback visual de cuántas variables hay
  5. Variables agrupadas en las **5 dimensiones** fijas (ambiental, técnica, regulatoria, socioeconómica, macroeconómica) — la taxonomía es estable mientras el cliente no la cambie
  6. Cada dimensión se renderiza como **card cuadrada con bordes redondeados** (`rounded-md`) y header colapsable: nombre + contador **`X / Y`** (X = activas, Y = total) + chevron expandir/colapsar
  7. Cards colapsables individualmente — el estado es independiente por card
  8. Cuando una card está expandida, cada fila de variable contiene: **switch** (izquierda) + **label** + **descripción** (centro) + **dot de color** (derecha) — el dot representa el color asignado a la variable, mismo que aparece en los chips del mapa. Cuando lleguen íconos del cliente, reemplazan al dot
  9. **Variables obligatorias** (catálogo: `required: true`) arrancan activas, su switch se renderiza deshabilitado (`opacity-70 cursor-not-allowed`) y muestran el sufijo discreto "obligatoria" junto al label
  10. Activar/desactivar un switch actualiza inmediatamente el contador `X / Y` del header
  11. **Botón "Siguiente paso"** al fondo de la subpágina: barra full-width sin bordes redondeados ni padding/margen externos, border-top suave. Click avanza a "características"
  12. **Multi-selección con pesos signados**: múltiples variables pueden estar activas simultáneamente. Pesos signados en `Vento/src/app/Utils/variableWeights.ts` (positivo aditiva, negativo penalizadora). Las penalizadoras sólo restan del promedio base aditivo (semántica documentada en US06-HEAT-AC1)
  13. Estado de variables activas vive en context en memoria (no persiste entre sesiones — decisión de persistencia diferida)
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Catálogo**: `Vento/src/app/Utils/variablesCatalog.ts` — `{ id, dimension, label, description, required? }`. **Las variables NO tienen color propio** en el catálogo; el color se deriva en runtime de `dimensionColors.ts` para que cambiar paletas no toque la fuente de variables
  - 📦 **FE Colors**: `Vento/src/app/Utils/dimensionColors.ts` — `colorForVariable(id)` con HSL hue por dimensión + luminosidad por orden dentro de la dimensión
  - 📦 **FE Context**: `Vento/src/app/Utils/VariablesContext.tsx` — `activeVariables: Set<string>` con `requiredVariableIds()` pre-activas, `toggleVariable(id)` que ignora obligatorias, `clearNonRequired()`, contadores derivados
  - 📦 **FE Componente**: `<Dimensions>` con search bar + cards + NextStepButton fijo
  - 📦 **FE Componente**: `<DimensionCard>` — header colapsable + body con stack de `<VariableSwitch>`
  - 📦 **FE Componente**: `<VariableSwitch>` — switch (deshabilitado si required) + label + descripción + dot de color a la derecha
  - 📦 **FE Componente**: `<NextStepButton>` — barra full-width única; sin variant prop
  - 📦 **FE Provider**: `VariablesProvider` en `Providers.tsx` para que el mapa (chips US04-AC4) y la subpágina compartan estado
  - 📦 **BE (diferido)**: `GET /api/variables` en FastAPI — no bloqueante; cuando exista reemplaza el catálogo hardcoded sin tocar la UI
  - 🧪 **Tests**: render con 5 cards, expand/collapse individual, switch toggle actualiza contador, search filtra por label y descripción, obligatorias pre-activas y switch deshabilitado
- **Estado:** ✅ Sin bloqueantes (catálogo hardcoded; íconos por variable pendientes del cliente)

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

### US04-AC4 — Panel "Variables seleccionadas" (forma final)
- **Prioridad:** 🟡 Alta
- **Épica origen:** E4 (Variables)
- **Dependencia:** US04-AC1
- **Origen:** Scope-shift 2026-05-19 — heatmap movido a Informe (US06-HEAT). En lugar del heatmap durante Dimensiones, el mapa muestra qué variables están activas para que el usuario pueda alternar la visibilidad de la lista mientras explora el mapa
- **Criterios de Aceptación:**
  1. El componente **sólo se renderiza** cuando `accion === "dimensiones"` (no en selección, características ni informe)
  2. **Posición**: esquina superior derecha del mapa (`absolute top-3 right-3`). Pill y panel se **reemplazan entre sí** en esa misma posición — no coexisten
  3. **Panel desplegado es el estado por defecto** cuando hay variables activas. Mostrar header + lista de variables
  4. **Header del panel** — toda la cabecera (`<header>` con `role="button"`, `tabIndex={0}`, soporta Enter/Space): título **"Variables seleccionadas"** a la izquierda + (opcional) botón **"Limpiar"** a la derecha + **chevron-up grande** (`h-6 w-6`) al final. Click sobre cualquier parte del header (excepto Limpiar) → colapsa a pill
  5. Botón **"Limpiar"** sólo visible si hay al menos una variable no-obligatoria activa. Click → resetea a sólo obligatorias (vía `clearNonRequired`). Usa `e.stopPropagation()` para no colapsar el panel al click
  6. **Cada item de la lista** (con divisor `divide-gray-300` entre filas): badge cuadrado grande (`h-10 w-10 rounded-md`) con `backgroundColor` derivado de `colorForVariable(id)` + label en `text-sm font-semibold` + subtítulo con la dimensión (sin prefijo "Dimensión", capitalizado: "Ambiental", "Técnica", etc.) + ✕ a la derecha para deseleccionar (sólo en variables no-obligatorias)
  7. **Variables obligatorias**: no muestran ✕ y llevan sufijo discreto "obligatoria"
  8. **Click sobre la fila** de una variable (todo el área salvo el ✕) → abre `InfoPopover` separado en `absolute top-3 left-3` con label + dimensión + descripción + "Suma a viabilidad" o "Resta a viabilidad"
  9. **Panel es "fijo"**: NO se cierra por click fuera ni por ESC. Sólo el header lo colapsa
  10. **Pill compacta** (estado colapsado): contenedor azul brand `bg-[#165170ff]` con rótulo "Variables seleccionadas en el mapa" + icono ⓘ arriba + fila horizontal de chips circulares (`h-8 w-8`) abajo, hasta 3 colores + `+N` si hay más. Click en cualquier parte → vuelve al panel
  11. **Sombra del panel**: `shadow-lg shadow-[#cacacbff]` + `border border-[#eae9e9ff]`. Sombra de la pill similar (`shadow-lg shadow-[#cacacbff]`)
  12. **InfoPopover**: ✕ propio para cerrar; ESC también lo cierra (es secundario, no fijo). Se reemplaza al hacer click sobre otra variable del panel
  13. Sin variables activas no se renderiza nada (no muestra ni pill ni panel)
  14. **Reemplazo futuro por íconos**: el color del badge cuadrado es placeholder. Cuando el cliente entregue íconos por variable, el badge muestra el icono centrado sobre el color (o sólo el icono, según el diseño que se confirme)
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Componente**: `<SelectedVariablesChips>` con tres sub-componentes — `PillCompact` (modo colapsado), `PanelExpanded` (modo abierto), `InfoPopover` (top-left). Estado local: `expanded` (default `true`) + `infoVarId`
  - 📦 **FE Header clickeable**: usa `<header role="button" tabIndex={0}>` + handlers `onClick` y `onKeyDown` (Enter/Space). Botón "Limpiar" interno con `e.stopPropagation()` para no propagar el click al header
  - 📦 **FE Estilo**: panel = `w-60 max-h-[70vh] overflow-y-auto rounded-lg border border-[#eae9e9ff] shadow-lg shadow-[#cacacbff]`; header sticky con `border-b border-gray-300`; pill = `rounded-2xl bg-[#165170ff] px-4 py-3`
  - 📦 **FE Colors**: dot/badge usa `colorForVariable(id)` (de `dimensionColors.ts`, US04-AC1). Misma fuente que los dots del `VariableSwitch`
  - 📦 **FE Integración**: montado en `Map.tsx` con condición `accion === "dimensiones" && activeVariables.size > 0`
  - 🧪 **Tests**: panel default visible; click header colapsa a pill; click pill re-expande; click ✕ deselecciona; Limpiar conserva obligatorias y no colapsa; click en fila abre InfoPopover; ESC no cierra el panel pero sí cierra InfoPopover
- **Estado:** ✅ Sin bloqueantes (forma final; íconos por variable pendientes del cliente)

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

---US06-AC3 — Pantalla de Informe 

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

### US06-HEAT-AC1 — Heatmap Multivariable en Pantalla del Informe (migrado de E2)
- **Prioridad:** 🟡 Alta
- **Épica origen:** E6 (Reportes — heatmap final, post scope-shift 2026-05-19)
- **Dependencia:** US04-AC1 (variables activas), US06-AC3 (pantalla de informe)
- **Origen del cambio:** El cliente reorientó el heatmap multivariable de Dimensiones a la pantalla final del Informe — es el resultado visual de toda la configuración, no un preview durante la fase de configuración
- **Criterios de Aceptación:**
  1. El heatmap se pinta **solo sobre el área cubierta por `selectedHexes`**, expandido a resolución H3 = 8 ignorando el promedio del hex padre
  2. El color de cada celda res-8 es el agregado multi-variable de las variables activas: las aditivas suman al promedio base, las penalizadoras restan directamente (`final = clamp(baseAditivo - penalty, 0, 1)`)
  3. Sin variables activas → no se renderiza heatmap (selección sólo con su color de borde)
  4. Sin selección → no se renderiza heatmap
  5. Pesos signados en `variableWeights.ts` (compartido entre ramas)
- **Tareas técnicas / desarrollo:**
  - 📦 **Código portable**: ya implementado y autocontenido en `Vento/src/app/heatmap/` — copiar la carpeta a la rama de previsualización del informe
  - 📦 **Integración en rama destino**: usar `buildHeatmapLayer(selectedHexes, activeVariables, palette)` del index.ts y añadir como capa al `DeckGL` de la pantalla del Informe
  - 📦 **Dependencias compartidas**: la rama destino debe tener `Vento/src/app/Utils/variableWeights.ts` (o equivalente)
  - 🧪 **Tests**: ya cubiertos por `heatmap.test.ts` dentro de la carpeta autocontenida (expandToRes8, scoreFor, aggregateScore, paletas)

---

### US06-HEAT-AC2 — Toggle de Paleta GIS (Inferno / Viridis) en pantalla Informe
- **Prioridad:** 🟡 Alta
- **Épica origen:** E6 (Reportes)
- **Dependencia:** US06-HEAT-AC1
- **Criterios de Aceptación:**
  1. Control en la pantalla del Informe para alternar entre paletas Inferno y Viridis
  2. El cambio actualiza inmediatamente los colores del heatmap (US06-HEAT-AC1)
- **Tareas técnicas / desarrollo:**
  - 📦 Componente `<PaletteToggle>` exportado por `heatmap/index.ts` — listo para montar en la pantalla del Informe
  - 📦 Estado local de paleta en la pantalla destino, pasado como prop al `buildHeatmapLayer`
  - 🧪 **Tests**: ya cubiertos en `heatmap/PaletteToggle.test.tsx`

---

### US06-HEAT-AC3 — Leyenda del Heatmap + Ayuda "?" en pantalla Informe
- **Prioridad:** 🟢 Media
- **Épica origen:** E6 (Reportes)
- **Dependencia:** US06-HEAT-AC1, US06-HEAT-AC2
- **Criterios de Aceptación:**
  1. Mientras el heatmap es visible, se muestra una pill con la rampa de la paleta vigente y etiquetas "Baja" ←→ "Alta"
  2. Icono "?" al final de la pill: hover/click abre popover explicando el agregado de variables
  3. Cierre con ESC, click fuera o segundo click
- **Tareas técnicas / desarrollo:**
  - 📦 Componente `<HeatmapLegend>` exportado por `heatmap/index.ts` — listo para montar al lado del PaletteToggle
  - 🧪 **Tests**: ya cubiertos en `heatmap/HeatmapLegend.test.tsx`

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

- US06-AC3 — espera ADR-013 (decisión interna del equipo) + Figma del informe

## Propuesta de asignación

| Dev | HUs |
|-----|-----|
| **Mavalan Software** | ADR-013 + US06-AC3 (UI Figma + generación + template + descarga) + reviews + reuniones |
| **Part-time A** | US04-AC1 (catálogo hardcoded + cards colapsables + switches + búsqueda) + US04-AC2 (tooltips) |
| **Part-time B** | US03-P2 + US03-AC10/AC11/AC12 (heatmap clippeado + paleta + bloqueo selección) + (tras reunión) US05-AC1/AC2/AC3 |

## Decisiones técnicas pendientes (resumen)

| # | Decisión | Owner |
|---|----------|-------|
| 1 | ADR-013 — Motor PDF | Mavalan Software |
| 2 | Fuente del catálogo aerogeneradores | reunión datos |
| 3 | Persistencia del proyecto (transitorio vs BD) | reunión datos |

---

## Cierre esperado del scope-dos

- ✅ 8 HUs cerradas (US05 si reunión llegó; si no, parcial)
- ✅ ADR-013 escrito
- ✅ Tests para cada HU (cobertura ≥ tareas técnicas críticas)
- ✅ Deploy a `deploy-test` validado
- ✅ Demo del flujo end-to-end con placeholders donde aplique
