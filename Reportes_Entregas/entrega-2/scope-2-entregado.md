---
version: 1.1
date: 2026-06-03
scope: contractual-segunda-entrega-entregado
origen: scope-dos.md + feedback-cliente-v1.md + feedback-1-round2.md + iteraciones cliente
estado: entregado — pendiente integración con datos reales (US03-AC6), aval cliente heatmap WLC y polígono IGAC land-only para clasificación onshore/offshore
---

# Scope Segunda Entrega — Entregado

Reporte de lo desarrollado en la rama de cierre de scope 2 + feedback rondas 1 y 2. Cubre todas las HUs originales de [scope-dos.md](../../docs/stories/scope-dos.md), las HUs adicionales de [feedback-cliente-v1.md](../../docs/stories/feedback-cliente-v1.md) y [feedback-1-round2.md](../../docs/stories/feedback-1-round2.md), y las decisiones/iteraciones del cliente durante el sprint.

---

## E2 — Mapa SIG (Parte 2)

| HU | Estado | Componentes / archivos |
|---|---|---|
| **US03-P2** Cálculo de área (km²) + viabilidad agregada | ✅ Entregado | `Components/AreaDisplay.tsx`, `Utils/areaCalc.ts` |
| **US03-AC12** Bloqueo selección fuera de fase + bordes condicionales | ✅ Entregado | `Components/Map.tsx` — `toggleHex` guard `!canSelect`; `selectedBordersLayer` con `cellsToMultiPolygon` (outline fusionado en fases ≠ selección; bordes por hex en selección) |
| **US03-AC12-EXT** Restricción onshore/offshore (no mezclar tierra y mar) | 🟡 Entregado con polígono manual aproximado — pendiente generar `colombia-igac-land-boundary.json` con `node scripts/generate-igac-boundary.mjs --land-only` para usar línea de costa oficial IGAC (corrige bug de "isla detectada como mar" / "mar detectado como tierra") | `Utils/hexClassification.ts`, `scripts/generate-igac-boundary.mjs` (flag CLI nuevo) |
| **Buscador estilo Google Maps** con auto-selección de hexes del lugar (sugerencia expertos) | ✅ Entregado | `Components/MapSearchBox.tsx`, `Utils/geocoder.ts` (Nominatim + `polygon_geojson`); slide programático 3-fases (zoom-out → pan → zoom-in) con `requestAnimationFrame`; deselect automático al cambiar resolución H3 sólo en fase de selección |
| Mapa limpio en fase Informe (sin malla H3, sin IDs `…ffff`, sin bordes de hex) | ✅ Entregado | `Components/Map.tsx` — `gridTileLayer.visible = !heatmapActive`, `selectedLayer.visible = !heatmapActive`, `selectedBordersLayer` también `null` cuando heatmap activo |

---

## E4 — Configuración de Dimensiones (Variables)

| HU | Estado | Componentes / archivos |
|---|---|---|
| **US04-AC1** Subpágina Dimensiones (cards colapsables, switches, búsqueda, contador X/Y, NextStep al fondo) | ✅ Entregado con catálogo completo de la Figura 3 (56 variables) | `Components/Dimensions.tsx`, `Components/DimensionCard.tsx`, `Components/VariableSwitch.tsx`; catálogo en `Utils/variablesCatalog.ts`, colores en `Utils/dimensionColors.ts`, pesos signados en `Utils/variableWeights.ts`, estado global en `Utils/VariablesContext.tsx` |
| **US04-AC2** Tooltip con definición + polaridad de cada variable | ✅ Entregado | `Components/VariableTooltip.tsx` — ESC + click-fuera + segundo click cierran; `aria-expanded` / `role="tooltip"`; usa "Suma/Resta a prefactibilidad" |
| **US04-AC4** Chips de variables seleccionadas en esquina del mapa | ✅ Entregado con InfoPopover ampliado | `Components/SelectedVariablesChips.tsx` — pill compacta ↔ panel expandido; InfoPopover con tabs (Resumen + 4 secciones placeholder sprint 3) + botones "Anterior variable" / "Siguiente variable"; affordance **"Ver detalle"** debajo del label de cada chip; scrollbar siempre visible; auto-colapso del panel al abrir InfoPopover; límite de 4 chips en pill con `+N` overflow |
| **Íconos de variables (Figura 3)** como identificadores junto con color para la caja de selección | ✅ Entregado | Sistema multi-fuente: `Utils/variableIcons.tsx` resuelve por prefijo `lucide:` / `tabler:` / `svg:`; `Utils/tablerIcons.tsx` (7 íconos estilo Tabler dibujados inline); `Utils/customIcons.tsx` (7 SVGs propios: birdsV, birds3, seagrass, nest, cattails, coral, slope) |
| **7 puntajes** (general + 6 dominios) en tooltip de acceso permanente sobre el mapa | ✅ Entregado | `Components/HexValuesTooltip.tsx` (hover per-hex, sólo en heatmap activo) + `Components/HeatmapDimensionSwitches.tsx` (dropdown mutex de la dimensión visualizada) |
| **Popup info de variable seleccionada** (icono, id, descripción; otros items en sprint 3) | ✅ Entregado | InfoPopover del chip — descripción + indicador "Suma/Resta a prefactibilidad" + ID en sección Resumen; las 4 secciones extra (Cómo se calcula / Fuente de datos / Relevancia / Rango) son placeholders sprint 3 |

---

## E5 — Características del Proyecto (US05)

| AC | Estado | Componentes / archivos |
|---|---|---|
| **US05-AC1** Formulario dinámico para aerogeneradores | ✅ Entregado con 4 secciones | `Components/Caracteristicas.tsx`, `Utils/CaracteristicasContext.tsx` |
| ↳ Tipo emplazamiento (onshore/offshore) **auto-detectado** desde la selección; selector flotante/fija aparece si offshore | ✅ | usa `dominantHexType` de `hexClassification` |
| ↳ Capacidad nominal MW con **4 ruedas** (`[0][0].[1][0][0]`) que aceptan flechas + scroll wheel + teclado ↑↓ | ✅ | `Components/MWPicker.tsx` (~150 líneas, sin librería externa) |
| ↳ Tamaño proyecto (área heredada de selección + número de aerogeneradores + categoría **S/M/L**) | ✅ | reemplaza el rol del "catálogo de modelos" de US05-AC2 |
| ↳ Distancia al SIN | ✅ | input manual; auto-cálculo pendiente para sprint 3 |
| **US05-AC2** Selección de catálogo de modelos | ❌ Eliminada por decisión cliente — sustituida por categoría S/M/L (3 categorías ahora, podrían subir a 5) |
| **US05-AC3** Validación de rangos técnicos permitidos | ✅ Entregado | Errores inline por campo con `aria-invalid`; `NextStepButton.disabled` cuando hay errores + `blockedReason` ámbar al lado |

---

## E6 — Reportes (Informe)

| HU | Estado | Componentes / archivos |
|---|---|---|
| **US06-AC3** Previsualización en pantalla del informe + descarga PDF | ✅ Entregado | `Components/Report.tsx`, `Utils/pdfExport.ts` (usa `html2canvas-pro` para soportar oklch/color-mix de Tailwind v4) |
| ↳ **Score general** (puntaje grande, escala 0–100) | ✅ | `Utils/heatmapPalette.ts` — `generalScore(hexes)` promedio entre 5 dimensiones |
| ↳ **Score por cada dimensión/dominio** (5 barras horizontales con valor) | ✅ | dimensión activa en heatmap resaltada con bg brand |
| ↳ Resumen del área (región / coordenadas / km² / N variables activas) | ✅ | `Utils/reportData.ts` (`getRegion`, `getCentroid`, `formatCoordenadas`) |
| ↳ Sección "Variables informativas seleccionadas" (lista sincronizada con `VariablesContext`) | ✅ | aparece automáticamente; refleja en tiempo real las variables añadidas en el "+" del flotante del mapa |
| ↳ Header brand + footer ANH/EAFIT/Mavalan en el documento exportado | ✅ | identidad visible en pantalla y en PDF |
| **US06-HEAT-AC1** Heatmap multivariable clippeado al área + expandido a res 8 | ✅ Entregado con gradiente radial | `Components/Map.tsx` — `informeHeatmapLayer` con `cellToChildren(h, 8)`; gradiente **radial** desde centroide con ±15% ruido por dimensión; alpha 160 para que labels del basemap (CartoDB Positron) se vean debajo del heatmap |
| ↳ **Prefactibilidad en estándar Viridis** (amarillo alto → morado bajo) | ✅ | 11 stops Viridis interpolados |
| **US06-HEAT-AC3** Leyenda del heatmap | ✅ Entregado | `Components/HeatmapLegend.tsx` — gradiente vertical delgado + 5 buckets (Muy alta → Muy baja) + Corregimientos |
| **US06-HEAT-AC2** Toggle paleta Inferno/Viridis | ❌ Eliminada por decisión cliente — sólo Viridis |
| **Heatmap centrado en UNA métrica a la vez** + máximo OTRA simultánea en el hexágono | ✅ Entregado | dropdown mutex `HeatmapDimensionSwitches` (sin opción "sin visualización" — siempre on) + tooltip hover `HexValuesTooltip` con la 2da métrica per-hex (límite 4 variables informativas con `+N más`) |
| **Dos momentos para seleccionar variables** (Dimensiones + sección del Informe) | ✅ Entregado | `VariablesContext` compartido entre ambas fases; el flotante `InformativeVariablesList` permite añadir variables desde el mapa del Informe y la lista se refleja inmediatamente en el Report sidebar y en el PDF descargable |
| **Tooltip per-hex** con valor o promedio de cada puntaje y variable informativa seleccionada — con restricción de nº variables (límite 4) | ✅ Entregado | `Components/HexValuesTooltip.tsx` — solo cuando `heatmapActive` y desktop |
| **Renombrado "Viabilidad" → "Prefactibilidad"** en UI | ✅ Entregado | `Report.tsx` ("Análisis preliminar de prefactibilidad eólica" + "Puntajes de idoneidad por dimensión"), `HeatmapLegend.tsx` ("Prefactibilidad (%)"), `VariableTooltip` y `SelectedVariablesChips` ("Suma/Resta a prefactibilidad"), `PhaseHintCard` ("analizar su prefactibilidad"), `SideBar` ("Informe de prefactibilidad" / "Histórico de prefactibilidad"), `Admin/CreateUserModal.tsx` + `Admin/EditUserModal.tsx` ("análisis de prefactibilidad") |
| **"PUNTAJES DE IDONEIDAD"** en lugar de "Puntajes" (sprint 2) | ✅ Entregado | `Report.tsx` ("Puntajes de idoneidad por dimensión"), `HexValuesTooltip.tsx` (sección "Puntajes de idoneidad") |

---

## Feedback ronda 1 (US-FB-*)

| HU | Estado | Notas |
|---|---|---|
| **US-FB-01** Keycloak en español + password policy + botón Inicio + logout en español | ✅ Entregado | branch `feature/us-fb-01` mergeada |
| **US-FB-02** Flujo post-registro con confirmación en español | ✅ Entregado | `app/registration-success/page.tsx` |
| **US-FB-03** Gestión de expiración de sesión + SessionGuard | ✅ Entregado | `Components/SessionGuard.tsx`; tests E2E quedan para sprint 3 |
| **US-FB-04** Territorio colombiano completo (offshore) | ✅ Entregado y superado por **US-FB2-02** |
| **US-FB-05** Admin — visibilidad y asignación de roles | ✅ Entregado | `Components/Admin/UsersTable.tsx` con prefetch de roles + badge |
| **US-FB-06** Notificación email al asignar admin | ✅ Implementada en scope 1 — la doc original marcaba "BLOQUEADA por ADR-009" pero el feature ya estaba en producción |
| **US-DOC-01** Documentación técnica (auth / testing / stack) | ✅ Entregado | en `docs/security/`, `docs/testing/`, `docs/architecture/` |

---

## Feedback ronda 2 (US-FB2-*)

| HU | Estado | Componentes / archivos |
|---|---|---|
| **US-FB2-01** Guía visual de próximo paso | ✅ Entregado y ampliado | `Components/NextStepFloatingCard.tsx` con borde brand 2px (`#165170ff`); **`Components/PhaseHintCard.tsx`** — tip permanente en `seleccion-area` ("Selecciona un área para analizar su prefactibilidad") + tips eliminables por fase (`dimensiones`, `caracteristicas`, `informe`) con dismiss persistido en `localStorage`; mismo skin brand (border 2px + top bar `bg-[#cce1eeff]` + animación `vento-cta-in`) |
| **US-FB2-02** Cartografía oficial IGAC | ✅ Entregado | `Utils/data/colombia-igac-boundary.json` (unión IGAC ArcGIS + Nominatim OSM admin_level=2 ~22 km offshore); `scripts/generate-igac-boundary.mjs` re-generable con flag `--land-only` para clasificación tierra-pura; ADR-014 documentado |
| ↳ Eliminado `ARCHIPELAGO_POLYGON` duplicado | ✅ | IGAC + Nominatim ya cubren San Andrés/Providencia con sus 12 millas náuticas |
| **US-FB2-03** Polish layout landing/dashboard | 🚫 Condicionada — sigue esperando la validación con el PC del cliente |
| **US-FB2-04** Transición visual al cambio de resolución H3 | ✅ Entregado | slide rAF 3-fases para search box + pill "...cargando mapa" durante tiles loading |
| **US-FB2-05** Icono claro para cerrar sesión | ✅ Entregado | `Components/SideBar.tsx` |
| **Favicon turbina** brand (reemplaza default Next) | ✅ Entregado | `src/app/icon.svg` |

---

## Tests actualizados a los cambios del scope

- `src/app/Utils/h3Resolution.test.ts` — refs a `ARCHIPELAGO_POLYGON` y `featureCount` removidas; asserts ahora reflejan IGAC + 12 millas
- `src/app/Components/Report.test.tsx` — labels actualizadas (`Ambiental` / `Técnica` / `Económica` / `Socioeconómica` / `Regulatoria`)
- `src/app/Components/SelectedVariablesChips.test.tsx` — aria-label `Ver detalle de` para la affordance
- `src/app/Components/Dimensions.test.tsx` — labels del catálogo nuevo + click manual para expandir las cards
- `src/app/Components/AreaDisplay.test.tsx` — `getByText` exacto en lugar de regex `/^0\s/` (text-node separado del span de unidad)
- `src/app/Components/VariableTooltip.test.tsx` — fixtures incluyen `iconKey`

---

## HUs explícitamente eliminadas durante el sprint

| HU | Motivo |
|---|---|
| **US05-AC2** Selección de catálogo de modelos de aerogeneradores | Decisión cliente: el número y tipo se predefinen con reglas lógicas a partir de Capacidad MW + Categoría S/M/L |
| **US06-HEAT-AC2** Toggle paleta Inferno/Viridis | Decisión cliente: una sola paleta GIS estándar (Viridis amarillo↔púrpura) para evitar confusión interpretativa |

---

## Pendiente para sprint 3 (no parte de este cierre)

| Item | Razón |
|---|---|
| **US03-AC6** Ingesta `.h3.parquet → JSON` con datos reales | Sigue siendo blocker para el modelo multicriterio y el heatmap WLC real; los valores actuales son placeholder determinista por `(varId, hex)` |
| Fix definitivo del bug onshore/offshore | Necesita correr `npm i && node scripts/generate-igac-boundary.mjs --land-only` antes del PR para que `hexClassification.ts` use el polígono IGAC oficial en lugar de la aproximación manual de 30 vértices |
| Aval cliente del heatmap WLC + pesos signados | Pendiente reunión con cliente |
| **US-FB2-03** Polish layout | Esperando validación en PC del cliente |
| Tests E2E de SessionGuard (US-FB-03) | Pendiente |
| Plantilla Figma del PDF del informe | El PDF actual es estético con identidad brand pero sin template oficial |
| Geocoding inverso para tooltip hover (nombre del lugar en lugar de basemap labels) | Riesgo de rate-limit Nominatim si se hace por-hex; alternativa actual: alpha 160 en heatmap permite leer los labels del basemap |
| Auto-cálculo de distancia al SIN | Hoy es input manual |
| 4 secciones extra del InfoPopover de variable (Cómo se calcula / Fuente / Relevancia / Rango) | Placeholders presentes, contenido sprint 3 |
