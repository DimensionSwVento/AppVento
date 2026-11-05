# Vento — Historial de cambios por Sprint (front + back)

> Documento interno. Reconstruido desde el historial Git de **ambos repos** (front `AppVento` → `Vento/`; back `AppVento---Backend`), los **informes de entrega** (`Reportes_Entregas/entrega-1..3`) y la bitácora de trabajo.
> **Fechas de sprint (confirmadas por el equipo):** S1 abr 2026 · **S2 inicia 8-may-2026** · **S3 julio 2026** · **S4 septiembre 2026** (con sus fixes en oct–nov) · **S5 planeado**. Cada sprint tuvo su fase de **fixes/estabilización**.
> **Convenio:** ANH + EAFIT · Desarrollo: Mavalan Software · Plataforma SIG/MCDM de idoneidad eólica (onshore/offshore) en Colombia.

---

## Resumen (una línea por sprint)

| Sprint | Período | Tema (de qué trató) + eje | Entrega |
|---|---|---|---|
| **1** | Abr 2026 | ***Los cimientos*** — login Keycloak, mapa H3, admin usuarios, backend FastAPI, CI/CD, deploy AccuWeb | Entrega 1 |
| **2** | 8-may → jun 2026 | ***El flujo de análisis*** — mapa (área/km², onshore-offshore, buscador), Dimensiones/variables, Características, Informe + PDF, heatmap Viridis | Entrega 2 |
| **3** | Jul 2026 | ***Catálogo definitivo + template completo*** — 61+30 variables, flujo extremo-a-extremo en template (seams para datos reales) + backend en producción | Entrega 3 |
| **4** | Sep 2026 *(fixes oct–nov, en curso)* | ***Los informes + los datos reales*** — PDF nativo, integración de datos reales (BD editable, ingesta, scoring 1–5), rendimiento y capas de mapa; **fixes** = feedback + asumibles + rework de mapa | — *(en curso)* |
| **5** | *Planeado (no iniciado)* | ***Transparencia del modelo + HU nuevas*** — trazabilidad del cálculo, turbinas #26, capa satelital, mapa por dimensión, prospectivo | — |

> Cada sprint tuvo **fixes**: S1 → sprint de estabilización post-deploy; S2 → feedback rondas 1 y 2; S3 → feedback v2; S4 → feedback consolidado + asumibles + rework de mapa (en curso).

---

## Sprint 1 — Abril 2026 (Entrega 1)

**De qué trató — *el de los cimientos*:** poner la plataforma en pie — **autenticación** (Keycloak), el **mapa base** de hexágonos H3 y la **infraestructura** (backend FastAPI + CI/CD + primer deploy en AccuWeb).

**Fuente:** `Reportes_Entregas/entrega-1/informe_cierre_vento.md`. Scope contractual original (US01 login, US03 mapa H3, US08 CRUD usuarios) + ampliaciones sin costo.

### Front — implementado
- **Login institucional** Keycloak OIDC con NextAuth v5 (realm `vento`, roles admin/analista, PKCE, restricción de dominio).
- **Mapa SIG**: DeckGL 9 + MapLibre GL + hexágonos **H3** (res 3–7), click → ID → pintado; heatmap demo con tiles, leyenda, selector de variables, popup por hexágono.
- **Admin UI**: tabla de usuarios + asignación de roles.
- **Responsive** (móvil/desktop), **Testing** (Vitest + RTL, 17 archivos), **CI/CD** (GitHub Actions), **deploy AccuWeb** (Apache + Next standalone + SSL).

### Back — implementado
- **FastAPI** (Clean Architecture + DDD), guard JWT RS256 contra JWKS de Keycloak.
- **Tiles H3** por viewport; pipeline del `.h3.parquet` (126 MB) con índice tile-based y **5 niveles de caché**.

### Fixes (sprint de estabilización post-deploy: 11 puntos → 7 HUs)
- Keycloak en **español** + botón inicio + política de contraseñas (US-FB-01).
- **Expiración de sesión** con mensaje amigable (US-FB-03).
- **Territorio colombiano completo** (offshore + San Andrés + Providencia) (US-FB-04).
- Admin: **visibilidad de roles + asignación desde UI** (US-FB-05).
- **Notificación email** al asignar rol admin (US-FB-06, SendGrid temporal).
- Documentación técnica (auth, testing, stack, runbook) (US-DOC-01).
- *Pendiente:* pantalla de confirmación post-registro (US-FB-02).

---

## Sprint 2 — inicia 8-may-2026 (Entrega 2, entregada jun 2026)

**De qué trató — *el del flujo de análisis*:** armar el recorrido completo del analista — **seleccionar el área** en el mapa (km², onshore/offshore, buscador), configurar **variables/dimensiones** y **características** del proyecto, y generar el **primer informe** con heatmap Viridis y descarga **PDF**.

**Fuente:** `Reportes_Entregas/entrega-2/scope-2-entregado.md` (scope-dos + feedback rondas 1 y 2).

### Front — implementado
- **Mapa (parte 2):** **área (km²)** + idoneidad agregada; bloqueo de selección fuera de fase + bordes condicionales; **restricción onshore/offshore** (no mezclar tierra/mar); **buscador estilo Google Maps** (Nominatim) con auto-selección + fly-to 3 fases; mapa limpio en fase Informe.
- **Dimensiones / Variables:** cards colapsables, switches, búsqueda, contador X/Y; catálogo de **56 variables** con color, pesos signados e **íconos** multi-fuente (`lucide:`/`tabler:`/`svg:`); **tooltip** definición + polaridad; **chips** con InfoPopover; **7 puntajes** en tooltip per-hex; dropdown mutex de dimensión.
- **Características (US05):** emplazamiento auto-detectado, **capacidad MW con 4 ruedas**, tamaño S/M/L, distancia al SIN; validación de rangos inline.
- **Informe (US06):** previsualización + **descarga PDF** (html2canvas-pro); score general 0–100 + barras por dimensión; resumen del área; variables informativas; header/footer de marca; **heatmap Viridis** clippeado al área (res 8) + leyenda; dos momentos para seleccionar variables.

### Back — implementado
- *(La BD real se integra en S4; en S2 el modelo es template.)*

### Fixes (feedback rondas 1 y 2)
- Renombrado **"idoneidad" → "Prefactibilidad"** (luego revertido a "Idoneidad" en S3).
- Eliminadas por decisión del cliente: catálogo de modelos (→ S/M/L), toggle Inferno/Viridis (solo Viridis).
- US-FB-* ronda 1: Keycloak español + password policy + logout.
- *Pendientes (pospuestos):* integración datos reales (US03-AC6), aval heatmap WLC, polígono IGAC land-only.

---

## Sprint 3 — Julio 2026 (Entrega 3 — modo template completo)

**De qué trató — *el del catálogo definitivo y el "template completo"*:** dejar el **catálogo real de variables** (61 ponderadas + 30 informativas) y **todo el flujo funcionando de punta a punta** en modo demostración (template, con *seams* listos para los datos reales), y el **backend ya en producción** (Alembic/Docker/systemd + ingesta del parquet).

**Fuente:** `Reportes_Entregas/entrega-3/scope-3-entregado.md` (template completo, con **seams** listos para datos reales). Back de julio = **puesta en producción** del backend.

### Front — implementado
- **Catálogo definitivo**: 4 dimensiones puntuables (Ambiental, Técnica, Social, económica) + Regulatoria (informativa); **61 variables ponderadas** (jerarquía Dimensión→Criterio→Subcriterio) con código, fuente y marca de mapa; **30 informativas** en panel desplegable.
- **Características**: emplazamiento **mar/tierra por dato**, filtro por `aplicaEn`; capacidad/tamaño/aerogenerador.
- **Mapa**: **zonas excluidas** (viridis-0) no seleccionables con motivo; heatmap y popup a **res H3-8**.
- **Informe**: previsualización a pantalla completa; **captura del mapa** con reencuadre; **PDF idéntico a la vista** (captura del DOM); tabla de variables + ranking; tabla de fuentes; **disclaimer**.
- **Histórico**: límite 100 informes/usuario; **compactación** de hexágonos al guardar.
- **Modo template vs. datos reales** con flag único `NEXT_PUBLIC_USE_BACKEND` (seams para scores, heatmap, valores por variable, emplazamiento).
- **Renombres/limpieza:** "Prefactibilidad" → **"Idoneidad"**; Regulatoria fuera del score; Soporte = `mailto`.

### Back — implementado (puesta en producción, jul 2026)
- **Despliegue prod**: Alembic + Docker + systemd, **tabla `hexagon`**, auth obligatoria.
- **Ingesta de parquet en streaming** + vía **COPY** (atómica, sin OOM); backend **stateless** (consulta Postgres por request); bind VPC privada.
- **CI de auto-deploy** (push a main → CI + git + alembic + restart), verificación por etapas.
- *(Ago 2026)* **Cobertura de tests** (pytest + integración Postgres) alineada a RNF.

### Fixes (feedback v2 + cierre)
- Renombres y limpieza del menú (Configuraciones eliminado, Soporte `mailto`).
- Ajustes de catálogo/jerarquía y seams de datos reales.
- *Pendientes (pospuestos, stoppers de Entrega 3):* modelo definitivo (datos+pesos), texto oficial del disclaimer, SMTP definitivo, formato del manual, ambiente de test.

### Diferido a Sprint 4
Informe preconfigurable, detalle técnico por dimensión, cálculo económico, límites offshore, informe extenso, manual.

---

## Sprint 4 — Septiembre 2026 *(fixes oct–nov 2026, en curso)*

**De qué trató — *el de los informes y los datos reales*:** el **informe profesional** en **PDF nativo** (vectorial, texto buscable, índice) y la conexión de **datos reales desde la BD** (backend **editable** + motor de **ingesta**), más el **endurecimiento de rendimiento** del mapa/backend y las **capas de mapa**. Sus **fixes** (feedback + asumibles + rework de mapa) siguen **en curso**.

El grueso del trabajo: **integración de datos reales**, **backend de datos editables**, **PDF nativo**, **endurecimiento de rendimiento** y **capas de mapa**. El **cierre de fixes** (feedback + asumibles + rework de mapa) está en curso sobre la rama `fix-sprint4` (en gran parte **en working tree sin commitear** y **sin probar en deploy**).

### Entregado (septiembre) — Front
- **Datos reales desde BD** en catálogo, pesos, económico y turbinas (modo backend ≠ template; nada falso con backend ON).
- **PDF nativo** (4 fases): charts SVG → **vector** (svg2pdf) multipágina, **texto seleccionable/buscable**, **compresión + metadatos + índice navegable**.
- **Capas de mapa en res8** (área/interconectado/calor) con iconos; capas también en **Dimensiones**; resolución unificada por zoom.
- **Admin**: catálogo (variables/datasets/normativa/escenarios) vía BFF; **actualizador de metadatos** multi-archivo con auto-detect; **subir master** por drag-and-drop por paquetes con progreso; CRUD **turbinas**; texto de informe editable; UI de **conciliación** del motor de ingesta por clases.
- **Informe**: resumen del cálculo con números, muesca de idoneidad, paginación; fuentes/intervalos desde BD.
- **Histórico**: rehidratación de config + versión de master; `sub` estable de Keycloak. Refactor providers → `AppProvider`/ProviderComposer.

### Entregado (septiembre–octubre) — Back
- **Backend de datos editables** + **motor de ingesta por clases** del modelo.
- `POST /tiles/variable` + `/tiles/variables-bulk`; **upload de bundle** drag-and-drop (plan/apply).
- **Ingesta anti-OOM**: por paquetes (row-groups), **advisory lock**, `--timeout 1800`, versión de máster; **scoring 1–5**, `app_config`, importador de metadatos, registro de columnas; CRUD turbinas; catálogo por ingesta (sin seeds).
- **Rendimiento**: streaming + agregación por resolución; **excluidos en una petición** (`GET /tiles/excluded`); pool explícito; **PK `h3_index` → BIGINT**; índice parcial; warmup+caché; `GET /api/admin/db/overview`; **load tests** por endpoint + diagnóstico (EXPLAIN, py-spy).

### Fixes de Sprint 4 — en curso (oct–nov 2026, rama `fix-sprint4`)

**4.a — Feedback (commits de oct):**
- Sesión: refresh por issuer HTTPS; **sesión infinita** (no cierre a los 30 min); autoguardado de borrador del flujo.
- Admin/roles: aclarar downgrade reversible (#180); "modo activo" del mapa (#184); "Gestión de usuarios" → **"Gestión Admin"**.
- **Calidad del informe** (FB7): fuente única Helvetica, tamaños legibles, flechas de las barras, definición de charts.
- Mapa: punto de capa con **color de la variable**; quitar blink de iconos; aviso de reconexión ámbar/compacto; overlay 404 de error de conexión; no re-pedir `variables-bulk` al ocultar capa.
- Registro sin "config error" (callback por issuer HTTPS).
- Orden del modal de onboarding.

**4.b — Asumibles (sesión reciente, working tree):**
- Informe/PDF **#27/#31**: columna Dimensión por variable + informativas etiquetadas/ordenadas.
- Informe/PDF **#32**: escala "/100" en las barras de puntaje.
- Informe/PDF **#33**: síntesis ejecutiva por dimensión en la hoja 1.
- Informe/PDF **#34**: botones Descargar/Guardar a la cabecera.
- Informe/PDF **#35**: rango min–max bajo el gauge.
- Informe/PDF **#29**: nombre autogenerado (localidad + fecha/hora).
- Informe/PDF: radar en su propia hoja; **paginación empaquetada** (bloques finos ≤ A4 → sin cortes ni huecos); quitado el botón "datos por hex".
- **10.3**: aviso de variables (caja azul + bombilla + "Conoce más").
- **7.1**: reset del tipo de emplazamiento residual al borrar el área.
- **mar/tierra**: clasificar el hex por su celda res-8 (no por hijos costeros).
- **7.3**: permitir velocidad + densidad del viento juntas; regla "una capa de calor a la vez" movida al control de capas del mapa (radio).
- **Reset** de Dimensiones + Características al borrar/cambiar de área.
- **Capas del mapa inactivas por defecto** (opt-in).
- **Modal económica**: capacidades leídas desde la BD (no tope 100 MW hardcodeado).
- **10.15**: iconos distintos por variable (duplicados corregidos) + icono/color del mapa = modal.

**4.c — Rework de capas de mapa (grande, iterativo):**
- **Fuente única** `mapComponent(id) → {icono, color, kind}` (mapa, modal, admin) + campo `color` por variable + `hslToHex`.
- **Color distinto por variable** (hash del id).
- Icono **sobre las celdas reales** del área (no en puntos template) → icono y área coinciden.
- **Resumen por resolución** de las áreas (siguen el zoom, no se quedan en res8).
- **Anidado concéntrico** ("yema") de áreas que se solapan + rellenos semitransparentes con borde fuerte.
- Iconos tipo **pin "signo de ubicación"**, **uno por área** (clúster contiguo); varios co-ubicados → pin de **cabeza ancha** (compuesto).
- **Sin tope** de áreas activas *(límite por rendimiento pendiente de definir)*.
- **Pintado unificado** curadas + genéricas (anidan y los pines se funden entre sí).
- **Template**: zonas dispersas y fuera de las zonas excluidas, con cruces parciales.

### Pendientes de Sprint 4 (fixes)
- **Pospuestos — requieren server** (se dejan al final): SMTP (2.2), Keycloak theme/admin (10.2, #59), endpoint de renombrar informe (#28).
- **Pospuestos — esperan insumo del cliente** (no bloqueados): pesos reales (9.2), unidades/escalas informativas (10.17), ejemplo del faltante cartográfico (3.1).
- **🔴 último (rendimiento/mapa)**: 7.4 (caché de capas), FB4 (color hex no idóneos), FB5 (capas fijas); **F2** iconos `tabler:`/`svg:` → lucide; **F5** admin (texto + chip icono/color); manual (FB1).

> Ningún fix está **bloqueado** — solo **pospuesto**.

---

## Sprint 5 — *planeado (HUs nuevas, no iniciado)*

**De qué trata — *el de la transparencia del modelo y las HU nuevas*:** explicar **cómo se calcula** el índice (trazabilidad: ponderaciones, fuentes, limitaciones) y sumar **funcionalidad nueva** — turbinas, capa satelital y mapa por dimensión en el informe.

De la retroalimentación consolidada (Planning / Consolidado "Sprint 5"), lo que **NO es un fix asumible** se separa como **HU nueva** → Sprint 5 real, **aún sin iniciar**:
- **Trazabilidad / transparencia del modelo** (cómo se calculó el índice, ponderaciones, fuentes, limitaciones).
- **Turbinas** (#26): descripción/combinación/potencia con valores del cliente + campos faltantes.
- **Capa satelital** (basemap).
- **Mapa por dimensión** dentro del informe.
- **Detalle interpretativo** del análisis prospectivo.

---

## Apéndice — fuentes

- **Repos:** `AppVento` (front, 396 commits, ene–oct 2026, incluye `Vento/`) · `AppVento---Backend` (back, 57 commits, abr–oct 2026).
- **Informes de entrega:** `Reportes_Entregas/entrega-1/informe_cierre_vento.md`, `entrega-2/scope-2-entregado.md`, `entrega-3/scope-3-entregado.md`.
- **Memoria de trabajo:** `sprint-3-scope`, `feedback-sprint3-*`, `asumibles-sprint5`, `bitacora-asumibles-s5`, `map-layers-rework`, `sprint-5-agenda`.
- **docs/**: arquitectura, backend-api, modelo de datos anidado, ADRs, benchmark h3.

*Fechas de sprint confirmadas por el equipo (S2 8-may, S3 jul, S4 sep). "Sprint 5" como nombre del planning del cliente ≠ sprint de entrega de los fixes (que es el 4).*

---

# Anexo — Inventario crudo de características (literal, con fecha de creación)

> Fecha = primer commit que creó el archivo/ruta (git). Las APIs se agrupan por router (la fecha es la del alta del router). Los componentes excluyen archivos de test.

## Backend — APIs (endpoints, por router)

### Router `/tiles` — creado **2026-04-01**
- `GET /tiles/{z}/{x}/{y}` — tile de hexágonos del viewport
- `GET /tiles/detail/{h3_index}` — detalle de un hexágono
- `GET /tiles/excluded` — capa completa de excluidos (una petición)
- `GET /tiles/warmup` — precalentado
- `GET /tiles/counts` — conteos
- `GET /tiles/variables` — lista de variables
- `POST /tiles/area` — scores/variables agregados del área
- `POST /tiles/heatmap/area` — heatmap del área
- `POST /tiles/variable` — capa de una variable
- `POST /tiles/variables-bulk` — varias variables en una pasada

### Router `/historico` — creado **2026-07-27**
- `GET /historico` — listar informes del usuario
- `POST /historico` — guardar informe
- `DELETE /historico/{informe_id}` — eliminar informe

### Router `/admin/catalog` — creado **2026-09-16**
- `GET /variables` · `POST /variables` · `PATCH /variables/{var_id}` — catálogo de variables
- `GET /master-codes` · `GET /hierarchy` — códigos master / jerarquía
- `PATCH /datasets/{var_id}` — dataset/fuente de la variable
- `POST /metadata/upload` · `POST /metadata/plan` · `GET /metadata/mappings` · `POST /metadata/mappings` · `POST /metadata/apply` — importador de metadatos
- `POST /economic/plan` · `POST /economic/apply` · `GET /economic/panels` · `GET /economic/series` · `GET /economic/scenarios` — económico
- `GET/POST /normas` · `PATCH/DELETE /normas/{norma_id}` — normas regulatorias
- `GET/POST /escenarios` · `PATCH/DELETE /escenarios/{esc_id}` — escenarios económicos
- `GET/POST /turbines` · `PATCH/DELETE /turbines/{turbine_id}` — turbinas (CRUD)
- `GET /config/{key}` · `PATCH /config/{key}` — app_config

### Router `/admin/bundle` — creado **2026-09-16**
- `POST /upload` · `POST /plan` · `POST /apply` · `POST /apply-detached` · `POST /apply-chunk` · `POST /chunks` · `POST /finalize` — ingesta del bundle por paquetes
- `GET /columns` · `PATCH /columns/{name}` · `POST /columns/{name}/rename` — columnas de la máster

### Router `/admin/master` — creado **2026-09-16**
- `GET /status` — estado/versión de la máster
- `POST /update` — actualizar máster

### Router `/admin/db` — creado **2026-10-01**
- `GET /overview` — verificación de BD (admin)

### Salud / diagnóstico (`main`) — creado **2026-04-01**
- `GET /api/health` · `GET /api/_debug/stats` · `GET /api/_debug/inflight`

## Backend — motores / servicios (con fecha)
- `tile_service` · `parquet_reader` · `tile_index` · `keycloak_guard` — **2026-04-01**
- `historial_service` · `tools/ingest_parquet` — **2026-07-27**
- `bundle_service` · `catalog_ingest` · `catalog_service` · `master_service` · `tools/ingest_bundle` — **2026-09-16**
- `economic_ingest` · `metadata_ingest` — **2026-09-22**
- `config_service` — **2026-09-29**

## Frontend — componentes / características (`.tsx`, por fecha de creación)

**Sprint 1 (abr 2026) — base y admin**
- `SideBar` — 2026-03-26
- `Card` · `Dimensions` · `Map` · `NextStepButton` · `Report` — 2026-03-30
- `HexPopup` · `LayerInfo` · `VariableSelector` — 2026-04-01
- `SignInButton` — 2026-04-04
- `HeatmapDemo` *(removido)* — 2026-04-07
- `Admin/CreateUserModal` · `Admin/DeleteUserDialog` · `Admin/EditUserModal` · `Admin/UserSearchBar` · `Admin/UsersTable` — 2026-04-08
- `SessionGuard` — 2026-04-12
- `SignUpButton` — 2026-04-22

**Sprint 2 (may–jun 2026) — flujo de análisis**
- `AreaDisplay` — 2026-05-14
- `Caracteristicas` — 2026-05-19
- `DimensionCard` · `HeatmapLegend` · `PaletteToggle` *(removido)* · `VariableSwitch` · `VariableTooltip` — 2026-05-20
- `SelectedVariablesChips` — 2026-05-26
- `HeatmapDimensionSwitches` · `HexValuesTooltip` · `InformativeVariablesList` · `MapSearchBox` · `MWPicker` · `NextStepFloatingCard` — 2026-06-01
- `PhaseHintCard` — 2026-06-03

**Sprint 3 (jul 2026) — template completo**
- `ui/LoadingOverlay` · `onboarding/OnboardingModal` · `historial/HistorialList` · `report/RadarChart` · `ui/FieldError` · `ui/Toast` — 2026-07-15
- `dimensions/InformativeCatalog` *(removido)* · `onboarding/DisclaimerModal` · `report/AreaMiniMap` — 2026-07-30
- `map/MapSymbolsLegend` — 2026-07-31

**Sprint 4 (sep 2026) — informes + datos reales**
- `Admin/AdminNav` · `dimensions/EconomicModal` · `dimensions/RegulatoryModal` · `report/BarChart` · `report/DivergingBars` · `report/Gauge` · `report/LineChart` · `report/PieChart` · `report/ReportBuilder` · `report/ReportConfigPanel` · `report/ReportSheet` · `ui/ConfirmDialog` — 2026-09-10
- `map/WindHeatmapLegend` *(removido)* — 2026-09-17
- `Admin/QuickGuide` — 2026-09-23
- `dimensions/RegulatoryCard` — 2026-09-24
- `report/LineChartGrid` · `ui/BackendStatusBanner` — 2026-09-29

**Sprint 4 — fixes (working tree, sin commit aún)**
- `ui/ConnectionErrorOverlay` · `Utils/contexts/BackendHealthContext` — nov 2026

> *Nota:* los marcados *(removido)* ya no están en el código (reemplazados). Los de "working tree" son de la sesión de fixes actual y aún no están en git.

