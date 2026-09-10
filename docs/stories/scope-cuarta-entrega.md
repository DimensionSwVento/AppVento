---
proyecto: Vento — Plataforma de análisis territorial (idoneidad eólica)
sprint: 4 (ÚLTIMO)
origen: "Planning Sprint 4-1.pdf" (HUs del cliente) + feedback de usabilidad + cierre de bugs
fecha: 2026-09-02
---

# Scope Sprint 4 / Cuarta Entrega — Guía de Desarrollo

> **Objetivo del sprint (último):** convertir el informe en un **informe configurable por el usuario** (qué dimensiones/variables/gráficos incluir, con detalle del modelo y fuentes), habilitar la **administración de variables/datasets/normas/escenarios**, incorporar la **dimensión económica** como panel informativo, cerrar los **bugs de gestión de usuarios**, y pulir **usabilidad de navegación**.

> **Fuera de este scope (lo cubre la empresa):** manuales de usuario (video + detallado), manual técnico y manual de instalación.

> **Estructura:** igual que Scope 3 — `US0X` son **épicas/módulos**; las **HUs reales** son los ítems con criterios de aceptación. Se listan solo las HUs de este sprint.

---

## Estado de precondiciones (lo que YA existe de Scope 3)

- **Informe/PDF:** `Report.tsx` con previsualización, **radar SVG propio** (`RadarChart.tsx`), puntajes por dimensión, **tabla de fuentes** (fuente→variables), disclaimer, **captura del mapa** (snapshot) y **PDF paginado A4** con branding; pantalla completa (portal).
- **Variables/dimensiones:** catálogo definitivo (`variablesCatalog.ts`) con 61 ponderadas + 30 informativas + 4 características (jerarquía Dimensión→Criterio→Subcriterio, `masterId`, fuentes, `enMapa`, `aplicaEn`, `noCalculo`); menú de dimensiones muestra las **opcionales**; ficha de detalle (`variableDetails.ts`).
- **Mapa:** capas informativas con leyenda-interruptor (`mapSymbols.ts`, `MapSymbolsLegend.tsx`), zonas excluidas, emplazamiento mar/tierra.
- **Backend (seam):** BFF proxy autenticado (`api/tiles/[...path]`, `backendProxy.ts`), `USE_BACKEND`, histórico local+API.
- **Admin:** solo **usuarios** (`admin/users`, `CreateUserModal`, `EditUserModal`). **NO** existe admin de variables/datasets/normas/escenarios.

**Bloqueo transversal (heredado):** ingesta real del `.h3.parquet` / `InfoVariables.xlsx` con datos reales de todas las dimensiones. Owner: equipo de datos.

---

## Resumen de HUs (Sprint 4)

| Épica | HU | Historia | Prioridad | ¿Empezable? | Est. |
|---|---|---|---|---|---|
| US06 Reportes | **US06-03** | Preconfigurar informe de idoneidad | 🔴 Crítica | ✅ (sobre Report.tsx) | 8–11 d |
| US06 Reportes | **US06-04** | Informe PDF multipágina (resumen + por dimensión) | 🔴 Crítica | ✅ | (incl.) |
| US08 Admin | **US08-01** | Admin de variables y datasets + edición en menú | 🟡 Alta | ✅ (BE nuevo) | 2.25–3 d |
| US08 Admin | **US08-02** | CRUD normas regulatorias + detalle | 🟢 Media | ✅ | 1.5–2.5 d |
| US08 Admin | **US08-03** | CRUD escenarios económicos | 🟢 Media | ✅ | 1–2 d |
| US08 Admin | **US08-04** | Bugs gestión de usuarios (H16 confirmación, downgrade, delete honesto, feedback, buscador, desactivar) | 🔴/🟢 | ✅ | 2–3 d |
| US04 Variables | **US04-02** | Incluir variables económicas (panel informativo) | 🟡 Alta | ✅ | 2–2.5 d |
| US04 Variables | **US04-03** | Ajustes de visualización + datos reales (menú/detalle/mapa) | 🟡 Alta | 🟡 Datos | 1.5–3 d |
| US04 Variables | **US04-04** | Alerta área vs capacidad nominal | 🟢 Media | 🟡 (rangos D.Técnica) | 0.5–1 d |
| US04 Variables | **US04-05** | Regulatoria informativa: normas con etiquetas + agregar al informe | 🟢 Media | ✅ | 1–1.5 d |
| US09 UX/UI | **US09-03** | Unificar botón "Siguiente paso" (navegación) | 🟢 Media | ✅ | 1–1.5 d |
| US09 UX/UI | **US09-04** | Disclaimer: revisión de texto (EAFIT) inicio y final | 🔵 Baja | 🟡 Externo | 0.25 d |
| US03 Mapa | **US03-04** | Selección de área: revisar/añadir opciones | 🔵 Baja | ✅ | 1–1.5 d |
| Transversal | **QA-04** | Pruebas técnicas sobre el entorno actual | 🟢 Media | ✅ | — |

**Olas de ejecución:** Ola 1 = US08-04 (quick wins de riesgo) + US08-01/02/03 (fundaciones). Ola 2 = US06-03/04 + US04-02. Ola 3 = US04-03/04/05 + US09-03/04 + US03-04 + QA-04.

---

# Épica US06 — Reportes: Informe configurable

### US06-03 — Reportes: Preconfigurar informe de idoneidad
- **Prioridad:** 🔴 Crítica
- **Bloqueo:** 🟢 Empezable (construye sobre `Report.tsx`; económica/regulatoria dependen de US08-02/03 y US04-02)
- **Dependencia:** `Components/report/Report.tsx`, `RadarChart.tsx`, `useAreaScores.ts`, `variablesCatalog.ts`, `variableDetails.ts`
- **Criterios de Aceptación:**
  1. Panel **"Configuración del informe"** (lateral) donde el usuario define **qué incluir** antes de guardar/descargar.
  2. **Dimensiones puntuables** (Técnica, Ambiental, Social): el usuario puede **activar/desactivar** cada una para el informe, con las **variables seleccionadas previamente**.
  3. **Preconfiguración por defecto:** Económica y Regulatoria quedan **activadas por defecto SI fueron activadas** antes (económica con el **escenario** elegido; regulatoria con las **normas** preseleccionadas).
  4. Por cada dimensión puntuable, el usuario puede elegir **visualizar**: variables **puntuadas**, **detalle de las que influyeron** (peso + descripción del cálculo), marcar cuáles son **excluyentes**, cuáles **informativas**.
  5. Muestra **score general** + **score por dimensión puntuada**.
  6. **Tipo de gráfico** seleccionable para los scores: **radar / circular / barras**.
  7. **Detalle técnico del modelo** opcional: dimensión→criterio→subcriterio→variable con "¿se puntúa?" y **descripción del cálculo** (activable: "conocer detalle interno del modelo").
  8. **Detalle de variables informativas** y **de variables excluyentes** (bloques propios).
  9. **Fuentes consultadas** al final, **discriminadas por dimensión** (solo las de las dimensiones/variables que el usuario incluyó).
  10. **Previsualización en vivo**: al cambiar la configuración, la vista se actualiza; el usuario puede **incluir/excluir** antes de **guardar o descargar**.
  11. La configuración elegida se refleja **idéntica** en el PDF (US06-04) y en lo guardado al histórico.
- **Tareas técnicas:**
  - 📦 `Utils/report/reportConfig.ts` — tipo `ReportConfig` (dimensiones activas, mostrar puntuadas/pesos/cálculo/excluyentes/informativas, tipo de gráfico, económica{escenario,años}, regulatoria{normas}).
  - 📦 `Components/report/ReportConfigPanel.tsx` — panel lateral con toggles + selector de gráfico + "detalle del modelo".
  - 📦 `RadarChart.tsx` + nuevos `PieChart.tsx` / `BarChart.tsx` (SVG propio, misma línea) seleccionables por `ReportConfig.chart`.
  - 📦 `Report.tsx` consume `ReportConfig` para renderizar condicionalmente cada bloque.
  - 📦 `variableDetails.ts` — exponer "descripción del cálculo" y flags puntúa/excluyente/informativa por variable.
  - 🧪 Tests: config filtra bloques; default económica/regulatoria si activadas; fuentes por dimensión reflejan lo incluido; los 3 tipos de gráfico renderizan.

### US06-04 — Reportes: Informe PDF multipágina
- **Prioridad:** 🔴 Crítica
- **Dependencia:** US06-03, `Report.tsx` (captura DOM → jsPDF ya existente)
- **Criterios de Aceptación:**
  1. **Índice del informe** al inicio (Resumen ejecutivo, Dimensión técnica, ambiental, social, económica (Inf.), regulatoria (Inf.), Fuentes, Disclaimer) según lo incluido.
  2. **Página 1 – Resumen ejecutivo:** captura del **mapa con color de idoneidad** + **gráfico del score general** + **scores de las dimensiones seleccionadas** (solo puntuables).
  3. **Una sección/página por dimensión puntuable** (Técnica, Ambiental, Social): variables **seleccionadas** con detalle/descripción, **las evaluadas en el modelo**, **tipo de variable**, **pesos** y **cálculo realizado**.
  4. **Económica y Regulatoria** aparecen **después**, según la opción elegida en el menú (informativas, no puntúan).
  5. Al final: **fuentes de datos** (por dimensión) + **disclaimer**.
  6. Paginado A4 con branding; el PDF descargado = la previsualización configurada.
- **Tareas técnicas:**
  - 📦 Reestructurar el layout de `Report.tsx` en secciones paginables (índice + resumen + por dimensión + económica/regulatoria + fuentes + disclaimer).
  - 📦 Ajustar `handleDownloadPdf` para saltos de página por sección (no una imagen continua) o mantener captura por bloques.
  - 🧪 Tests: nº de páginas/secciones según config; resumen en pág 1.

---

# Épica US08 — Admin: Variables, Datasets, Normas, Escenarios y Usuarios

> Roles: **admin / Vento / ANH / Minciencias**. Todo bajo el patrón BFF ya existente (`backendProxy`).

### US08-01 — Admin: Ingresar/actualizar variables y datasets + edición en menú
- **Prioridad:** 🟡 Alta
- **Bloqueo:** 🟢 Empezable (nuevos endpoints admin)
- **Criterios de Aceptación:**
  1. Nueva sección de admin **"Variables y datasets"** (además de Usuarios) con dos pestañas: **Variables del modelo** y **Variables informativas**.
  2. **Variables del modelo:** **NO se pueden deshabilitar**; se permite **actualizar el dataset** asociado (subir/actualizar datos) y **editar el detalle** (descripción, fuente, unidad, rango).
  3. **Variables informativas:** **habilitar/deshabilitar**, **crear nueva**, definir si se ven **en mapa** y/o **en menú**, y **editar detalle**.
  4. **Detalle de variable** (panel): nombre, dimensión, tipo, dataset actual, visualización en mapa, fuente, cálculo, rango; con acciones Editar/Actualizar dataset/Deshabilitar (según tipo).
  5. Cambios auditables (historial de cambios básico).
- **Tareas técnicas:**
  - 📦 `admin/variables/page.tsx` + `Components/Admin/VariableTable.tsx` + `VariableDetailPanel.tsx`.
  - 📦 BFF/endpoints: `GET/PATCH /api/admin/variables`, `POST /api/admin/variables` (informativa), `PATCH /api/admin/datasets/:id`.
  - 📦 Fuente de verdad: alinear con `variablesCatalog` (el catálogo pasa a poder venir del backend en modo API).
  - 🧪 Tests: modelo no deshabilitable; informativa crear/toggle mapa-menú; editar detalle persiste.

### US08-02 — Admin: CRUD de normas regulatorias + detalle
- **Prioridad:** 🟢 Media
- **Criterios de Aceptación:**
  1. Sección admin **"Normativa (regulatoria)"**: listar, **crear**, **actualizar** normas y su **detalle** (nombre, tipo/estado, descripción, autoridad competente).
  2. Cada norma tiene un **estado/etiqueta rápida** (p.ej. Aplica / Requiere trámite / Requiere verificación / No aplica).
  3. Las normas alimentan la dimensión **Regulatoria informativa** del informe (US04-05).
- **Tareas técnicas:**
  - 📦 `admin/normativa/page.tsx` + endpoints `GET/POST/PATCH /api/admin/normas`.
  - 🧪 Tests: crear/editar norma; etiqueta de estado; aparece en el catálogo regulatorio.

### US08-03 — Admin: CRUD de escenarios económicos
- **Prioridad:** 🟢 Media
- **Criterios de Aceptación:**
  1. Sección admin para **crear/actualizar escenarios** de la dimensión económica (nombre, horizonte, variables/series asociadas).
  2. Los escenarios alimentan el **panel económico** del usuario (US04-02).
- **Tareas técnicas:**
  - 📦 `admin/escenarios/page.tsx` + endpoints `GET/POST/PATCH /api/admin/escenarios`.
  - 🧪 Tests: crear/editar escenario; disponible en el panel económico.

### US08-04 — Admin: Bugs de gestión de usuarios
- **Prioridad:** 🔴 Alta (contiene un riesgo alto) — resto 🟢
- **Dependencia:** `Components/Admin/CreateUserModal.tsx`, `EditUserModal.tsx`, `admin/users/page.tsx`, `api/admin/users/*`
- **Criterios de Aceptación:**
  1. **[H16 — riesgo alto]** Otorgar rol **admin exige diálogo de confirmación** explícito antes de aplicar; nada de cambios silenciosos.
  2. **Downgrade** (quitar rol admin) existe, es claro y con confirmación; se elimina el comportamiento raro.
  3. **"Eliminar usuario":** la interfaz **no debe mentir** — o se **implementa el borrado real**, o se **renombra a "Desactivar"** y el copy refleja que queda inactivo (decisión de producto; por defecto: renombrar a "Desactivar").
  4. **Feedback al crear usuario:** toast de éxito visible (usar el sistema de toasts existente); editar/desactivar con feedback claro (no diminuto en una esquina).
  5. **Buscador insensible a tildes** ("Gomez" encuentra "Gómez") + **filtros por rol y estado**.
  6. **Desactivar** es **acción directa** (con confirmación), no redirige al formulario completo de edición.
- **Tareas técnicas:**
  - 📦 Diálogo de confirmación reutilizable para cambios de rol/estado.
  - 📦 Normalizar acentos en el filtro (`.normalize("NFD").replace(/\p{Diacritic}/gu,"")`).
  - 📦 Toasts en crear/editar/desactivar; acción "Desactivar" directa desde la fila.
  - 🧪 Tests: confirmación en dar/quitar admin; buscador con tildes; toast al crear.

---

# Épica US04 — Variables: Configuración de Dimensiones

### US04-02 — Variables: Incluir variables económicas (panel informativo)
- **Prioridad:** 🟡 Alta
- **Dependencia:** US08-03 (escenarios), `Dimensions.tsx`
- **Criterios de Aceptación:**
  1. Al seleccionar **≥1 variable económica** se **activa un panel** "Dimensión económica – Escenarios de mercado".
  2. En el panel el usuario puede: **seleccionar escenario** y **años de proyección**, **agregar/desagregar** variables a la gráfica.
  3. **Gráfica de proyección** (serie de tiempo) de las variables elegidas (tipo de gráfico seleccionable).
  4. Opción **"Agregar al informe"** (incluye la sección económica en el PDF).
  5. **Nota aclaratoria** visible: "esta dimensión **ayuda en la toma de decisiones pero NO se puntúa** en el modelo de idoneidad".
- **Tareas técnicas:**
  - 📦 `Components/dimensions/EconomicPanel.tsx` (escenario/años/selección + serie de tiempo SVG) + estado en `ReportConfig`.
  - 📦 Datos desde `GET /api/tiles/economico` (o escenarios admin).
  - 🧪 Tests: panel aparece con ≥1 económica; nota "no puntúa"; agregar al informe togglea la sección.

### US04-03 — Variables: Ajustes de visualización + datos reales
- **Prioridad:** 🟡 Alta
- **Bloqueo:** 🟡 Datos reales (`InfoVariables.xlsx` / parquet)
- **Criterios de Aceptación:**
  1. **Visualización en menú** y **detalle** (fuente de datos, descripción) de todas las variables.
  2. **Visualización en el mapa** de variables **informativas y del modelo opcionales** desde el menú (algunas van a mapa, otras solo a detalle).
  3. **Datos reales** de todas las dimensiones del modelo e informativas (recordar: unas al mapa, otras solo al detalle).
  4. Las variables **no activables por el usuario pero calculadas** en el modelo **deben presentarse en el informe**.
  5. Ajustar la **máster** de variables informativas de **Macro** y **Regulatoria**.
- **Tareas técnicas:**
  - 📦 Cablear `variables{code}` reales por hex (ya hay seam en `useAreaHexData`); confirmar formato de claves con backend.
  - 📦 Marcar en el catálogo qué va a mapa vs solo detalle; mover macro a informativas donde aplique.
  - 🧪 Tests: variable calculada-no-seleccionable aparece en informe; mapa muestra solo las marcadas.

### US04-04 — Variables: Alerta área vs capacidad nominal
- **Prioridad:** 🟢 Media
- **Bloqueo:** 🟡 Rangos min/max por capacidad (D. Técnica)
- **Dependencia:** `Caracteristicas.tsx`, `capacity.ts`
- **Criterios de Aceptación:**
  1. Al seleccionar la **capacidad nominal**, si el **área seleccionada** está fuera del rango [min, max] esperado para esa capacidad → **alerta** clara (inline).
  2. Rangos configurables (se definen con D. Técnica); template hasta tener valores oficiales.
- **Tareas técnicas:**
  - 📦 Tabla `AREA_POR_CAPACIDAD` (template) + validación en `Caracteristicas.tsx` con `FieldError`.
  - 🧪 Tests: área < min o > max dispara alerta; dentro de rango no.

### US04-05 — Variables: Regulatoria informativa (normas + etiquetas + agregar al informe)
- **Prioridad:** 🟢 Media
- **Dependencia:** US08-02 (normas)
- **Criterios de Aceptación:**
  1. La dimensión **Regulatoria** es **informativa (no puntúa)** y muestra las **normas** aplicables con **etiquetas rápidas** (Aplica / Requiere trámite / Requiere verificación / No aplica) y contadores.
  2. Muestra **autoridades competentes** e **información normativa** de referencia.
  3. Opción **"Agregar esta sección al informe PDF"**.
- **Tareas técnicas:**
  - 📦 `Components/dimensions/RegulatoryPanel.tsx` (normas + etiquetas + contadores) alimentado por US08-02.
  - 🧪 Tests: etiquetas/contadores; toggle agregar al informe.

---

# Épica US09 — UX/UI

### US09-03 — UX: Unificar botón "Siguiente paso" (navegación) — ✅ Hecho
- **Prioridad:** 🟢 Media
- **Implementado:** un solo patrón/skin y redacción ("Siguiente paso: {fase}") en todas las fases (CTA flotante + botón de panel), con `usePhaseNav` como fuente única de orden/etiquetas/avance.
- **Origen:** evaluación de usabilidad — el usuario se pierde; el botón aparece en distinto lugar/formato en cada fase (a veces centrado, a veces uno solo).
- **Dependencia:** `NextStepButton.tsx`, `NextStepFloatingCard.tsx`, `PhaseHintCard.tsx`
- **Criterios de Aceptación:**
  1. **Un único patrón** de "Siguiente paso" consistente en todas las fases (mismo lugar, formato y comportamiento).
  2. Comunica claramente **qué sigue** y **qué falta** para continuar (p.ej. "Corrige los campos marcados").
  3. Coherente en desktop y mobile; accesible.
- **Tareas técnicas:**
  - 📦 Consolidar en un solo componente de navegación de fase; eliminar variantes divergentes.
  - 🧪 Tests: aparece igual en cada fase; estado deshabilitado/habilitado correcto.

### US09-04 — UX: Disclaimer (revisión de texto)
- **Prioridad:** 🔵 Baja
- **Bloqueo:** 🟡 Externo (validar texto con derechos de autor EAFIT)
- **Criterios de Aceptación:**
  1. El disclaimer se muestra **al inicio** (modal) y **al final** del informe (ya implementado).
  2. Texto **revisado/aprobado por EAFIT**; ajustar si cambian el mensaje.
- **Tareas técnicas:** actualizar `reportTemplates.ts` (`DISCLAIMER_BODY`) si EAFIT modifica el texto.

---

# Épica US03 — Mapa

### US03-04 — Mapa: Selección de área (revisar/añadir opciones) — ✅ Hecho
- **Prioridad:** 🔵 Baja
- **Criterios de Aceptación:**
  1. Revisar las **opciones actuales** de selección (clic hex / buscador). ✅
  2. Evaluar y, si es viable, **agregar otras**. ✅
- **Implementado:**
  - **Selección por polígono** (estilo Google Maps): clic para poner vértices → los hexágonos dentro quedan seleccionados (`selectPolygon` sobre `polygonToCells`, filtra excluidos y fuera de Colombia).
  - **Selección por coordenadas**: panel bajo el buscador; `lat, lng` → añade vértice y vuela ahí; forma el mismo polígono; "Seleccionar área".
  - **Movimiento del buscador** cambiado a salto directo (como `zoomToSelection`) — más rápido y estable que el slide cinematográfico.
  - El **pincel** (arrastre) se retiró: el picking durante el drag no era fiable; la selección por polígono lo reemplaza.
- **Seam:** `useMapSelection` (`selectPolygon`, `handlePlaceSelect`), `Map.tsx`, `MapSearchBox.tsx`.

---

# Transversal — QA-04: Pruebas técnicas
- Se pueden ejecutar sobre el **entorno actual**. Cobertura de las nuevas HUs (preconfig, admin variables, panel económico, bugs de usuarios) con Vitest + RTL; smoke E2E de "configurar informe → descargar PDF".

---

## Riesgos y decisiones abiertas
- **Alcance vs. tiempo:** US06-03 (8–11 d) + admin (US08-01/02/03) son el grueso; si aprieta, priorizar **preconfig + PDF multipágina** y dejar admin de escenarios/normas como *config mínima*.
- **Delete de usuarios (US08-04.3):** decisión de producto — implementar borrado real vs. renombrar a "Desactivar". **Default propuesto: renombrar.**
- **Datos reales (US04-03/04):** dependen del equipo de datos; construir con template + seam.
- **Rangos área/capacidad (US04-04):** pendientes de D. Técnica.
