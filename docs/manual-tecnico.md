# Manual Técnico — Vento (Plataforma de idoneidad eólica)

> Arquitectura, stack, comportamiento, configuración y operación.
> Audiencia: equipo de desarrollo / on-call. No es el manual de usuario.
> Fecha: 2026-10-01 · Autor: Mavalan Software

---

## 1. Qué es Vento

Plataforma SIG/MCDM que evalúa la **idoneidad de zonas para proyectos eólicos** en
Colombia sobre una malla de hexágonos **H3 (resolución 8)**. El usuario selecciona un
área, el sistema agrega un **índice de idoneidad (0–100)** por dimensión y general, y
genera un **informe PDF** configurable. El admin gestiona variables, datasets, normas,
escenarios económicos y usuarios.

- **Modelo:** multicriterio (WLC/AHP) en escala 1–5 (−1 = excluida), normalizado a 0–1
  con `(raw−1)/4`. El `global` y los scores por dimensión vienen **precalculados** en la
  máster (parquet); la app **no recalcula** el modelo: solo agrega y formatea.
- **Dimensiones:** Técnica, Ambiental, Social (puntuables) + Económica y Regulatoria
  (**informativas**, no puntúan).

---

## 2. Arquitectura

```
Navegador ──HTTPS──▶ Front Next.js (BFF)
                       │  rutas /api/*  (Next route handlers)
                       │    · validan la sesión de Keycloak (Auth.js)
                       │    · reenvían al backend con INTERNAL_API_SECRET + identidad
                       ▼
                   Backend FastAPI (Docker)  ──SQLAlchemy──▶ PostgreSQL
                       │                                        hexagon (1.6M filas), hexagon_meta,
                       │                                        hexagon_variables_pon, catalog_*,
                       └── Keycloak (OIDC/JWT)                   parquet_column, app_config, informe
```

- **BFF (Backend-for-Frontend):** el navegador **no** habla con el backend directo.
  Las rutas `/api/*` del front son *route handlers* que: (1) exigen sesión válida de
  Keycloak, (2) reenvían al backend privado (`BACKEND_URL`) con un **secreto compartido**
  (`INTERNAL_API_SECRET`) y la identidad del usuario (`sub` + roles). Así el backend puede
  ser privado en la red.
- **Backend stateless:** nada se carga a RAM al arrancar; cada request consulta Postgres
  en **streaming** (anti-OOM). Clean architecture: `api/` (routers) · `application/`
  (servicios) · `domain/` (modelo/consulta) · `infrastructure/` (BD, auth, datos).
- **Auth:** Auth.js (NextAuth v5) en el front (cookies `__Secure-authjs.session-token`);
  Keycloak como IdP (OIDC). El backend **verifica** el JWT (JWKS de Keycloak) — no emite
  tokens. Roles `admin` / `analista`.

---

## 3. Stack / lenguajes

| Capa | Tecnologías |
|------|-------------|
| **Front** | TypeScript · **Next.js 16** (App Router) · React · **deck.gl 9.2** + MapLibre · **h3-js 4** · Tailwind CSS v4 · Auth.js (NextAuth v5) · jsPDF + svg2pdf + html2canvas-pro (PDF) · SendGrid (correo) |
| **Backend** | **Python 3.12** · **FastAPI** · Uvicorn + **Gunicorn** (prod, `-w 2`) · **SQLAlchemy 2** · **Alembic** · **psycopg 3** · pandas + pyarrow (parquet) · **h3** · anyio (threadpool) · python-dotenv (dev) |
| **BD** | **PostgreSQL** (`hexagon` ~1.6 M filas × ~746 B) |
| **Identidad** | **Keycloak** (OIDC/JWT; roles `admin`/`analista`) |
| **Infra** | Front en AccuWeb (runtime Node) · Backend en **Docker** (`python:3.12-slim`) |

---

## 4. Modo TEMPLATE vs BACKEND (clave)

El front opera en **uno de dos modos**, según `NEXT_PUBLIC_USE_BACKEND`. Al arrancar se
loguea `[VENTO] MODO: BACKEND (API real...)` o `TEMPLATE (demo, sin backend)`.

| | `NEXT_PUBLIC_USE_BACKEND=false` → **TEMPLATE** | `=true` → **BACKEND** |
|---|---|---|
| Fuente de datos | placeholders **deterministas** (demo, sin API) | API real (`/api/*` → backend → Postgres) |
| Fallback | `USE_PLACEHOLDER_FALLBACK = true`: todo cae a placeholder | `false`: **dato real o VACÍO**, nunca cifras falsas |
| Excluidas | `SHOW_PLACEHOLDER_EXCLUDED`: 6 zonas demo | capa real (`/tiles/excluded`) |
| Uso | demos/QA sin backend | producción |

**Regla de oro:** en modo backend el sistema **nunca inventa valores**. Si una variable
no tiene dato (p.ej. no se ingirió), se muestra "—" / vacío. Los placeholders solo existen
en modo template. (Backend: real o vacío; nunca placeholder.)

---

## 5. Ingesta de datos (comportamiento)

La ingesta es **destructiva por dataset** (reemplaza todo) y se dispara desde Admin
(subir máster / metadatos) o por tool.

### 5.1 Hexágonos (máster `*.h3.parquet`)
`update_from_parquet` → según `HEXAGON_INGEST`:
- **`copy` (por defecto):** vía `COPY` de Postgres. **Atómico**: `TRUNCATE hexagon` + `COPY`
  en **una sola transacción** (si el proceso muere a mitad, no deja datos a medias).
  **Streaming** `dict → tupla → COPY` (no materializa el dataset en RAM) → máximo rendimiento.
- **`orm` (fallback portable):** `DELETE` + inserción por lotes vía ORM (entornos sin COPY,
  p.ej. tests). Más lento, no requiere Postgres-COPY.
- En la **misma transacción** se recalcula **`hexagon_meta`** (min/max por variable) para la
  normalización. Los valores del parquet se **sanean** a tipos JSON nativos (`_clean_variables`:
  pandas/numpy → JSON) antes de persistir en `hexagon.variables` (JSONB).
- `INGEST_MEM_CAP_MB` acota el pico de memoria del proceso de ingesta.

### 5.2 Catálogo / metadatos (InfoVariables, normas, escenarios, turbinas)
Servicios dedicados, también destructivos por tabla:
- **`metadata_ingest`** — InfoVariables.xlsx → `catalog_variable` (label, dimensión,
  criterio/subcriterio, fuente, licencia, método de cálculo, `icon_key`, `enMapa`, pesos).
  Registra las columnas del documento en `parquet_column` (nombre ↔ `base_code`).
- **`catalog_ingest`** — normas regulatorias → `catalog_norma`.
- **`economic_ingest`** — escenarios/series macro → `catalog_escenario` / `economic_*`.
- **`bundle_service` / `master_service`** — subida del *bundle* de máster (drag-and-drop en
  Admin) y estado/versión de la máster (`master_version`).

### 5.3 Después de ingerir (obligatorio)
1. `VACUUM ANALYZE hexagon;` → mantiene `reltuples` (usado por `warmup`) y el *visibility map*.
2. Verificar con **`GET /api/admin/db/overview`** (solo admin): columnas por tabla + la
   **tríada** de códigos de variable en **h3** (`hexagon_meta`) vs **catálogo**
   (`catalog_variable`) vs **máster** (`parquet_column`), con el diff de qué falta/sobra.

---

## 6. Backend — endpoints

Router `/api/tiles/*` (datos del mapa) · `/api/admin/*` (gestión) · `/api/historico`
· `/api/health` · `/api/_debug/*`.

| Endpoint | Qué hace | Coste típico |
|----------|----------|--------------|
| `GET /tiles/warmup` | metadatos + conteo **estimado** (`reltuples`, no `count(*)`) | µs |
| `GET /tiles/variables` | catálogo (meta + `catalog_variable`) | <1 ms |
| `GET /tiles/{z}/{x}/{y}` | tile del grid (bbox → agregación por zoom, streaming) | ms |
| `GET /tiles/detail/{h3}` | detalle de un hex (PK) | 0,1 ms |
| `POST /tiles/area` | informe: hexes del área (score/dimensiones/variables + ponderadas) | ms |
| `POST /tiles/variable` · `/variables-bulk` | capa(s) de variable por bbox (bulk = N códigos en 1 scan) | el más pesado |
| `GET /tiles/excluded` | capa completa de excluidos (índice parcial + caché TTL) | ms |
| `GET /api/admin/db/overview` | verificación de ingesta (admin) | — |
| `GET /api/_debug/stats` · `/_debug/inflight` | RAM/swap/in-flight (gate `DEBUG_INFLIGHT=1`) | diagnóstico |

**Anti-OOM / concurrencia:**
- Streaming (`stream_results`, `yield_per`) — la RAM no escala con el dataset.
- Pool explícito (`DB_POOL_SIZE`=5 + `DB_MAX_OVERFLOW`=15 = **20/worker**) + cap de
  threadpool anyio (`APP_THREAD_LIMIT`=18). Gunicorn **2 workers**, `--timeout 120`.
- Trazabilidad: `TRACE_REQUESTS`, `INFLIGHT_WARN`, `SLOW_REQUEST_MS` (logs de saturación).

---

## 7. Capacidad (medida con `tools/loadtest.py`)

Server 2 workers / ~2 GB. Techo útil ≈ **25 usuarios concurrentes** explorando.
Evidencia: `docs/testing/benchmark-carga-h3-2026-09-30.md`.

| Endpoint | Techo (2 GB) | ≈ por GB | Cuello | Datos movidos |
|----------|-------------|----------|--------|---------------|
| `detail` | ~100 | ~50 | app (2 workers) | 1 hex (~0,7 KB) |
| `area` | ~100 | ~50 | app | 20–300 hexes (~0,06–0,22 MB) |
| `variables` | ~100 | ~50 | app | 62 filas meta |
| `warmup` | >100 | >50 | — | conteo estimado |
| `variables-bulk` | ~10 | ~5 | **BD** (scan bbox) | hasta ~165 MB leídos |

**Regla:** ~1 worker ≈ 18 operaciones de BD concurrentes por cada ~1 GB de RAM.
`variables-bulk` es el más caro → el front acota **bbox + resolución**, **cachea de forma
acumulativa** (ocultar una capa no re-pide) y **aborta** peticiones en vuelo al cambiar de
capas/salir (evita apilamiento que satura el back).

---

## 8. Base de datos

| Tabla | Rol |
|-------|-----|
| `hexagon` | malla res 8: `h3_index` (PK), `score_general`, `tipo_celda`, `emplazamiento`, `lat`, `lng`, `variables` (JSONB) |
| `hexagon_meta` | rango min–max por variable (normalización) |
| `hexagon_variables_pon` | valores ponderados por hex (para "descargar crudos") |
| `catalog_variable` / `catalog_norma` / `catalog_escenario` / `catalog_turbine` | catálogo editable de admin |
| `parquet_column` | registro de columnas de la máster (nombre ↔ base_code) |
| `app_config` | clave→JSON editable (p.ej. `support_email`, `report_calc_text`) |
| `informe` | histórico de informes por usuario (`MAX_HISTORIAL_PER_USER`) |
| `app_user` / `master_version` | usuarios / versiones de la máster |

- **Migraciones:** Alembic (`migrations/versions/`). En dev `init_db` crea tablas; en prod
  `alembic upgrade head`. Última: `0015_hexagon_excluded_index` (índice parcial para
  `/tiles/excluded`).
- **Rendimiento Fase 1 (hecho):** `warmup` con estimado `reltuples`; caché en proceso de
  excluidos (`EXCLUDED_CACHE_TTL`); índice parcial.
- **Fase 2 (propuesta de rediseño h3-pg):** extensión H3 de Postgres con PK `h3index`
  (BIGINT), partir el JSONB fuera del camino caliente, columnas padre H3 y vistas
  materializadas por resolución para `variables-bulk`. Objetivo: subir el cache-hit (hoy ~74 %)
  y el techo de concurrencia.

---

## 9. Seguridad

- **OIDC/Keycloak:** login en el front (Auth.js); el backend **verifica** el JWT contra el
  JWKS (`KEYCLOAK_JWKS_URL`), audiencia (`KEYCLOAK_AUDIENCE`) y algoritmos (`JWT_ALGORITHMS`).
- **BFF privado:** el backend no es público; solo acepta al front vía `INTERNAL_API_SECRET`
  (+ identidad reenviada). CORS restringido con `CORS_ORIGINS`.
- **Roles:** endpoints de datos exigen usuario autenticado; `/admin/*` exige `admin`.
- **Datos:** backend = real o vacío (nunca placeholder). Credenciales fuera del repo
  (gestor de secretos).

---

## 10. Observabilidad / operación

- **`tools/loadtest.py`** — carga por endpoint + `EXPLAIN`/salud BD (`--db-url`).
- **`/api/_debug/stats` · `/_debug/inflight`** (`DEBUG_INFLIGHT=1`) — RAM, swap, in-flight.
- **Red de seguridad de memoria:** swap + earlyoom (ver Manual de Instalación §7).
- **Runbook de producción** (front AccuWeb): `docs/ops/accuweb-runbook.md`.
- **Documento técnico de comportamiento/config:** `docs/ops/documento-tecnico-comportamiento-herramientas-config.md`.

---

## 11. Referencias
- Benchmark de carga: `docs/testing/benchmark-carga-h3-2026-09-30.md`
- Comportamiento/herramientas/config: `docs/ops/documento-tecnico-comportamiento-herramientas-config.md`
- Runbook AccuWeb: `docs/ops/accuweb-runbook.md`
- ADRs: `docs/adr/`
- Instalación y variables de entorno completas: `docs/manual-instalacion.md`
