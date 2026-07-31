---
version: 2.0
date: 2026-07-03
scope: post-segunda-entrega (feedback cliente)
origen: revisión cliente post-cierre Scope 2 (2026-06-01)
sprint_target: Sprint 3
---

# Historias de Usuario — Feedback Cliente v2 (Sprint 3)

Consolidación del feedback recibido tras la entrega del **Scope 2** (cerrado 2026-06-01). Se organiza en tres bloques:

- **HUs en desarrollo**: trabajo activo del Sprint 3 (`US-FB3-XX`).
- **Ya trabajado (referencia)**: items ya cubiertos en scopes previos; se listan para trazabilidad.
- **Temporales**: bugs pendientes de reproducir + blockers externos que no dependen del equipo dev.

> **Nota:** Numeración `US-FB3-XX` para identificar como feedback del Sprint 3, distinguible de las US contractuales (US03..US06) y de las rondas anteriores (US-FB-XX, US-FB2-XX).

---

## Resumen ejecutivo

| ID | Historia | Área | Estado |
|----|----------|------|--------|
| US-FB3-01 | SIN como variable informativa (no característica) + derivación de energía/área desde capacidad | 📦 FE (US05, Utils, catálogo) + 📊 Datos | 🔨 Sprint 3 |
| US-FB3-02 | Botones permanentes de navegación (zoom-a-selección, reset, borrar) | 📦 FE (Map, SideBar) | 🔨 Sprint 3 |
| US-FB3-03 | Fix tooltip incompleto en paso final | 📦 FE (HexValuesTooltip) | 🔨 Sprint 3 |
| US-FB3-04 | Capacidad nominal con entrada de teclado + saltos configurables | 📦 FE (MWPicker) | 🔨 Sprint 3 |
| US-FB3-05 | Ícono de ayuda con guía / video tutorial | 📦 FE (layout, modal) | 🔨 Sprint 3 |
| US-FB3-06 | Dimensión Regulatoria pasa a informativa (no puntuable) | 📦 FE (variableWeights, heatmapPalette, Report) | 🔨 Sprint 3 |

---

## HUs en desarrollo

### US-FB3-01 — SIN como variable informativa (no característica)

**Como** analista configurando un proyecto eólico
**Quiero** que la distancia al SIN se calcule automáticamente por hexágono como variable informativa y que la energía / área se deriven de la capacidad nominal
**Para** que el análisis refleje datos reales del terreno en vez de inputs manuales del usuario

#### Criterios de aceptación

| AC | Descripción | Archivo afectado |
|----|-------------|------------------|
| AC1 | Eliminar el input "Distancia al SIN" del formulario de características del proyecto (US05) | `Vento/src/app/Components/Caracteristicas.tsx` (o equivalente) |
| AC2 | Eliminar el input "Número de aerogeneradores" del formulario — se deriva de capacidad + categoría | Componente US05 |
| AC3 | Cada hex tiene precalculada la distancia mínima lineal al SIN (viene del backend / dataset) | Backend + `Utils/apiUrl.ts` consumer |
| AC4 | En selección multi-hex la variable informativa reportada es la del hex más cercano al SIN (menor valor) | `Utils/heatmapPalette.ts` o helper nuevo |
| AC5 | "Distancia al SIN" queda expuesta en el catálogo de variables informativas (checkbox opcional US04) | `Utils/variableCatalog.ts` |
| AC6 | A partir de la capacidad nominal se derivan automáticamente: energía generable estimada + área requerida (fórmula a confirmar con Samuel) | Nueva utilidad en `Utils/` |
| AC7 | Tests unitarios del cálculo "hex más cercano al SIN" y de la derivación energía/área | `*.test.tsx` |

**Referencia cliente:** items 5 y 6 del feedback.
**Owner del cálculo:** Samuel (fórmula capacidad → energía/área).

---

### US-FB3-02 — Botones permanentes de navegación

**Como** usuario del mapa
**Quiero** botones siempre visibles para hacer zoom a la selección, resetear vista y borrar la selección
**Para** no perder la orientación entre resoluciones H3 y no quedarme con hexágonos huérfanos al cambiar zoom

#### Criterios de aceptación

| AC | Descripción | Archivo afectado |
|----|-------------|------------------|
| AC1 | Botón "Zoom a la selección" — hace fit view a los hexes seleccionados (bounding box de `selectedHexes`) | `Vento/src/app/Components/map/Map.tsx` |
| AC2 | Botón "Reset a Colombia" — vuelve a `INITIAL_VIEW_STATE`, o al menos al zoom departamental si hay contexto | Map.tsx |
| AC3 | Botón "Borrar selección" — limpia `selectedHexes` completo. Importante cuando se cambia de zoom y queda un hex huérfano | Map.tsx / `AccionPrincipalContext` |
| AC4 | Los tres botones son visibles en todas las fases (área → dimensiones → características → informe) | Map overlay layout |
| AC5 | Con `selectedHexes` vacío, "Zoom a la selección" y "Borrar" quedan `disabled` con tooltip explicativo | Map.tsx |
| AC6 | Los botones respetan la línea gráfica del sidebar y usan lucide-react para íconos | Map.tsx |
| AC7 | Tests: los tres botones renderizan y disparan los handlers correctos | `Map.test.tsx` |

**Referencia cliente:** item 7 del feedback.

---

### US-FB3-03 — Fix tooltip incompleto en paso final

**Como** usuario revisando el informe
**Quiero** que el tooltip por hexágono aparezca en todos los hexágonos al pasar el cursor
**Para** consultar valores sin fricción y sin ver un cursor de "prohibido" en Firefox

#### Criterios de aceptación

| AC | Descripción | Archivo afectado |
|----|-------------|------------------|
| AC1 | Reproducir el bug — tooltip no aparece en algunos hex en Firefox/Windows durante la fase de informe | `HexValuesTooltip.tsx`, `Map.tsx` |
| AC2 | Corregir el cursor: no debe ser "prohibido" (`not-allowed`). Usar `pointer` o `default` según pickabilidad de la capa | Map.tsx (`getCursor`) |
| AC3 | El tooltip aparece de forma consistente en todos los hex durante la fase de informe (`heatmapActive=true`) | Map.tsx (`selectedLayer`, `informeHeatmapLayer` con `pickable: true`) |
| AC4 | Cross-browser: verificar Chrome, Firefox, Edge, Safari en desktop | Testing manual |
| AC5 | Tests: hover handler dispara correctamente el estado `hoveredHex` | `Map.test.tsx` |

**Referencia cliente:** item 8 del feedback (Se está trabajando).

---

### US-FB3-04 — Capacidad nominal con teclado + saltos configurables

**Como** usuario configurando la capacidad del proyecto
**Quiero** ingresar los MW con teclado (además de las ruedas) y tener saltos configurables en decimales
**Para** no depender exclusivamente del picker de ruedas y agilizar la entrada de valores

#### Criterios de aceptación

| AC | Descripción | Archivo afectado |
|----|-------------|------------------|
| AC1 | Cada dígito del `MWPicker` acepta input numérico por teclado: foco → escribir dígito → salta al siguiente | `Vento/src/app/Components/MWPicker.tsx` |
| AC2 | Flechas arriba / abajo del teclado ajustan el dígito enfocado (verificar; si ya existe, dejar consignado) | MWPicker.tsx |
| AC3 | Los decimales (últimas dos ruedas) tienen paso configurable: 5 en 5 o 10 en 10 (evaluar cuál queda por defecto con cliente) | MWPicker.tsx |
| AC4 | Validación: la capacidad final sigue dentro del rango permitido (0.01 – 999.99 MW aproximadamente) | MWPicker.tsx + `Caracteristicas.tsx` |
| AC5 | El resto de la interacción actual (ruedas, categorización S/M/L derivada) se preserva | MWPicker.tsx |
| AC6 | Tests: input por teclado, saltos correctos, validación de rango, categoría derivada | `MWPicker.test.tsx` |

**Referencia cliente:** item 9 del feedback.
---

### US-FB3-06 — Dimensión Regulatoria pasa a informativa

**Como** analista
**Quiero** que la dimensión "Regulatoria" no cuente en el score general, sino que se muestre como información contextual
**Para** que el score refleje la decisión del cliente de mover Regulatoria fuera del cálculo puntuable

#### Criterios de aceptación

| AC | Descripción | Archivo afectado |
|----|-------------|------------------|
| AC1 | Excluir "Regulatoria" del cálculo WLC | `Utils/variableWeights.ts`, `Utils/heatmapPalette.ts` |
| AC2 | La lista de dimensiones puntuables queda en 4: Técnica, Ambiental, Socioeconómica, Macroeconómica | `Utils/variableCatalog.ts` o equivalente |
| AC3 | En el informe, la sección "Regulatoria" se muestra como bloque informativo (variables, sin score) | `Components/Report.tsx` |
| AC4 | El tooltip de puntajes muestra: general + 4 dimensiones puntuables. Regulatoria queda al lado como "informativa" | `HexValuesTooltip.tsx` |
| AC5 | El heatmap Viridis por dimensión no ofrece "Regulatoria" como métrica puntuable (queda como capa informativa opcional) | `HeatmapDimensionSwitches.tsx` |
| AC6 | Tests: WLC no incluye regulatoria; informe renderiza Regulatoria como bloque informativo | `variableWeights.test.ts`, `Report.test.tsx` |
| AC7 | Actualizar catálogo Figura 3 en UI si aplica | `Components/Dimensions.tsx` |

**Referencia cliente:** item 11 del feedback.

---

## Ya trabajado (referencia)

Items que **el cliente listó** pero que ya están cubiertos por scopes anteriores. Se dejan documentados para trazabilidad.

| Item | Estado | Detalle |
|------|--------|---------|
| Límites offshore (ampliar millas náuticas costa afuera) | Solicitado al equipo de datos | Cartografía IGAC + Nominatim ya cubre 12 millas náuticas oficiales (US-FB-04, cerrado). La ampliación adicional está solicitada al equipo de datos. |
| Datos offshore | Pendiente Camila | Pendiente que Camila (equipo de datos) suba el dataset ampliado al parquet maestro. |

---

## Temporales

### 🚧 Blockers externos (falta que nos pasen algo)

| Item | Bloquea | Owner |
|------|---------|-------|
| Pruebas con datos reales | Todo el pipeline de scoring depende de la conexión maestra a datos (ver README raíz, sección "Pendiente") | Camila / equipo datos |
| Despliegue en nube Virtuozzo | Migración a infra Virtuozzo | Infra externa |

### 🔍 Bugs para reproducir

Bugs reportados por el cliente que el equipo debe reproducir antes de escribir HUs específicas:

| # | Bug | Contexto reportado |
|---|-----|---------------------|
| 1 | On-shore / off-shore "atrancado" | Firefox / Windows. Al seleccionar una zona, el estatus se queda pegado aunque se seleccione zona del tipo opuesto. |
| 2 | Búsqueda de municipios no resalta hexes | Buscar "Rionegro, Ant." ubica el lugar pero no resalta los hexágonos correspondientes. |
| 3 | Rionegro devuelve municipios aledaños | El resultado de Rionegro incluye erróneamente Medellín, La Ceja, Marinilla, El Santuario. |
| 4 | Incongruencia on-shore / off-shore en selección | El tipo detectado no siempre coincide con la selección visible. |
| 5 | Leyenda de créditos inactiva | Ícono "info" en esquina inferior derecha puede inducir a error de operación. |

Una vez reproducidos, se abren `US-FB3-BUG-XX` con AC específicos.

---

## Discusión (pendiente de decisión)

Items marcados por el cliente como "no bug, discutir". Se documentan para futura priorización, no entran al Sprint 3 salvo aval explícito.

- **Animación de zoom del buscador poco fluida.** Transición al hacer zoom (alejar/acercar) percibida como saltona.
- **Hexes anidados al cambiar de zoom.** Se pueden seleccionar hexes dentro de otros al cambiar resolución; workaround actual es recargar la página.
- **Pérdida de barra con pinch en laptop.** Menor.
- **Navegación entre pasos: clics adicionales.** El usuario debe pasar por las flechas "siguiente" de cada paso para volver a editar; no puede saltar directo al informe si solo cambia área. Propuesta: permitir saltos si los pasos siguientes ya están completos.
- **Elementos percibidos como "genéricos / IA".** Refinamiento de UI en general.
- **Inconsistencia visual.** Recuadros y bordes que rompen la línea gráfica.
- **MWPicker sin coherencia visual.** Alternativa gráfica pendiente (Santiago tiene contexto de la última reunión). Nota: `US-FB3-04` cubre solo la entrada por teclado + saltos, no el rediseño visual.

### Preguntas pendientes (para próxima reunión)

1. ¿Caja de detalles de variable en el último paso del informe (además del popup en US04)?
2. ¿Logo Minciencias también en la pantalla de inicio?
3. ¿Zonas excluidas / prohibidas marcadas visualmente en el Sprint 3?
4. ¿Incluir DIVIPOLA de la región en el resumen del área del informe?
5. ¿Límite a variables seleccionables para no saturar informe + tooltip + capa "capas"?
6. ¿Feature para que el usuario cargue información / data propia?

---

## Trazabilidad

- Feedback consolidado desde el checkpoint del cliente post cierre Scope 2.
- Ronda anterior: [`feedback-1-round2.md`](feedback-1-round2.md) (FB2 — Sprint 2).
- Primera ronda: [`feedback-cliente-v1.md`](feedback-cliente-v1.md) (FB1 — Sprint 1).
- README raíz: sección "Pendiente" ya documenta el blocker de conexión maestra a datos.
