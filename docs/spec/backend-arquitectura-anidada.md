---
proyecto: Vento — backend (FastAPI + Postgres)
doc: Rediseño de arquitectura fiel al MODELO ANIDADO + actualizador de metadatos (CSV/XLSX) + separación onshore/offshore
fecha: 2026-09-22
depende_de: docs/spec/modelo-datos-anidado.md (verdad del modelo de datos)
estado: DISEÑO para aprobar antes de construir
---

# Backend anidado — diseño

> **Objetivo (winx, 2026-09-22):** que el backend sea **fiel al modelo anidado**
> (`dimensión → criterio → subcriterio → variable / variable_pon`, con clases),
> con un **actualizador de metadatos** que reciba **CSV y XLSX**, **clasifique
> columnas** y **traiga o concilie**, que la **BD registre/extraiga/concilie**
> todo, y que **separe onshore de offshore**.

Principios (heredados): la ingesta **nunca adivina** (plan → conciliar → aplicar);
lo real vive en BD (editable), el hardcode es solo template; conciliación por
**código/`master_id`**, no por nombre.

---

## 1. Esquema objetivo

Dos bloques: **A) Catálogo jerárquico (metadatos)** — hoy aplanado en
`catalog_variable`; pasa a ser **jerarquía de primera clase**. **B) Datos por hex**
— hoy `hexagon` con JSONB; se **particiona por emplazamiento**.

### A. Catálogo jerárquico (metadatos editables) — NUEVO

```
catalog_dimension (id, nombre, definicion, orden, puntua bool)          -- 5
  └ catalog_criterio (id, dimension_id→, code, nombre, definicion, peso) -- 6 (+ económica/regul.)
      └ catalog_subcriterio (id, criterio_id→, code, nombre, definicion) -- 15
          └ catalog_variable (master_id PK, subcriterio_id→, ...)        -- 61+ / informativas / ECO
```

`catalog_variable` (amplía la tabla actual — ver §Migraciones):
`master_id, subcriterio_id, code_base, label, descripcion, fuente, licencia,
url_fuente, emplazamiento(onshore|offshore|both), en_mapa, en_menu, clase
(modelo|informativa|alerta|excluyente|campo), tipo, peso, polaridad, rango,
unidad, map_kind, map_threshold, icon_key, no_calculo, excluyente, enabled`.

> Fuentes de cada campo (ver `modelo-datos-anidado.md §11-bis`): **InfoVariables**
> (descriptivo + emplazamiento + licencia/url + en_mapa) · **modelo** (peso,
> polaridad, rango) · **admin/front** (icon_key, unidad).

### B. Datos por hex — TABLAS SEPARADAS onshore/offshore (decisión winx 2026-09-22)

**No** se reparte `hexagon`: onshore y offshore van en **tablas distintas** ("una
tabla nueva offshore vs onshore"). Esto evita reescribir `hexagon_repository`
(PK/`ON CONFLICT`/blue-green) y no toca los 2.5 M de onshore.

```
ONSHORE (hoy):
  hexagon                      -- crudas + scores (existe; sin cambios)
  hexagon_variables_pon        -- ponderadas (tabla NUEVA, PK h3_index)   ✅ Fase 2
OFFSHORE (cuando llegue el bundle):
  hexagon_offshore             -- tabla NUEVA, mismo shape
  hexagon_variables_pon_offshore
```

- **Ponderadas en tabla propia** (`hexagon_variables_pon`): las consume el
  "descargar crudos" del informe (no se desperdician datos). Se ingieren desde
  `variables_pon.h3.parquet` (`bundle_service._ingest_pon`).
- El offshore no repartirá nada: se **crean tablas nuevas** y el consumo elige la
  tabla por el emplazamiento del área (derivado batimetría).
- `hexagon_meta` (rangos) queda igual por ahora (onshore).

### C. Económica (subsistema aparte)
`economic_series(panel, escenario_mw, cat1, cat2, cat3, anio, valor)` +
`economic_panel(id, nombre, descripcion)` + `catalog_escenario`. No toca `hexagon`.

---

## 2. Registros y conciliación (la BD "registra/extrae/concilia")

| Registro | Para qué |
|---|---|
| `parquet_column` (existe) | clase de cada columna del **bundle parquet** (modelo) |
| `column_mapping` **(NUEVO)** | encabezado de **CSV/XLSX de metadatos** → campo destino del catálogo (perfil de importación) |
| `data_source` (+`emplazamiento`, `kind csv\|xlsx\|parquet`) | dónde vive cada doc + estado de su ingesta |
| `master_version` (por emplazamiento) | trazabilidad de versiones del dataset |
| estados `pendiente\|propuesto\|ok` | conciliación humana antes de aplicar |

**`column_mapping`** (perfil InfoVariables, ejemplo):
`"Dimensión"→dimension · "Criterio"→criterio · "Subcriterio"→subcriterio ·
"Variable"→label · "ID (...)"→master_id · "Descripción"→descripcion ·
"Fuente de datos"→fuente · "Tipo de licencia"→licencia · "URL..."→url_fuente ·
"Emplazamiento"→emplazamiento · "¿Se muestra en el mapa?"→en_mapa ·
"Menú"→(en_menu/tipo)`. Encabezado desconocido → **pendiente de conciliación**.

---

## 3. Actualizador de metadatos (CSV / XLSX) — NUEVO

Generaliza el motor `plan → conciliar → aplicar` a documentos de **metadatos**
(no solo parquet de datos). Servicio `metadata_ingest`:

1. **Detecta formato** (`.csv` → csv.DictReader · `.xlsx` → openpyxl/pandas) y lee
   **solo encabezados** (+ N filas de muestra).
2. **Clasifica columnas** contra `column_mapping` (perfil): conocida → destino ·
   desconocida → **pendiente**. Multi-hoja XLSX → una pasada por hoja relevante.
3. **PLAN**: "voy a upsertear N dimensiones / M criterios / K variables; estas
   columnas quedan pendientes".
4. **CONCILIAR** (panel admin): el humano resuelve encabezados/valores nuevos.
5. **APLICAR** (0 pendientes): **upsert conciliando por `master_id`** (variables) y
   por `code`/nombre (dimensión/criterio/subcriterio). Nunca por nombre de variable.
   Registra en `data_source` + estampa versión.

Adaptadores por tipo de doc (mismo motor, distinto perfil):
- **`InfoVariables(2) a/b/c`** → catálogo jerárquico (dimensión/criterio/subcriterio/variable).
- **bundle parquet del modelo** → `hexagon` (ya existe: `bundle_service`).
- **bundle económico xlsx** (`panel_por_variable`, `VARIABLES_2`, `variables_esce`)
  → `economic_series` (formato long) + `economic_panel`.

> ⚠️ **Regla de versiones:** la ingesta actualiza HACIA `InfoVariables(2)` (actual).
> La comparación con `InfoVariables1/2/3` (vieja) solo alimenta un **mapa de
> cambios de código** (p.ej. `TEC-015→AMB-040`) para no crear duplicados.

---

## 4. Separación onshore / offshore

Dos niveles, coherentes:
1. **Variable (metadato):** `catalog_variable.emplazamiento ∈ {onshore, offshore,
   both}` (de InfoVariables) → define **qué variables entran en cada modelo/menú**.
2. **Hex (dato):** partición `hexagon_onshore` / `hexagon_offshore` (de qué bundle
   vino) → ingesta y swap **independientes**.
3. **`data_source` + `master_version` por emplazamiento** → trazabilidad separada.
4. **Consumo:** el emplazamiento del área lo **deriva el cliente** (batimetría
   <100 m); el tile/score consulta la partición correspondiente y el catálogo filtra
   variables por `emplazamiento ∈ {ese, both}`.

Hoy: **solo onshore**. Offshore llega después con el **mismo layout** → se ingiere a
`hexagon_offshore` sin tocar onshore.

---

## 5. Módulos backend — qué se crea / cambia

```
migrations/versions/
  0009_catalog_hierarchy.py     NUEVO  dimension/criterio/subcriterio + campos catalog_variable (emplazamiento, licencia, url, unidad, icon_key, subcriterio_id)
  0010_hexagon_partition.py     CAMBIO hexagon → particionada por emplazamiento (+ migrar datos onshore)
  0011_economic.py              NUEVO  economic_series + economic_panel
  0012_column_mapping.py        NUEVO  registro de perfiles de importación CSV/XLSX
domain/models/
  catalog.py                    NUEVO  Dimension, Criterio, Subcriterio (entidades)
infrastructure/db/models.py     CAMBIO nuevas tablas + hexagon particionada + catalog_variable ampliada
infrastructure/data/readers/
  csv_reader.py / xlsx_reader.py NUEVO  lectura schema-agnóstica (headers + muestra)
application/services/
  metadata_ingest.py            NUEVO  plan/conciliar/aplicar para CSV/XLSX de catálogo
  economic_ingest.py            NUEVO  ingesta del bundle económico → economic_series
  bundle_service.py             CAMBIO apply por partición (emplazamiento)
api/routers/admin_catalog.py    CAMBIO endpoints: /metadata/plan, /metadata/conciliar, /metadata/apply, /master-codes, /finalize
infrastructure/data/
  variables_seed.json           CAMBIO regenerar desde InfoVariables(2) (con emplazamiento/licencia/url)
  parquet_column_seed.csv       CAMBIO alias densidad_wpd0=densidad_wpd; TEC_015=riesgo físico(amb)
```

---

## 6. Plan por fases (incremental, sin romper lo que corre)

- **Fase 1 — Catálogo jerárquico + actualizador de metadatos (CSV/XLSX). ✅ BACKEND HECHO (2026-09-22)**
  Migración `0009` + `metadata_ingest` + perfil InfoVariables + `column_mapping`.
  → destraba el "back de metadatos" y la página de Dimensiones (gana licencia/URL).
  Backend: `migrations/versions/0009_catalog_hierarchy.py`, `infrastructure/db/models.py`
  (Dimension/Criterio/Subcriterio/ColumnMapping + campos en CatalogVariable),
  `infrastructure/data/metadata_reader.py`, `application/services/metadata_ingest.py`,
  endpoints en `api/routers/admin_catalog.py` (`/metadata/upload|plan|apply|mappings`,
  `/hierarchy`). Front: seam `catalogApi.ts` (`uploadMetadata`/`planMetadata`/
  `applyMetadata`/`fetchHierarchy`), UI `admin/metadatos/page.tsx` + pestaña en `AdminNav`.
  ✅ Verificado: `py_compile` OK; **prueba de integración del parsing contra el CSV
  REAL** `datos/entregable/InfoVariables(2)b.csv` → 3 dim · 6 crit · 16 subcrit ·
  53 vars, con definiciones por nivel y emplazamiento/mapa/fuente correctos. Captura
  de las 3 columnas "Definición" por posición ya implementada.
  ✅ **Página de Dimensiones cableada a los metadatos de la BD**: `catalog_service`
  expone `emplazamiento/licencia/url/clase` en `/variables`; el front (`buildVariableFromDb`)
  los hidrata en el catálogo y **deriva `aplicaEn` (mar/tierra) desde `emplazamiento`**;
  la ficha al usuario (`SelectedVariablesChips`) muestra **Licencia + "Ver fuente ↗"**.
  ✅ Definiciones por nivel capturadas.
  **Pendiente de Fase 1 (menor):** regenerar `variables_seed.json` desde InfoVariables(2)
  (o correr `apply` contra el CSV real y jubilar el seed viejo). *No toca datos por hex.*
- **Fase 2 — Ponderadas en tabla propia + separación onshore/offshore por TABLAS. 🟡 PARCIAL HECHO (2026-09-22)**
  ✅ `hexagon_variables_pon` (migración `0010`, tabla nueva onshore) + modelo
  `HexagonVariablesPon` + `hexagon_pon_repository` + `bundle_service._ingest_pon`
  (lee `variables_pon.h3.parquet`) — `py_compile` OK. Consumo: la app lee igual;
  el "descargar crudos" del informe lee las ponderadas.
  ✅ **Exposición en "descargar crudos"**: `/tiles/area` (get_area_report) devuelve
  `variables_pon` por hex (`fetch_variables_pon` en la fuente Postgres + campo en
  `AreaHex`); el front (`useAreaHexData` + `Report.handleDownloadHexTable`) agrega una
  **2ª tabla "Valores ponderados por hexágono"** en la descarga. `py_compile` OK.
  **Pendiente:** cuando llegue el **bundle offshore**: crear `hexagon_offshore` +
  `hexagon_variables_pon_offshore` (tablas nuevas) y enrutar ingesta/consumo por
  emplazamiento. *NO se reparte `hexagon` (sin blast-radius en su repositorio).*
- **Fase 3 — Subsistema económico. ✅ BACKEND HECHO (2026-09-22)**
  Migración `0011` (`economic_series` long + `economic_panel`) + modelos +
  `application/services/economic_ingest.py` (plan/apply xlsx tidy → series; RESUMEN →
  panel; por defecto solo hojas curadas) + endpoints `api/routers/admin_catalog.py`
  (`/economic/plan|apply|panels|series|scenarios`). `py_compile` OK; parsing tidy
  verificado (escenario_mw ±, multi-cat, skip sin-valor). Sube el xlsx vía
  `/metadata/upload` (acepta .xlsx) y luego `/economic/apply`.
  ✅ **Panel económico del front cableado**: seam `fetchEconomicSeries`/`fetchEconomicScenarios`
  en `catalogApi.ts`; mapa `ECO_ID_TO_SERIES` (id de variable → panel + `cat1` real
  del inspect: RESUMEN1/EMPLEO/EMISIONES); `EconomicModal` trae la serie REAL del
  escenario_mw más cercano a la capacidad nominal y **cae al template** si el bundle
  no está ingerido. *Todas las fases del rediseño anidado: backend + front HECHOS.*

Cada fase = migración + servicio + seed + endpoint, con `USE_BACKEND=false` intacto
(el front sigue con template hasta que la fase esté lista).

---

## 7. Decisiones (RESUELTAS con winx, 2026-09-22)
1. ✅ **Onshore/offshore = TABLAS SEPARADAS** (winx: "una tabla nueva offshore vs
   onshore"). `hexagon`/`hexagon_variables_pon` = onshore; offshore = tablas nuevas
   cuando llegue. NO se reparte `hexagon` (evita reescribir su repositorio). *(Corrige
   la decisión previa de partición LIST.)*
2. ✅ **`variables_pon` = TABLA PROPIA** `hexagon_variables_pon` (NO JSONB en `hexagon`,
   NO se descarta): el **"descargar crudos" del informe las necesita** — no se
   desperdician datos. Crudas en `hexagon.variables`, ponderadas en `hexagon_variables_pon`.
3. ✅ **Jerarquía first-class** (`catalog_dimension/criterio/subcriterio`) con
   definiciones por nivel.
4. ✅ **Arrancamos por Fase 1 (metadatos).**

> Ajuste a §1.B: además de `hexagon` (crudas+scores), tabla **`hexagon_variables_pon
> (h3_index, emplazamiento, variables_pon jsonb)`** particionada — la consume el
> "descargar datos crudos" del informe. (Se construye en Fase 2.)
