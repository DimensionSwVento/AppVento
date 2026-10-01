---
title: Arquitectura — Base de datos espacial H3 (h3-pg)
project: Vento-
author: Winston (Architect)
date: 2026-09-30
status: propuesta
evidence: docs/testing/benchmark-carga-h3-2026-09-30.md
---

# Arquitectura — Base de datos espacial H3 con `h3-pg`

> **Decisión técnica** para resolver los cuellos de rendimiento de la API de mapa,
> validados por el benchmark de carga (`docs/testing/benchmark-carga-h3-2026-09-30.md`).
> Convierte la PK de los hexágonos a tipo nativo `h3index` (BIGINT/hexadecimal),
> parte la tabla gorda y empuja la agregación H3 a SQL.

## 1. Contexto y problema (resumen de la evidencia)

El benchmark demuestra que el cuello es de **layout de datos**, no de código app:

- `hexagon` ≈ **1,62 M filas × 746 B** (JSONB `variables` *inline*).
- **PK de tipo `text`** → engorda todos los índices.
- **`cache-hit` 74,4 %** (sano >99 %): la BD lee de disco en cada query.
- `variables-bulk`: **5,8 s/consulta**, lee **1,33 GB** (BitmapAnd de 2 btrees + bitmap lossy).
- `warmup`: `count(*)` con **432 K heap-fetches** (visibility map viejo).
- `excluded`: scan completo **sin índice** (~30 s).
- Techo de ~**25 usuarios** (2 workers × 18 hilos = 36 ops BD, acaparadas por los lentos).

## 2. Objetivos y principios

- **Atacar la causa raíz** (I/O y cache-hit), no parchar síntomas.
- **Boring technology**: extensión madura (`h3-pg`) + Postgres estándar; evitar
  reescrituras masivas de la app.
- **Migración segura sin frenar la app**: construir en paralelo + swap atómico
  (blue-green por vistas/rename), con backup previo. (Ver memoria
  `arquitectura-datos-editables`.)
- **Compatibilidad de API**: el H3 sigue viajando como **string hexadecimal** por
  el cable (límite de 53 bits de JS); `h3index` solo vive dentro de Postgres.

## 3. Decisiones de arquitectura

| ID | Decisión | Justificación (evidencia) |
|----|----------|---------------------------|
| D1 | **PK `text` → `h3index`** (BIGINT 8 B) | PK string engorda índices; 8 B sube cache-hit y acelera `IN`/joins. El string H3 **ya es** el hex del int64 → conversión 1:1. |
| D2 | **Partir la tabla gorda** (vertical): `hexagon` flaco + `hexagon_variables` (JSONB aparte) | `variables-bulk` lee `width=746` por fila; sacar el JSONB del camino caliente baja el I/O del bbox. |
| D3 | **Columnas padre H3 materializadas** (`h3_res6`, `h3_res5`) indexadas | Permite `GROUP BY` de agregación en SQL (no en Python) y bbox por contención de padre. Reemplaza el BitmapAnd lat/lng. |
| D4 | **Vista materializada por resolución** de valores de variable | `variables-bulk` lee miles de filas precomputadas, no 221 K. |
| D5 | **`excluded` como tabla propia** (`hexagon_excluded`) | Endpoint pasa a `SELECT` trivial; se regenera en la ingesta. (Decisión confirmada por el cliente.) |
| D6 | **`warmup`: `reltuples` + `VACUUM`** y/o tabla de conteos | Elimina el `count(*)` de 720 ms y los 432 K heap-fetches. |
| D7 | **Tuning Postgres**: `shared_buffers`, `work_mem` | cache-hit 74 % y bitmap *lossy* = RAM de BD insuficiente. |

## 4. Esquema objetivo (DDL)

### 4.0 Extensión
```sql
CREATE EXTENSION IF NOT EXISTS h3;
-- opcional, solo si se quiere geometría/GiST real:
-- CREATE EXTENSION IF NOT EXISTS h3_postgis CASCADE;
```

### 4.1 Tabla núcleo (flaca) — `hexagon`
```sql
CREATE TABLE hexagon (
  h3_index       h3index PRIMARY KEY,                 -- D1: hex/BIGINT 8 B
  score_general  real        NOT NULL DEFAULT 0,
  tipo_celda     text        NOT NULL DEFAULT 'disponible',
  emplazamiento  text        NOT NULL DEFAULT 'onshore',
  -- D3: padres H3 precomputados (STORED) para agregación/bbox en SQL
  h3_res6        h3index GENERATED ALWAYS AS (h3_cell_to_parent(h3_index, 6)) STORED,
  h3_res5        h3index GENERATED ALWAYS AS (h3_cell_to_parent(h3_index, 5)) STORED
);
CREATE INDEX ix_hexagon_res6 ON hexagon (h3_res6);
CREATE INDEX ix_hexagon_res5 ON hexagon (h3_res5);
-- lat/lng ya no hacen falta para el bbox (se derivan con h3_cell_to_lat_lng);
-- se pueden conservar si otros consumidores los usan.
```

### 4.2 Tabla de atributos (gorda, fuera del camino caliente) — `hexagon_variables`
```sql
CREATE TABLE hexagon_variables (
  h3_index  h3index PRIMARY KEY REFERENCES hexagon(h3_index) ON DELETE CASCADE,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb
);
-- la leen solo area/detail/informe (por PK → O(log n)); nunca el bbox.
```
> `hexagon_variables_pon` se mantiene igual (ya está aparte), migrando su PK a `h3index`.

### 4.3 `excluded` como tabla propia (D5)
```sql
CREATE TABLE hexagon_excluded (
  h3_index h3index PRIMARY KEY
);
-- se rellena en la ingesta:
INSERT INTO hexagon_excluded (h3_index)
SELECT h3_index FROM hexagon
WHERE tipo_celda = 'excluida' OR score_general < 0;
```
Endpoint `/tiles/excluded` → `SELECT h3_index FROM hexagon_excluded` (tabla pequeña, scan trivial o incluso cacheable).

### 4.4 Vista materializada de capas por resolución (D4)
```sql
-- valor normalizado promedio por (código, padre res6). Para variables-bulk/variable.
CREATE MATERIALIZED VIEW mv_variable_layer_res6 AS
SELECT
  v.key                           AS code,
  h.h3_res6                       AS parent,
  avg((v.value)::float8)          AS value
FROM hexagon h
JOIN hexagon_variables hv ON hv.h3_index = h.h3_index
CROSS JOIN LATERAL jsonb_each(hv.variables) AS v(key, value)
WHERE jsonb_typeof(v.value) = 'number'
GROUP BY v.key, h.h3_res6;
CREATE INDEX ix_mvlayer6_code_parent ON mv_variable_layer_res6 (code, parent);
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_variable_layer_res6;  (tras ingesta)
```
> Se puede replicar a `mv_variable_layer_res5` para zoom más lejano. Para res ≥ 7
> (zoom cercano, pocos hexágonos) se consulta la tabla directa.

### 4.5 Tabla/función de conteos para `warmup` (D6)
```sql
-- Opción simple: estimado instantáneo del planner.
-- SELECT reltuples::bigint FROM pg_class WHERE relname = 'hexagon';

-- Opción exacta cacheada (si se quiere el número real sin count(*)):
CREATE TABLE app_counts (
  key   text PRIMARY KEY,
  value bigint NOT NULL
);
-- actualizar en la ingesta: INSERT ... ON CONFLICT DO UPDATE con el count real.
```

## 5. Funciones (agregación H3 en SQL)

```sql
-- bbox (viewport) → celdas padre a resolución r (reemplaza el scan lat/lng)
CREATE OR REPLACE FUNCTION fn_bbox_parents(
  west float8, south float8, east float8, north float8, r int
) RETURNS SETOF h3index LANGUAGE sql IMMUTABLE AS $$
  SELECT h3_polygon_to_cells(
    ST_MakeEnvelope(west, south, east, north, 4326)::polygon, r)  -- con h3_postgis
$$;
-- (sin PostGIS: construir el anillo de 4 esquinas y usar h3_polygon_to_cells(jsonb))

-- variables-bulk servido desde la MV (miles de filas, no millones)
CREATE OR REPLACE FUNCTION fn_variables_bulk(
  codes text[], west float8, south float8, east float8, north float8
) RETURNS TABLE(code text, h3_index text, value float8)
LANGUAGE sql STABLE AS $$
  SELECT m.code, m.parent::text, m.value
  FROM mv_variable_layer_res6 m
  WHERE m.code = ANY(codes)
    AND m.parent = ANY(ARRAY(SELECT fn_bbox_parents(west, south, east, north, 6)));
$$;
```
> `parent::text` devuelve el **string hexadecimal** H3 → compatible con el front
> tal cual (sin tocar el contrato JSON).

## 6. Mapeo de endpoints al nuevo esquema

| Endpoint | Antes | Después |
|----------|-------|---------|
| `/tiles/variables-bulk` | scan bbox 5,8 s / 1,33 GB | MV + `h3_res6` → ms |
| `/tiles/excluded` | scan sin índice ~30 s | `SELECT` de `hexagon_excluded` |
| `/tiles/warmup` | `count(*)` 720 ms | `reltuples`/`app_counts` → µs |
| `/tiles/area`, `/detail` | Index Scan PK text | Index Scan PK `h3index` (más chico) |
| `/tiles/variables` | meta 0,12 ms | igual (ya barato) |

## 7. Compatibilidad con la aplicación

- **API sin cambios de contrato**: el H3 se serializa a/desde `text` (hex) en el
  borde SQL (`::h3index` al entrar, `::text` al salir).
- **Backend (SQLAlchemy)**: tipo custom o `CAST`; las queries por PK no cambian de
  forma, solo de tipo. El bbox pasa a llamar `fn_variables_bulk`/MV.
- **Front**: nada (sigue recibiendo strings H3).
- **Ingesta**: añade (a) backfill de `hexagon_variables`, (b) poblar
  `hexagon_excluded`, (c) `REFRESH MATERIALIZED VIEW`, (d) `app_counts`,
  (e) `VACUUM ANALYZE`.

## 8. Plan de migración segura (blue-green)

1. **Backup** completo previo.
2. Crear extensión + tablas nuevas **en paralelo** (sufijo `_new`), sin tocar las vivas.
3. **Backfill** desde las tablas actuales (streaming) → `hexagon_new`,
   `hexagon_variables_new`, `hexagon_excluded`, MVs, `app_counts`.
4. `VACUUM ANALYZE` + construir índices (`CONCURRENTLY` donde aplique).
5. **Swap atómico**: `BEGIN; ALTER TABLE hexagon RENAME TO hexagon_old; ALTER TABLE hexagon_new RENAME TO hexagon; … COMMIT;`
6. Humo: correr `tools/loadtest.py --db-url` y comparar EXPLAIN (objetivo: hit >99 %,
   `variables-bulk` < 100 ms, `excluded`/`warmup` < 10 ms).
7. Rollback = renombrar de vuelta (las `_old` siguen ahí hasta validar).

## 9. Plan por fases (sprint: hoy + mañana)

> El rediseño completo (PK `h3index` + split) es estructural y de mayor riesgo. Se
> parte en **Fase 1 (quick wins, cabe en el sprint)** y **Fase 2 (estructural,
> post-sprint)**, para recuperar capacidad YA sin arriesgar el cierre.

### Fase 1 — HOY (sin `h3-pg`, no rompe nada, recupera la mayor parte)
- [ ] **`hexagon_excluded`** (tabla + poblar en ingesta) + endpoint trivial. *(D5)*
- [ ] **`warmup`** → `reltuples` (o `app_counts`) + `VACUUM ANALYZE hexagon`. *(D6)*
- [ ] **`variables-bulk`**: índice compuesto `(lat,lng)` **y/o** MV res6 con
      `GROUP BY` en SQL; subir `work_mem` para evitar bitmap *lossy*. *(D4 parcial)*
- [ ] **Tuning Postgres**: `shared_buffers` (≈25 % RAM), `work_mem`. *(D7)*

### Fase 2 — MAÑANA / post-sprint (estructural, blue-green)
- [ ] `CREATE EXTENSION h3` + tablas `_new` con PK `h3index` y columnas padre. *(D1, D3)*
- [ ] Partir JSONB a `hexagon_variables`. *(D2)*
- [ ] MVs por resolución + funciones de agregación. *(D4, D5 funciones)*
- [ ] Backfill + swap atómico + humo con loadtest. *(§8)*

### Criterios de aceptación (medibles con el loadtest)
- `cache-hit` BD **> 99 %** bajo carga.
- `variables-bulk` **< 100 ms** p95 y techo **> 100 usuarios**.
- `excluded` y `warmup` **< 10 ms**.
- Sin cambios en el contrato de API (front intacto).

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| `h3-pg` no instalable en el hosting | Fase 1 no lo necesita; validar disponibilidad antes de Fase 2. |
| Migración de PK rompe FKs | Blue-green con `_new` + swap; `hexagon_variables_pon` migra a la vez. |
| MV desactualizada tras ingesta | `REFRESH … CONCURRENTLY` como paso final de la ingesta. |
| RAM del server (2 GB) sigue corta | PK 8 B + split bajan huella → más margen; si no, escalar RAM/workers. |
| Plazo de 2 días | Fase 1 recupera capacidad sin riesgo; Fase 2 documentada para continuar. |

## 11. Referencias
- Evidencia: `docs/testing/benchmark-carga-h3-2026-09-30.md`
- Repo queries: `infrastructure/db/hexagon_query_repository.py`, `application/services/tile_service.py`
- `h3-pg`: extensión PostgreSQL de H3 (tipo `h3index`, `h3_cell_to_parent`, `h3_polygon_to_cells`, integración PostGIS)
- ADRs relacionados: `ADR-002-resolucion-h3`, `ADR-006-storage-cache-datos-geoespaciales`, `ADR-008-arquitectura-tile-based`
