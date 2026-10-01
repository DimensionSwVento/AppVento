# Manual Técnico — Vento (Plataforma de idoneidad eólica)

> Arquitectura, stack, nube, configuración y operación. Audiencia: equipo de
> desarrollo / on-call. No es el manual de usuario.
> Fecha: 2026-10-01 · Autor: Mavalan Software

---

## 1. Qué es Vento

Plataforma SIG/MCDM que evalúa la **idoneidad de zonas para proyectos eólicos** en
Colombia sobre una malla de hexágonos **H3 (resolución 8)**. El usuario selecciona
un área, el sistema calcula un **índice de idoneidad (0–100)** por dimensión y
general, y genera un **informe PDF** configurable. Admin gestiona variables,
datasets, normas, escenarios económicos y usuarios.

- **Modelo:** multicriterio (WLC/AHP) en escala 1–5 (−1 = excluida), normalizado a
  0–1 con `(raw−1)/4`. El `global` y los scores por dimensión vienen
  **precalculados** en la máster; la app NO recalcula el modelo (solo agrega/formatea).
- **Dimensiones:** Técnica, Ambiental, Social (puntuables) + Económica y Regulatoria
  (**informativas**, no puntúan).

## 2. Arquitectura (alto nivel)

```
Navegador ──HTTPS──> Front Next.js (AccuWeb)
                         │  /api/* (BFF: Next route handlers)
                         │   - añade el JWT de Keycloak (Bearer) al llamar al backend
                         ▼
                     Backend FastAPI (Docker)  ──SQLAlchemy──> PostgreSQL
                         │                                        (tabla hexagon 1.6M filas,
                         │                                         hexagon_meta, catalog_*,
                         └── Keycloak (OIDC/JWT)                   app_config, informe, ...)
```

- **Front (BFF):** Next.js App Router. Las rutas `/api/*` son *route handlers* que
  **proxyean** al backend añadiendo el `Authorization: Bearer <JWT>` (Keycloak). El
  front nunca habla directo con Postgres.
- **Backend:** FastAPI **stateless** — nada se carga a RAM al arrancar; cada request
  consulta Postgres (streaming anti-OOM). Clean architecture (api/application/
  domain/infrastructure).
- **Auth:** Auth.js (NextAuth v5) en el front (cookies `__Secure-authjs.session-token`);
  Keycloak como IdP (OIDC). El backend valida el **JWT de Keycloak** (`require_user`/
  `require_admin`).
- **Datos geoespaciales:** H3 res 8. `lat/lng` persistidos por hex para consultas por
  bbox (tiles). Variables del modelo en JSONB (`hexagon.variables`).

## 3. Stack / lenguajes

| Capa | Tecnologías |
|------|-------------|
| **Front** | TypeScript · **Next.js 16** (App Router) · React · **deck.gl 9.2** + MapLibre (mapa) · **h3-js 4** · Tailwind CSS v4 · Auth.js (NextAuth v5) · jsPDF + svg2pdf + html2canvas-pro (export PDF) |
| **Backend** | **Python 3.12** · **FastAPI** · Uvicorn + **Gunicorn** (prod) · **SQLAlchemy 2** · **Alembic** (migraciones) · **psycopg 3** · pandas + pyarrow (ingesta parquet) · **h3** · anyio (threadpool) |
| **BD** | **PostgreSQL** (tabla `hexagon` ~1.6 M filas × ~746 B) |
| **Identidad** | **Keycloak** (OIDC/JWT; roles `admin`/`analista`) |
| **Infra** | Front en **AccuWeb** (Node runtime) · Backend en **Docker** (`python:3.12-slim`, gunicorn `-w 2`) |

## 4. Backend — comportamiento y endpoints

Router `/api/tiles/*` (datos del mapa) + `/api/admin/*` (gestión) + `/api/historico`.

| Endpoint | Qué hace | Coste |
|----------|----------|-------|
| `GET /tiles/warmup` | bundle de metadatos (conteo **estimado** `reltuples` + `hexagon_meta`) | µs |
| `GET /tiles/variables` | catálogo de variables (meta + `catalog_variable`) | <1 ms |
| `GET /tiles/{z}/{x}/{y}` | tile del grid (bbox → agregación por zoom, streaming) | ms |
| `GET /tiles/detail/{h3}` | detalle de un hex (PK) | 0,1 ms |
| `POST /tiles/area` | informe: hexes del área con score/dimensiones/variables | ms |
| `POST /tiles/variable(s-bulk)` | capa(s) de variable por bbox (bulk: N códigos en 1 scan) | el más pesado |
| `GET /tiles/excluded` | capa completa de excluidos (índice parcial + caché) | ms |
| `GET /api/admin/db/overview` | **verificación de ingesta**: columnas por tabla + tríada h3/catálogo/master | (admin) |
| `GET /api/_debug/stats` · `/_debug/inflight` | RAM/swap/in-flight (gate `DEBUG_INFLIGHT=1`) | diagnóstico |

**Anti-OOM / concurrencia:**
- Consultas en **streaming** (`stream_results`, `yield_per`) — la RAM no escala con el dataset.
- **Pool explícito** (`DB_POOL_SIZE=5` + `DB_MAX_OVERFLOW=15` = 20/worker) + cap del
  **threadpool anyio** (`APP_THREAD_LIMIT=18`).
- Gunicorn **2 workers**, `--timeout 120`.

## 5. Capacidad (medida con `tools/loadtest.py`)

Server 2 workers / ~2 GB. Techo útil ≈ **25 usuarios concurrentes** explorando.
Ver evidencia en `docs/testing/benchmark-carga-h3-2026-09-30.md`.

| Endpoint | Techo (2 GB) | ≈ por GB RAM | Cuello | Datos movidos |
|----------|-------------|--------------|--------|---------------|
| `detail` | ~100 | ~50 | app (2 workers) | 1 hex (~0,7 KB) |
| `area` | ~100 | ~50 | app | 20–300 hexes (~0,06–0,22 MB) |
| `variables` | ~100 | ~50 | app | 62 filas meta |
| `warmup` | >100 (tras fix) | >50 | — | estimado `reltuples` |
| `variables-bulk` | ~10 | ~5 | **BD** (scan bbox) | hasta ~165 MB leídos |

**Regla:** ~1 worker ≈ 18 operaciones BD concurrentes por cada ~1 GB de RAM.
`variables-bulk` es el más caro → el front acota **bbox + resolución** y **cachea**.

## 6. Base de datos

- **`hexagon`** (PK `h3_index` texto; `score_general`, `tipo_celda`, `emplazamiento`,
  `lat`, `lng`, `variables` JSONB) ~1,6 M filas.
- **`hexagon_meta`** (rango min–max por variable), **`hexagon_variables_pon`** (ponderadas).
- **`catalog_variable` / `catalog_norma` / `catalog_escenario` / `catalog_turbine`**,
  **`parquet_column`** (registro de columnas de la máster), **`app_config`** (clave→JSON,
  p.ej. `support_email`, `report_calc_text`), **`informe`** (histórico), **`app_user`**.
- **Migraciones:** Alembic (`migrations/versions/`). En dev `init_db` crea tablas; en
  prod se usa Alembic (`alembic upgrade head`). Última: `0015_hexagon_excluded_index`
  (índice parcial para `/tiles/excluded`).
- **Fase 2 (propuesta, `_bmad-output/planning-artifacts/architecture-db-espacial-h3.md`):**
  extensión **`h3-pg`** (PK `h3index` BIGINT), partir el JSONB, columnas padre H3 y
  vistas materializadas para `variables-bulk`.

## 7. Seguridad

- **OIDC/Keycloak**: login en el front (Auth.js); el backend valida el JWT. Roles
  `admin` (gestión) / `analista` (flujo de análisis).
- Cookies `__Secure-/__Host-` (HTTPS). El BFF añade el Bearer y `X-User-Roles` al backend.
- Endpoints de datos exigen usuario autenticado; `/admin/*` exige rol `admin`.
- Datos: el backend **nunca inventa valores** (real o vacío); el modo *template* del
  front usa placeholders solo con `USE_BACKEND=false`.

## 8. Observabilidad / operación

- **`tools/loadtest.py`** (prueba de carga por endpoint + `EXPLAIN`/salud BD con `--db-url`).
- **`/api/_debug/stats`** y **`/_debug/inflight`** (`DEBUG_INFLIGHT=1`): RAM, swap, in-flight.
- Red de seguridad de memoria: **swap + earlyoom** (ver Manual de Instalación §7).
- Runbook de producción (front AccuWeb): `docs/ops/accuweb-runbook.md`.

## 9. Referencias
- Arquitectura DB espacial: `_bmad-output/planning-artifacts/architecture-db-espacial-h3.md`
- Benchmark de carga: `docs/testing/benchmark-carga-h3-2026-09-30.md`
- Documento técnico de comportamiento: `docs/ops/documento-tecnico-comportamiento-herramientas-config.md`
- ADRs: `docs/adr/` · Runbook: `docs/ops/accuweb-runbook.md`
