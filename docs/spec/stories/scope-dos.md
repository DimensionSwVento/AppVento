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
| 🟡 Alta | **US04-AC1** | Agrupación por 5 categorías de color | E4 | ✅ Listo |
| 🟡 Alta | **US04-AC2** | Tooltip con definición de cada variable | E4 | ✅ Listo |
| 🟡 Alta | **US04-AC3** | Indicador de progreso por categoría | E4 | ✅ Listo |
| 🟡 Alta | **US05-AC1** | Formulario dinámico para aerogeneradores | E5 | ⏸ Reunión datos |
| 🟡 Alta | **US05-AC2** | Selección de catálogo de modelos | E5 | ⏸ Reunión datos |
| 🟡 Alta | **US05-AC3** | Validación de rangos técnicos permitidos | E5 | ⏸ Reunión datos |
| 🔴 Crítica | **US06-AC3** | Previsualización en pantalla del informe PDF | E6 | ⏸ ADR-013 |

**Total: 8 HUs** (1 + 3 + 3 + 1)

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

# E4 — Configuración de Dimensiones (Variables)

> **Objetivo:** Permitir al analista visualizar las variables del análisis agrupadas por dimensión, con definición clara y feedback de progreso.

**Dependencias:** US01 (sesión válida), US03 (área seleccionada)

---

### US04-AC1 — Agrupación por 5 Categorías de Color
- **Prioridad:** 🟡 Alta
- **Épica origen:** E4 (Variables)
- **Dependencia:** —
- **Criterios de Aceptación:**
  1. Variables agrupadas en las 5 dimensiones (técnica, ambiental, regulatoria, socioeconómica, macroeconómica)
  2. Cada dimensión tiene un color de **paleta GIS estándar empezando en morado** y bajando por la escala térmica/espectral (mismo principio que los heat-maps de generación energética)
  3. Header de cada sección muestra: nombre de dimensión + color asignado
  4. Las secciones se pueden expandir/colapsar individualmente
- **Tareas técnicas / desarrollo:**
  - 📦 **BE Endpoint**: `GET /api/variables` en FastAPI que retorne `{ variables: [{ dimension, name, label, definition, type }] }` agrupadas por dimensión
  - 📦 **FE Rewrite**: añadir `/api/variables/:path*` a [next.config.ts](../../../Vento/next.config.ts) (mismo patrón que `/api/tiles`)
  - 📦 **FE Componente**: extender [Dimensions.tsx](../../../Vento/src/app/Components/) con secciones colapsables y aplicación de paleta GIS
  - 📦 **FE Constantes**: definir paleta GIS en un módulo reutilizable (`Vento/src/app/Utils/gisPalette.ts`)
  - 🧪 **Tests**: backend retorna estructura esperada; frontend renderiza N grupos colapsables
- **Estado:** ✅ Sin bloqueantes

---

### US04-AC2 — Tooltip con Definición de cada Variable
- **Prioridad:** 🟡 Alta
- **Épica origen:** E4 (Variables)
- **Dependencia:** US04-AC1
- **Criterios de Aceptación:**
  1. Cada variable tiene un icono ℹ al lado del label
  2. Hover (desktop) o tap (mobile) sobre el icono muestra tooltip con la definición en español
  3. Tooltip se cierra al hacer click fuera
  4. Texto del tooltip viene del campo `definition` del endpoint `/api/variables`
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Componente**: `<VariableTooltip>` reutilizable con accesibilidad básica (`aria-describedby`, ESC para cerrar)
  - 📦 **FE Datos**: las definiciones vienen del mismo endpoint `/api/variables` (no añade carga extra al backend)
  - 🧪 **Tests**: tooltip aparece/desaparece según interacción; click fuera lo cierra
- **Estado:** ✅ Sin bloqueantes

---

### US04-AC3 — Indicador de Progreso por Categoría
- **Prioridad:** 🟡 Alta
- **Épica origen:** E4 (Variables)
- **Dependencia:** US04-AC1
- **Criterios de Aceptación:**
  1. Cada dimensión muestra una barra de progreso visible
  2. Refleja `N de M variables configuradas` para esa dimensión
  3. Color de la barra coincide con el color de la dimensión (US04-AC1)
  4. Texto numérico al lado: `3 / 8` o similar
  5. Actualización inmediata al configurar/deseleccionar una variable
- **Tareas técnicas / desarrollo:**
  - 📦 **FE Componente**: `<CategoryProgress>` que recibe `{ dimension, configured, total }`
  - 📦 **FE Estado**: definir cómo se trackea "configurada" — sugerencia: estado local en `Dimensions.tsx` o context dedicado
  - 🧪 **Tests**: render con `(3, 8)` muestra `3 / 8`; barra al 37.5%
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

# Resumen Consolidado

## Estimación

| Bloque | HUs | Horas estimadas (con tareas técnicas adentro) |
|--------|-----|------------------------------------------------|
| E2 (US03-P2) | 1 | 4-5h |
| E4 (US04-AC1/AC2/AC3) | 3 | 12-14h (incluye `/api/variables` backend) |
| E5 (US05-AC1/AC2/AC3) | 3 | 10-14h tras desbloqueo de reunión |
| E6 (US06-AC3) | 1 | 16-22h (incluye ADR-013, UI nativa Figma, generación, template, descarga) |
| **Total** | **8** | **42-55h** |

Con buffer 20%: **48-64h** = ~2 semanas con el equipo.

## Dependencias

```
US03-P2 ───────────────────────────────────► (independiente)

US04-AC1 ──┬─► US04-AC2
           └─► US04-AC3

(Reunión datos) ──► US05-AC1 ──► US05-AC3
                    US05-AC2 (paralelo)

ADR-013 + US04 + US05 (placeholder OK) ──► US06-AC3
```

## Empezables sin reunión (3 HUs, ~16-19h)

- US03-P2 (cálculo área + viabilidad placeholder)
- US04-AC1, AC2, AC3 (las 3 HUs de variables)

## Bloqueadas por reunión (3 HUs, ~10-14h)

- US05-AC1, AC2, AC3 — todas esperan la reunión con el equipo de datos

## Bloqueadas por decisión interna (1 HU, ~16-22h)

- US06-AC3 — espera ADR-013 (decisión interna de winx, ~1h) + Figma del informe

## Propuesta de asignación

| Dev | HUs |
|-----|-----|
| **Winx (full-time)** | ADR-013 + US06-AC3 (UI Figma + generación + template + descarga) + reviews + reuniones |
| **Part-time A** | US04-AC1 (incluye endpoint backend) + AC2 + AC3 |
| **Part-time B** | US03-P2 + (tras reunión) US05-AC1/AC2/AC3 |

## Decisiones técnicas pendientes (resumen)

| # | Decisión | Owner | Tiempo |
|---|----------|-------|--------|
| 1 | ADR-013 — Motor PDF | winx | ~1h |
| 2 | Fuente del catálogo aerogeneradores | reunión datos | reunión |
| 3 | Persistencia del proyecto (transitorio vs BD) | reunión datos | reunión |

---

## Cierre esperado del scope-dos

- ✅ 8 HUs cerradas (US05 si reunión llegó; si no, parcial)
- ✅ ADR-013 escrito
- ✅ Tests para cada HU (cobertura ≥ tareas técnicas críticas)
- ✅ Deploy a `deploy-test` validado
- ✅ Demo del flujo end-to-end con placeholders donde aplique
