# Benchmark de carga — API de mapa Vento (2026-09-30)

> Evidencia completa de las pruebas de carga sobre los endpoints de `/tiles/*`,
> con diagnóstico de base de datos (EXPLAIN ANALYZE + salud de Postgres).
> Fuente de verdad para el rediseño de BD espacial con `h3-pg`
> (ver `_bmad-output/planning-artifacts/architecture-db-espacial-h3.md`).

- **Fecha:** 2026-09-30
- **Objetivo:** hallar el límite de cada endpoint del mapa, aislar si el cuello
  es la **consulta (BD)** o la **app (concurrencia)**, y explicar el techo de
  usuarios simultáneos.
- **Herramienta:** `backend/AppVento---Backend/tools/loadtest.py` (prueba
  UNITARIA por endpoint: cada endpoint con su propia rampa de hilos, en caliente,
  reutilizando UNA sesión real — sin usuarios fantasma).

---

## 1. Resumen ejecutivo

| # | Hallazgo | Evidencia |
|---|----------|-----------|
| 1 | **Techo real ≈ 25 usuarios simultáneos** explorando antes de degradar; a 50 colapsa. | Rampas §3 + análisis §6 |
| 2 | **Solo `variables-bulk` es cuello de BD puro**: 5,8 s **por consulta sola**, lee **~1,33 GB** de disco. | EXPLAIN §4 |
| 3 | **`warmup` (`count(*)`)**: 720 ms por los **432.171 heap-fetches** (visibility map viejo) + lee ~954 MB. | EXPLAIN §4 |
| 4 | **`detail`/`area`/`variables` NO son cuello de BD** (0,1–0,7 ms): rompen por **concurrencia (2 workers)**. | EXPLAIN §4 + §6 |
| 5 | **La BD está hambrienta de RAM**: `cache-hit` estable en **74,4 %** (sano = >99 %). Cada query toca disco. | Timeline §5 |
| 6 | **Tabla gorda**: `hexagon` ≈ **1,62 M filas × 746 B/fila** (JSONB `variables` inline). | EXPLAIN §4 |
| 7 | **PK = `text`** (string H3): engorda todos los índices. | EXPLAIN §4 (`(h3_index)::text`) |

**Conclusión de arquitectura:** el problema es de **layout de datos**, no de código
de aplicación. La migración de la PK a `h3index` (BIGINT de 8 B), partir la tabla
gorda y empujar la agregación H3 a SQL atacan la causa raíz (I/O y cache-hit).

---

## 2. Configuración de la prueba

```
# Prueba de carga UNITARIA por endpoint — https://www.proyectovento.com
# auth: cookie · codes=62 hexes-muestra=84
# rampa: [10, 25, 50, 100, 200, 400, 700, 1000] · 30s/etapa
# corte: err>25.0% o p95>8000ms
# diagnóstico BD: ON (EXPLAIN + salud BD)
```

- **Comportamiento simulado:** exploratorio (pan/zoom/click), no un flujo lineal.
- **Corte ("rompió"):** una etapa se marca ⚠ cuando `err% ≥ 25` **o** `p95 ≥ 8000 ms`.
- **Nota:** `RAMus/disp/swap/inflight` salieron `-` porque este run NO tenía
  `DEBUG_INFLIGHT=1` en el server (la RAM lado-app no se capturó). La salud de la
  **BD** sí se capturó vía `--db-url` (EXPLAIN + `pg_stat_*`).

---

## 3. Resultados por endpoint (rampa de usuarios)

### GET /tiles/warmup
```
 users     req   err%     p50     p95     rps
    10     130    0.0    2312    3239     4.3
    25     161    0.0    4778    5867     5.4
    50     210   31.4    7593    9656     7.0  ⚠
  → LÍMITE: ROMPIÓ en 50
```

### GET /tiles/variables
```
 users     req   err%     p50     p95     rps
    10    1691    0.0      44     123    56.4
    25    2053    0.3     103     348    68.4
    50    1581    7.1     258    2385    52.7
   100     642   46.7     172     629    21.4  ⚠
  → LÍMITE: ROMPIÓ en 100
```

### POST /tiles/variables-bulk
```
 users     req   err%     p50     p95     rps
    10      30  100.0       0       0     1.0  ⚠
  → LÍMITE: ROMPIÓ en 10
```

### POST /tiles/area
```
 users     req   err%     p50     p95     rps
    10     476    4.6      96     175    15.9
    25     553   13.6     109     211    18.4
    50     849   18.0     165     338    28.3
   100    1069   28.8     206     549    35.6  ⚠
  → LÍMITE: ROMPIÓ en 100
```

### GET /tiles/detail
```
 users     req   err%     p50     p95     rps
    10    1125    0.5      29     108    37.5
    25    2177    0.1      30    2201    72.6
    50    1819    6.3     116    3707    60.6
   100    1035   30.0      37     250    34.5  ⚠
  → LÍMITE: ROMPIÓ en 100
```

### Resumen de límites
```
  GET /tiles/warmup            → ROMPIÓ en 50
  GET /tiles/variables         → ROMPIÓ en 100
  POST /tiles/variables-bulk   → ROMPIÓ en 10
  POST /tiles/area             → ROMPIÓ en 100
  GET /tiles/detail            → ROMPIÓ en 100
```

---

## 4. Diagnóstico BD — ¿rompió la QUERY o la APP?

`EXPLAIN (ANALYZE, BUFFERS)` de la consulta real de cada endpoint, **sin carga**
(coste puro de la BD).

```
  GET /tiles/warmup            → query sola 720.592ms · SeqScan=False · disco=0bloq   → CUELLO = APP*  (ver nota)
  GET /tiles/variables         → query sola   0.122ms · SeqScan=True  · disco=0bloq   → FALSO POSITIVO (ver nota)
  POST /tiles/variables-bulk   → query sola 5823.105ms · SeqScan=False · disco=21758bloq → CUELLO = BD
  POST /tiles/area             → query sola   0.681ms · SeqScan=False · disco=0bloq   → CUELLO = APP/concurrencia
  GET /tiles/detail            → query sola   0.104ms · SeqScan=False · disco=0bloq   → CUELLO = APP/concurrencia
```

> **Correcciones al veredicto automático del script:**
> - `variables` marcó `CUELLO = BD` por la heurística "hay Seq Scan", pero es un
>   **Seq Scan sobre `hexagon_meta` de 62 filas → 0,12 ms**. Es correcto y barato:
>   **el cuello real es APP/concurrencia**.
> - `warmup` reporta 720 ms (<1000 → el script lo clasifica "APP"), pero el plan
>   revela **432.171 heap-fetches y ~954 MB leídos**: es coste de BD evitable
>   (estimado `reltuples` + `VACUUM`). Lo tratamos como **mixto (BD)**.

### Planes EXPLAIN completos

#### GET /tiles/warmup — `SELECT count(*) FROM hexagon`
```
Finalize Aggregate  (cost=159545.99..159546.00 rows=1 width=8) (actual time=711.987..720.330 rows=1.00 loops=1)
  Buffers: shared hit=116 read=122139
  ->  Gather  (cost=159545.77..159545.98 rows=2 width=8) (actual time=710.083..720.322 rows=3.00 loops=1)
        Workers Planned: 2
        Workers Launched: 2
        Buffers: shared hit=116 read=122139
        ->  Partial Aggregate  (cost=158545.77..158545.78 rows=1 width=8) (actual time=698.038..698.039 rows=1.00 loops=3)
              Buffers: shared hit=116 read=122139
              ->  Parallel Index Only Scan using hexagon_new_emplazamiento_idx2 on hexagon  (cost=0.43..156841.76 rows=681606 width=0) (actual time=0.077..637.905 rows=540976.33 loops=3)
                    Heap Fetches: 432171
                    Index Searches: 1
                    Buffers: shared hit=116 read=122139
Planning:
  Buffers: shared hit=88 read=26
Planning Time: 0.997 ms
Execution Time: 720.592 ms
```
→ **~1.622.929 filas** (540976,33 × 3 loops). 122.139 bloques leídos ≈ **954 MB**.
432.171 heap-fetches = el *visibility map* está desactualizado (falta `VACUUM`).

#### GET /tiles/variables — `SELECT variable, vmin, vmax FROM hexagon_meta`
```
Seq Scan on hexagon_meta  (cost=0.00..1.56 rows=56 width=24) (actual time=0.033..0.042 rows=62.00 loops=1)
  Buffers: shared hit=1
Planning:
  Buffers: shared hit=57
Planning Time: 0.497 ms
Execution Time: 0.122 ms
```
→ Tabla diminuta (62 filas). Seq Scan **correcto**, 0,12 ms. No es cuello de BD.

#### POST /tiles/variables-bulk — scan por bbox
`SELECT h3_index, score_general, tipo_celda, lat, lng, variables FROM hexagon WHERE lat BETWEEN … AND lng BETWEEN …`
```
Bitmap Heap Scan on hexagon  (cost=59423.09..705168.34 rows=307195 width=746) (actual time=862.111..5807.529 rows=221722.00 loops=1)
  Recheck Cond: ((lat >= '1.9212467113327794') AND (lat <= '5.663481478399621') AND (lng >= '-75.88250885460502') AND (lng <= '-72.14027408753817'))
  Rows Removed by Index Recheck: 264035
  Heap Blocks: exact=23701 lossy=136432
  Buffers: shared hit=708 read=170304
  ->  BitmapAnd  (cost=59423.09..59423.09 rows=307195 width=0) (actual time=853.623..853.624 rows=0.00 loops=1)
        Buffers: shared read=10879
        ->  Bitmap Index Scan on hexagon_new_lat_idx2  (cost=0.00..27221.24 rows=658481 width=0) (actual time=301.753..301.753 rows=745221.00 loops=1)
              Index Cond: ((lat >= '1.9212467113327794') AND (lat <= '5.663481478399621'))
              Buffers: shared read=4978
        ->  Bitmap Index Scan on hexagon_new_lng_idx2  (cost=0.00..32048.01 rows=763158 width=0) (actual time=533.260..533.260 rows=757398.00 loops=1)
              Index Cond: ((lng >= '-75.88250885460502') AND (lng <= '-72.14027408753817'))
              Buffers: shared read=5901
Planning Time: 0.511 ms
Execution Time: 5823.105 ms
```
→ **5,82 s** por consulta. 170.304 bloques leídos ≈ **1,33 GB**. 221.722 filas
de `width=746`. El bitmap se vuelve **lossy** (136.432 bloques) → `work_mem`
insuficiente. Dos btrees `lat`/`lng` combinados con `BitmapAnd` (no hay índice
espacial ni H3). **Este es el cuello de BD #1.**

#### POST /tiles/area — IN sobre PK
`… WHERE h3_index = ANY(ARRAY[... 84 hexes ...])`
```
Index Scan using hexagon_new_pkey2 on hexagon  (cost=0.43..709.17 rows=84 width=746) (actual time=0.295..0.609 rows=84.00 loops=1)
  Index Cond: ((h3_index)::text = ANY ('{88665d2dddfffff, ... 84 hexes ...}'::text[]))
  Index Searches: 5
  Buffers: shared hit=84
Planning Time: 1.219 ms
Execution Time: 0.681 ms
```
→ **0,68 ms**. Index Scan por PK, perfecto. Nota: `(h3_index)::text` → **PK de tipo `text`**.

#### GET /tiles/detail — lookup por PK
`… WHERE h3_index = '88665d2dddfffff'`
```
Index Scan using hexagon_new_pkey2 on hexagon  (cost=0.43..8.45 rows=1 width=746) (actual time=0.045..0.046 rows=1.00 loops=1)
  Index Cond: ((h3_index)::text = '88665d2dddfffff'::text)
  Index Searches: 1
  Buffers: shared hit=4
Planning Time: 0.821 ms
Execution Time: 0.104 ms
```
→ **0,10 ms**. Perfecto.

---

## 5. Salud de la BD durante la carga (timeline)

Columnas BD del timeline (muestra representativa; `-` = sin `DEBUG_INFLIGHT`):

```
  t(s) activos   p95ms  BDact BDwait BDconn  hit% tempMB
   2.5      10    1719     18     13     26  74.4 39749.9
  33.1      25    3239     33     13     41  74.4 39749.9
  47.3      25    8764     23     17     41  74.5 39749.9   ← p95 ya cruza el corte a 25
  67.6      50    2570     27     24     36  74.5 39749.9
  79.8      50    9656     29     25     39  74.5 39749.9   ← 50 users: p95 ~10s
  88.0      50    9981     34     28     45  74.6 39749.9   ← BDconn 45, BDwait 28
 104.2       0    9400      4      2     22  74.6 39749.9
```

**Lecturas clave:**
- **`hit%` clavado en ~74,4–74,6 %** todo el run → la BD lee de disco
  constantemente. Un Postgres sano para este working set debería estar **>99 %**.
  `shared_buffers` no cubre la tabla (~1,2 GB) + índices.
- **`tempMB` ≈ 39.750 MB** (acumulado histórico de `temp_bytes`) → spill a disco
  recurrente (ordenaciones/bitmaps sin `work_mem`).
- **`BDconn`** sube a **41–50** bajo carga → cerca del tope de conexiones
  (2 workers × 20 = 40, ver §6).
- **`BDwait`** (queries activas esperando) **10–28** → contención real de I/O/lock.

---

## 6. Por qué el techo es ≈ 25 usuarios simultáneos

### Configuración real del server (verificada en código)
| Parámetro | Valor | Fuente |
|-----------|-------|--------|
| Workers Gunicorn/Uvicorn | **2** | `Dockerfile` (`-w 2`), `--timeout 120` |
| Threadpool anyio por worker | **18** | `main.py` (`APP_THREAD_LIMIT=18`) |
| Pool BD por worker | **5 + 15 overflow = 20** | `infrastructure/db/session.py` |
| Conexiones BD máx (2 workers) | **40** | 2 × 20 |
| Timeout del cliente (prueba) | 10 s | `--req-timeout` |

### El cálculo
Cada petición a un endpoint de datos ejecuta una consulta **síncrona** de
SQLAlchemy dentro del **threadpool de anyio** (porque FastAPI corre las deps
`Depends(get_db)` bloqueantes en ese pool). Mientras la query corre, **retiene un
token** del pool.

- **Techo duro de operaciones BD concurrentes = workers × threadpool = 2 × 18 = 36.**
- Más allá de 36 consultas en vuelo, las peticiones **encolan**.

**Por qué 25 y no 36:**
1. Un usuario "explorando" **mezcla endpoints lentos**: `warmup` al cargar
   (720 ms) y `variables-bulk` al hacer pan/zoom (**5,8 s** leyendo 1,33 GB).
   Cada token lento se queda **cientos de ms a segundos** ocupado.
2. Con `variables-bulk` en la mezcla, **1 sola petición** monopoliza un worker
   varios segundos → los 36 slots se llenan con **un puñado de usuarios**.
3. La **BD hambrienta de RAM (hit 74 %)** hace que incluso las queries "rápidas"
   toquen disco a veces → tokens retenidos más tiempo → el techo efectivo baja.
4. Las **conexiones BD llegan a ~40** (tope del pool) → nuevas peticiones esperan
   en `pool_timeout` (30 s) → acaban en timeout del cliente (10 s).

**Resultado observado:** hasta **~25 usuarios** todo se mantiene en verde; a partir
de ahí, los endpoints lentos acaparan los 36 slots de threadpool y las 40
conexiones, el p95 cruza el timeout y aparecen los errores. Con endpoints
**rápidos aislados** (detail/area/variables) el techo sube a ~**100** — prueba de
que el muro NO es la query de esos, sino **la concurrencia de 2 workers** +
amplificado por el I/O de la BD.

### Dos frentes, dos soluciones
- **Frente BD (código/esquema):** `variables-bulk` (bbox), `warmup` (`count`),
  `excluded` (scan sin índice) → **rediseño h3-pg** (ver doc de arquitectura).
- **Frente APP (infra):** el muro de ~36 ops concurrentes = **2 workers**. Subir
  workers requiere RAM; al aligerar filas (PK BIGINT + partir JSONB) sube el
  cache-hit y se libera RAM para más workers.

---

## 7. SQL real por endpoint (espejo del repositorio)

De `infrastructure/db/hexagon_query_repository.py` + `application/services/tile_service.py`:

| Endpoint | Consulta(s) | Índice usado | Coste |
|----------|-------------|--------------|-------|
| GET /warmup | `variable_names` + `variable_ranges` (meta) + **`SELECT count(*) FROM hexagon`** | meta ok · count → index-only + heap-fetches | 720 ms |
| GET /variables | `SELECT h3_index FROM hexagon LIMIT 1` + catálogo + `hexagon_meta` | PK + meta | <1 ms |
| GET /detail/{h3} | `SELECT … FROM hexagon WHERE h3_index = :h` | **PK** | 0,1 ms |
| POST /area | `SELECT … FROM hexagon WHERE h3_index IN (:cells)` + `hexagon_variables_pon WHERE h3_index IN (:cells)` | **PK / IN** | 0,7 ms |
| POST /variables-bulk | `SELECT … FROM hexagon WHERE lat BETWEEN … AND lng BETWEEN …` + resuelve N códigos en Python/fila | **2 btrees lat/lng** (BitmapAnd) | **5,8 s** |
| GET /excluded | `SELECT h3_index FROM hexagon WHERE tipo_celda='excluida' OR score_general<0` | **SIN índice** (scan completo) | ~30 s* |

\* `excluded` se **saltó** en este run (`--skip excluded` por defecto, es lento a
propósito). Coste histórico medido en runs previos: ~30 s (scan completo).

### Índices existentes hoy en `hexagon`
- PK `hexagon_new_pkey2` sobre `h3_index` (**tipo `text`**)
- btree `hexagon_new_lat_idx2` (`lat`)
- btree `hexagon_new_lng_idx2` (`lng`)
- btree `hexagon_new_emplazamiento_idx2` (`emplazamiento`)
- **NO hay:** índice en `tipo_celda`/`score_general`, ni compuesto `(lat,lng)`,
  ni espacial (GiST/PostGIS), ni GIN sobre `variables` (JSONB).

---

## 8. Run previo (flujo mixto) — contexto

Antes del run unitario se corrió una versión de **flujo mixto** (todos los
endpoints compartiendo carga). Resultado resumido (con swap + earlyoom activos,
la API **no se cayó** pero degradó):

```
  POST /tiles/variables-bulk → ROMPIÓ en 10   (40% err, p95 8852ms)
  GET  /tiles/warmup         → ROMPIÓ en 25   (count(*) p50 6322ms)
  GET  /tiles/detail         → ROMPIÓ en 50
  GET  /tiles/variables      → ROMPIÓ en 50
  POST /tiles/area           → ROMPIÓ en 50
  Pico 50 usuarios · 344 req · 73 errores (72 ReadTimeout, 1×502)
```

El run unitario (§3) **confirma y afina**: aislados, detail/variables/area
aguantan hasta 100 (el "50" del mixto era contaminación entre endpoints).

---

## 9. Artefactos

- Reporte TXT: `benchmarks/loadtest.txt`
- CSV por petición: `benchmarks/loadtest-request.csv`
- Herramienta: `backend/AppVento---Backend/tools/loadtest.py`
  (`--db-url` para EXPLAIN + salud BD; `DEBUG_INFLIGHT=1` en el server para RAM lado-app)

### Cómo reproducir
```bash
python tools/loadtest.py \
  --base "https://TU_DOMINIO" \
  --cookie "__Secure-authjs.session-token=VALOR_DE_TU_SESION" \
  --db-url "postgresql://USUARIO:CLAVE@HOST_BD:5432/NOMBRE_BD" \
  --stage-secs 30
```
> El `--db-url` necesita alcanzar el 5432 (correr desde el server o túnel SSH).
> Para RAM lado-app: exportar `DEBUG_INFLIGHT=1` antes de arrancar gunicorn.
