---
version: 1.0
date: 2026-06-03
scope: contractual-segunda-entrega-entregado
origen: scope-dos.md
estado: entregado — pendiente integración con datos reales (US03-AC6) y aval cliente heatmap WLC
---

# Scope Segunda Entrega — Entregado

Reporte de lo desarrollado en la rama de cierre de scope 2 + feedback rondas 1 y 2. Cubre todas las HUs originales de [scope-dos.md](./scope-dos.md), las HUs adicionales de [feedback-cliente-v1.md](./feedback-cliente-v1.md) y [feedback-1-round2.md](./feedback-1-round2.md), y las decisiones de cliente que recortaron/ampliaron el alcance durante la iteración.

---

## E2 — Mapa SIG (Parte 2)

| HU | Estado | Componentes / archivos |
|---|---|---|
| **US03-P2** Cálculo de área (km²) + viabilidad agregada del área seleccionada | ✅ Entregado | `Components/AreaDisplay.tsx` (panel flotante visible en `seleccion-area` y `caracteristicas`), `Utils/areaCalc.ts` |
| **US03-AC12** Bloqueo de selección fuera de fase + bordes condicionales | ✅ Entregado | `Components/Map.tsx` — `toggleHex` guard `!canSelect`; `selectedBordersLayer` con `cellsToMultiPolygon` (outline fusionado fuera de selección, bordes por hex en selección) |
| **US03-AC12-EXT** Restricción onshore/offshore (no permite mezclar tierra y mar en la misma selección) | ✅ Entregado | `Utils/hexClassification.ts` — `canAddHexToSelection`, `dominantHexType`, `COLOMBIA_LAND_POLYGON` |
| **US03-AC-BUSCADOR** Buscador estilo Google Maps con auto-selección de hexes del lugar | ✅ Entregado | `Components/MapSearchBox.tsx`, `Utils/geocoder.ts` (Nominatim + `polygon_geojson`); slide programático 3-fases (zoom-out → pan → zoom-in) con `requestAnimationFrame`; deselect automático al cambiar resolución H3 sólo en fase de selección |

---

## E4 — Configuración de Dimensiones (Variables)

| HU | Estado | Componentes / archivos |
|---|---|---|
| **US04-AC1** Subpágina Dimensiones (cards colapsables, switches, búsqueda, contador X/Y, NextStep al fondo) | ✅ Entregado con catálogo completo de la Figura 3 (56 variables) | `Components/Dimensions.tsx`, `Components/DimensionCard.tsx`, `Components/VariableSwitch.tsx`; catálogo en `Utils/variablesCatalog.ts`, colores en `Utils/dimensionColors.ts`, pesos signados en `Utils/variableWeights.ts`, estado global en `Utils/VariablesContext.tsx` |
| **US04-AC2** Tooltip con definición + polaridad de cada variable | ✅ Entregado | `Components/VariableTooltip.tsx` — ESC + click-fuera + segundo click cierran; `aria-expanded` / `role="tooltip"` |
| **US04-AC4** Chips de variables seleccionadas en esquina del mapa | ✅ Entregado | `Components/SelectedVariablesChips.tsx` — pill compacta ↔ panel expandido, InfoPopover (Resumen + 4 secciones placeholder sprint 3 + Anterior/Siguiente), affordance "Ver detalle" debajo del label; scrollbar siempre visible; auto-colapso del panel al abrir InfoPopover; límite de 4 chips en pill con `+N` overflow |
| Sistema de íconos multi-fuente (Figura 3 del cliente) | ✅ Entregado | `Utils/variableIcons.tsx` — resolución por prefijo `lucide:`/`tabler:`/`svg:`; `Utils/tablerIcons.tsx` (7 íconos Tabler dibujados inline); `Utils/customIcons.tsx` (7 SVGs propios: birdsV, birds3, seagrass, nest, cattails, coral, slope) |

---

## E5 — Características del Proyecto (US05)

| AC | Estado | Componentes / archivos |
|---|---|---|
| **US05-AC1** Formulario dinámico para aerogeneradores | ✅ Entregado con 4 secciones | `Components/Caracteristicas.tsx`, `Utils/CaracteristicasContext.tsx` |
| ↳ Sección 1 — Tipo emplazamiento (onshore/offshore) **auto-detectado** desde la selección; selector flotante/fija aparece si offshore | ✅ | usa `dominantHexType` de `hexClassification` |
| ↳ Sección 2 — Capacidad nominal MW con 4 ruedas (`[C][D][U].[MM]`) que aceptan flechas + scroll wheel + teclado ↑↓ | ✅ | `Components/MWPicker.tsx` (~150 líneas, sin librería externa) |
| ↳ Sección 3 — Tamaño proyecto (área heredada de selección + número de aerogeneradores + categoría S/M/L) | ✅ | rangos editables sin pickers iOS |
| ↳ Sección 4 — Distancia al SIN (input manual; auto-cálculo pendiente para sprint 3) | ✅ | sin referencias a "tarea Felipe" en UI |
| **US05-AC3** Validación de rangos técnicos permitidos | ✅ Entregado | Errores inline por campo con `aria-invalid`; `NextStepButton.disabled` cuando hay errores + `blockedReason` ámbar |
| **US05-AC2** Selección de catálogo de modelos | ❌ Eliminada por decisión cliente — "el número y tipo de generadores se puede predefinir con reglas lógicas" |

---

## E6 — Reportes (Informe)

| HU | Estado | Componentes / archivos |
|---|---|---|
| **US06-AC3** Pantalla de informe (UI nativa) + descarga PDF | ✅ Entregado con previsualización colapsable y PDF estético | `Components/Report.tsx`, `Utils/pdfExport.ts` (usa `html2canvas-pro` para soportar oklch/color-mix de Tailwind v4) |
| ↳ Header brand "Informe Vento — Análisis preliminar de viabilidad eólica" + timestamp | ✅ | identidad ANH/EAFIT/Mavalan en footer del documento |
| ↳ Resumen del área (región / coordenadas / km² / N variables activas) | ✅ | `Utils/reportData.ts` (`getRegion`, `getCentroid`, `formatCoordenadas`) |
| ↳ Resultado preliminar (puntaje grande + descripción) | ✅ | `Utils/heatmapPalette.ts` — `generalScore(hexes)` promedio entre 5 dimensiones |
| ↳ Puntajes por dimensión (5 dimensiones, barras horizontales con valor `XX.X` / 100) | ✅ | dimensión activa resaltada con bg brand |
| ↳ Sección "Variables informativas seleccionadas" (lista sincronizada con `VariablesContext`) | ✅ | aparece automáticamente cuando hay variables activas |
| **US06-HEAT-AC1** Heatmap multivariable clippeado al área + expandido a res 8 | ✅ Entregado | `Components/Map.tsx` — `informeHeatmapLayer` con `cellToChildren(h, 8)`; gradiente **radial** desde centroide con ±15% ruido por dimensión; alpha 160 para que labels del basemap (CartoDB Positron) se vean debajo |
| **US06-HEAT-AC3** Leyenda del heatmap | ✅ Entregado | `Components/HeatmapLegend.tsx` — barra gradiente Viridis vertical delgada + 5 buckets (Muy alta → Muy baja) + Corregimientos |
| **US06-HEAT-AC2** Toggle paleta Inferno/Viridis | ❌ Eliminada por decisión cliente — sólo Viridis |
| Selector de visualización del heatmap | ✅ | `Components/HeatmapDimensionSwitches.tsx` — dropdown compacto con 6 dimensiones (General + 5 dimensiones); default `general`; **no hay opción "sin visualización"** (heatmap siempre on en Informe) |
| Tooltip hover por-hex sobre el heatmap | ✅ | `Components/HexValuesTooltip.tsx` — header neutro + sección Puntajes (6) + sección Variables informativas con `+N más` (límite 4); sólo cuando `heatmapActive` y desktop |
| Lista flotante de variables informativas con "+" para añadir todo el catálogo | ✅ | `Components/InformativeVariablesList.tsx` + `Utils/informativeVariables.tsx` — estado compartido con `VariablesContext`, todo lo añadido en mapa se refleja en Report y PDF en tiempo real; ✕ oculto en variables `required` |

---

## Feedback ronda 1 (US-FB-*)

| HU | Estado | Notas |
|---|---|---|
| **US-FB-01** Keycloak en español + password policy + botón Inicio + logout español | ✅ Entregado | rama feature/us-fb-01, mergeada al main de scope 2 |
| **US-FB-02** Flujo post-registro con confirmación en español | ✅ Entregado | `app/registration-success/page.tsx` |
| **US-FB-03** Gestión de expiración de sesión + SessionGuard | ✅ Entregado | `Components/SessionGuard.tsx`; tests E2E quedan para sprint 3 |
| **US-FB-04** Territorio colombiano completo (offshore) | ✅ Entregado y superado por **US-FB2-02** (IGAC + Nominatim union) |
| **US-FB-05** Admin: visibilidad y asignación de roles | ✅ Entregado | `Components/Admin/UsersTable.tsx` con prefetch de roles + badge |
| **US-FB-06** Notificación email al asignar admin | ✅ **Implementada en scope 1** — la doc original marcaba "BLOQUEADA por ADR-009" pero el feature ya estaba en producción |
| **US-DOC-01** Documentación técnica (auth/testing/stack) | ✅ Entregado | en `docs/security/`, `docs/testing/`, `docs/architecture/` |

---

## Feedback ronda 2 (US-FB2-*)

| HU | Estado | Componentes / archivos |
|---|---|---|
| **US-FB2-01** Guía visual de próximo paso | ✅ Entregado | `Components/NextStepFloatingCard.tsx` con borde brand 2px (`#165170ff`), animación `vento-cta-in`, label "Área lista — Continuar a Dimensiones" + conteo de hexes |
| **US-FB2-01-EXT** Sistema de tarjeta CTA permanente por fase | ✅ Entregado | `Components/PhaseHintCard.tsx` — persistente en `seleccion-area`, eliminable en otras fases con dismiss persistido en `localStorage`; mismo skin brand que NextStepFloatingCard |
| **US-FB2-02** Cartografía oficial IGAC | ✅ Entregado | `Utils/data/colombia-igac-boundary.json` (unión IGAC ArcGIS + Nominatim OSM admin_level=2 ~22 km offshore); `scripts/generate-igac-boundary.mjs` re-generable; ADR-014 documentado |
| **US-FB2-02-EXT** Eliminado `ARCHIPELAGO_POLYGON` duplicado | ✅ Entregado | IGAC + Nominatim ya cubren San Andrés/Providencia con sus 12 millas náuticas |
| **US-FB2-03** Polish layout landing/dashboard | 🚫 Condicionada — sigue esperando la validación con el PC del cliente |
| **US-FB2-04** Transición visual al cambio de resolución H3 | ✅ Entregado | slide rAF 3-fases para search box + pill "...cargando mapa" durante tiles loading |
| **US-FB2-05** Icono claro para cerrar sesión | ✅ Entregado | `Components/SideBar.tsx` |

---

## Polish UX adicional incluido en scope 2

- **Favicon turbina** (`app/icon.svg`) reemplaza el default Next
- **Heatmap limpio en Informe**: malla H3 oculta, bordes de hexes ocultos, sin IDs `…fffff`; sólo se ve la mancha Viridis + contorno del territorio Colombia + labels del basemap visibles
- **Affordance "Ver detalle"** debajo del label de cada variable en el panel de chips
- **Borde brand 2px** en NextStepFloatingCard y PhaseHintCard
- **Leyenda compacta** vertical, delgada, sin saturación de texto
- **Sin doble scroll** en el picker de variables (sólo el wrapper del flotante scrollea)
- **InfoPopover** del chip de variable con tabs (Resumen + 4 secciones placeholder sprint 3) + Anterior/Siguiente variable + auto-colapso del panel principal al abrir el detalle

---

## Tests actualizados a los cambios de scope

- `src/app/Utils/h3Resolution.test.ts` — refs a `ARCHIPELAGO_POLYGON` y `featureCount` removidas; asserts ahora reflejan IGAC + 12 millas
- `src/app/Components/Report.test.tsx` — labels actualizadas (`Ambiental`/`Técnica`/`Económica`/`Socioeconómica`/`Regulatoria`)
- `src/app/Components/SelectedVariablesChips.test.tsx` — aria-label `Ver detalle de ` (con espacio) para la affordance
- `src/app/Components/Dimensions.test.tsx` — labels del catálogo nuevo + click manual para expandir las cards
- `src/app/Components/AreaDisplay.test.tsx` — `getByText` exacto en lugar de regex `/^0\s/` (text-node separado del span de unidad)
- `src/app/Components/VariableTooltip.test.tsx` — fixtures incluyen `iconKey`

---

## HUs explícitamente eliminadas

| HU | Motivo |
|---|---|
| **US05-AC2** Selección de catálogo de modelos de aerogeneradores | Decisión cliente: el número y tipo se predefinen con reglas lógicas a partir de Capacidad MW + Categoría S/M/L |
| **US06-HEAT-AC2** Toggle paleta Inferno/Viridis | Decisión cliente: una sola paleta GIS estándar (Viridis amarillo↔púrpura) para evitar confusión interpretativa |

---

## Pendiente para sprint 3 (no parte de este cierre)

| Item | Razón |
|---|---|
| **US03-AC6** Ingesta `.h3.parquet → JSON` con datos reales | Sigue siendo blocker para el modelo multicriterio y el heatmap WLC real; los valores del heatmap, tooltip y PDF son placeholder determinista por `(varId, hex)` |
| Aval cliente del heatmap WLC + pesos signados | Pendiente reunión con cliente |
| **US-FB2-03** Polish layout | Esperando validación en PC del cliente |
| Tests E2E de SessionGuard (US-FB-03) | Pendiente |
| Plantilla Figma del PDF del informe | El PDF actual es estético con identidad brand pero sin template oficial |
| Geocoding inverso para tooltip hover (nombre del lugar en lugar de basemap labels) | Riesgo de rate-limit Nominatim si se hace por-hex; alternativa actual: alpha 160 en heatmap permite leer los labels del basemap |
