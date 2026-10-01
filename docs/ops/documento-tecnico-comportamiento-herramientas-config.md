# Documento técnico — Comportamiento, herramientas y configuración (Vento)

> Operación y rendimiento del backend/API de mapa. Complementa la evidencia de
> `docs/testing/benchmark-carga-h3-2026-09-30.md` y el diseño
> `_bmad-output/planning-artifacts/architecture-db-espacial-h3.md`.
>
> Fecha: 2026-10-01

---

## 1. Comportamiento del sistema bajo carga

- **Capacidad útil ≈ 25 usuarios concurrentes** explorando (pan/zoom/click) en el
  server actual (2 vCPU / ~2 GB / 2 workers). A **50** concurrentes degrada
  fuertemente (20–80% de timeouts).
- El techo lo marca el **threadpool**: `workers × APP_THREAD_LIMIT = 2 × 18 = 36`
  operaciones de BD simultáneas. Los endpoints lentos (warmup, variables-bulk)
  retienen esos slots y bajan el techo efectivo a ~25.
- La **BD está limitada por RAM** (cache-hit 74%, debería ser >99%): cada consulta
  toca disco, lo que amplifica la latencia de todo.

### Límite de usuarios simultáneos por endpoint y por GB de RAM

Medido con `tools/loadtest.py` (rampa por endpoint, corte err>25% o p95>8s) en el
server de 2 workers / ~2 GB. La columna "por GB" es la extrapolación conservadora
(≈ 1 worker ≈ 18 hilos por cada ~1 GB de RAM; escala casi lineal con workers).

| Endpoint | Techo medido (2 workers/2 GB) | ≈ por GB de RAM | Cuello | Hexágonos / datos movidos por request |
|---|---|---|---|---|
| `GET /tiles/detail` | ~100 users | ~50 | APP (2 workers) | 1 hex · 1 fila (~0,7 KB) · lookup por PK |
| `POST /tiles/area` | ~100 users | ~50 | APP (2 workers) | N hexes selección (20–300, exp. a res8) · ~0,7 KB/fila → ~0,06–0,22 MB · PK/IN |
| `GET /tiles/variables` | ~100 users | ~50 | APP (2 workers) | 62 filas `hexagon_meta` (~KB) |
| `GET /tiles/warmup` | ~50 users (→ **>100** tras fix) | ~25 → >50 | BD (`count(*)`) | Antes: leía ~1,6 M filas (~954 MB). Ahora: estimado `reltuples` (0 filas movidas) |
| `GET /tiles/excluded` | (no se mide; ~30 s) | — | BD (scan sin índice) | Todas las excluidas (solo `h3_index`). Con índice parcial + caché → ms |
| `POST /tiles/variables-bulk` | ~10 users | ~5 | **BD** (scan bbox) | Escanea bbox: hasta ~221 K filas × ~0,7 KB ≈ **165 MB leídos** / request. Respuesta agregada pequeña |

> **Regla rápida de capacidad:** en este server, por cada **GB de RAM** añadido se
> puede sostener **~1 worker más ≈ 18 operaciones de BD concurrentes ≈ ~12–25
> usuarios explorando** (según el peso de los endpoints en la mezcla). El endpoint
> `variables-bulk` es el que más baja ese número hasta no migrar a agregación en
> SQL (Fase 2 h3-pg).

### Mitigaciones aplicadas (Fase 1, code-only)
- **warmup**: `count(*)` exacto → estimado `pg_class.reltuples` + `is_ready()` O(1).
- **excluded**: caché en proceso con TTL + **índice parcial** `ix_hexagon_excluded`
  (migración `0015`).
- Pendiente (Fase 2, estructural): PK `h3index`, partir JSONB, columnas padre H3 y
  vistas materializadas por resolución para `variables-bulk` (ver arquitectura).

---

## 2. Herramientas

### `tools/loadtest.py` — prueba de carga + diagnóstico BD
- Rampa **unitaria por endpoint** (aísla el techo de cada uno), en caliente,
  reutilizando UNA sesión real (sin usuarios fantasma).
- `--db-url` → `EXPLAIN (ANALYZE, BUFFERS)` de la consulta real de cada endpoint
  (aísla cuello **BD** vs **app**) + timeline con salud de Postgres (conexiones
  activas/en espera, cache-hit%, temp spill).
- Salidas: `loadtest.txt` (rampas + límites + planes + timeline) y
  `loadtest-requests.csv`.
```bash
python tools/loadtest.py \
  --base "https://TU_DOMINIO" \
  --cookie "__Secure-authjs.session-token=VALOR_DE_TU_SESION" \
  --db-url "postgresql://USUARIO:CLAVE@HOST_BD:5432/NOMBRE_BD" \
  --stage-secs 30
```
> El `--db-url` necesita alcanzar el 5432 (correr desde el server o túnel SSH).

### Endpoints de diagnóstico (gate `DEBUG_INFLIGHT=1`)
- `GET /api/_debug/inflight` — peticiones en vuelo con su antigüedad.
- `GET /api/_debug/stats` — RAM del host (`/proc/meminfo`), VmRSS por worker, swap,
  in-flight. (El loadtest lo consume para el timeline de RAM.)

### py-spy (perfil de hilos colgados)
```bash
pgrep -af gunicorn                       # PIDs
sudo <VENV>/bin/py-spy dump --pid <PID>  # stacks de los hilos
```

### Memoria del host (swap + earlyoom) — red de seguridad
**Swap 4 GB (persistente):**
```bash
sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl -w vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
swapon --show && free -h
```
**earlyoom:**
```bash
sudo apt-get update && sudo apt-get install -y earlyoom
sudo systemctl enable --now earlyoom
systemctl status earlyoom --no-pager
```
> Son mitigaciones, no la solución: evitan el OOM-kill del kernel pero a costa de
> latencia (swap). El fix real es el rediseño de datos (Fase 2) + más RAM/workers.

---

## 3. Configuración (variables de entorno)

| Variable | Def. | Qué hace |
|---|---|---|
| Workers Gunicorn | 2 | `-w` en el Dockerfile (uvicorn worker). Escala con RAM. |
| `APP_THREAD_LIMIT` | 18 | Tokens del threadpool anyio por worker (consultas BD síncronas concurrentes). |
| `DB_POOL_SIZE` | 5 | Conexiones persistentes por worker. |
| `DB_MAX_OVERFLOW` | 15 | Conexiones extra en ráfaga (→ 20 máx/worker; ≤ `max_connections`). |
| `DB_POOL_TIMEOUT` | 30 | Segundos esperando una conexión del pool. |
| `DB_POOL_RECYCLE` | 1800 | Recicla conexiones viejas (s). |
| `EXCLUDED_CACHE_TTL` | 300 | TTL (s) de la caché en proceso de `/tiles/excluded`. |
| `DEBUG_INFLIGHT` | (off) | `=1` activa `/api/_debug/inflight` y `/api/_debug/stats`. |
| `USE_BACKEND` (front) | false | `NEXT_PUBLIC_USE_BACKEND=true` → API real (sin fallback template). |
| `HEXAGON_INGEST` | copy | Método de ingesta (`copy` Postgres rápido / `orm` portable). |

> **Regla de conexiones:** `(DB_POOL_SIZE + DB_MAX_OVERFLOW) × workers ≤ max_connections`
> de Postgres. Con 2 workers = 40; vigilar `max_connections` del servidor BD.

### Tuning Postgres recomendado (server chico)
- `shared_buffers` ≈ 25% de la RAM; `work_mem` suficiente para que el bitmap del
  bbox no sea *lossy* (el EXPLAIN mostró `Heap Blocks: lossy`).
- `VACUUM ANALYZE hexagon` tras cada ingesta (arregla los heap-fetches del conteo
  y mantiene `reltuples` al día para el warmup estimado).

---

## 4. Referencias
- Evidencia de carga: `docs/testing/benchmark-carga-h3-2026-09-30.md`
- Arquitectura de datos (Fase 2): `_bmad-output/planning-artifacts/architecture-db-espacial-h3.md`
- Código: `application/services/tile_service.py`, `infrastructure/db/hexagon_query_repository.py`, `tools/loadtest.py`
