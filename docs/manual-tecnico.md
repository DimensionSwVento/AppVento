# Manual Técnico — Vento (Plataforma de idoneidad eólica)

> Arquitectura, comportamiento, datos, seguridad, configuración y operación.
> Escrito a partir de una lectura completa del código (front + backend).
> Audiencia: equipo de desarrollo / on-call. No es el manual de usuario.
> Fecha: 2026-10-01 · Autor: Mavalan Software

---

## 1. Qué es Vento

Plataforma SIG/MCDM que evalúa la **idoneidad de zonas para proyectos eólicos** en
Colombia sobre una malla de hexágonos **H3 (resolución 8)**. El usuario selecciona un
área, el sistema agrega un **índice de idoneidad (0–100)** por dimensión y general, y
genera un **informe PDF** configurable. El admin gestiona variables, datasets, normas,
escenarios económicos y usuarios.

- **Modelo (clave):** todo va en escala **1–5** (−1 = excluida). La **normalización a
  [0,1] se hace en LECTURA** (`(raw−1)/4`), **nunca en ingesta**. El `global` y los scores
  vienen **precalculados** en la máster; la app agrega/formatea, no recalcula el modelo.
- **Dimensiones:** Técnica, Ambiental, Social (**puntuables**) + Económica y Regulatoria
  (**informativas**, no puntúan).

---

## 2. Arquitectura

```
Navegador ──HTTPS──▶ Front Next.js 16 (App Router)  ── BFF: rutas /api/* ──▶ Backend FastAPI (Docker)
   Auth.js (NextAuth v5)      │  backendProxy.ts: await auth() → exige sesión;             │  gunicorn -w 2
   cookie __Secure-authjs…    │  añade X-Internal-Secret + X-User-Sub + X-User-Roles       │  (stateless)
                              │  (NO relaya access tokens)                                 ▼
                              │                                                        PostgreSQL
                              └── Keycloak (OIDC) ◀── el backend VERIFICA el JWT (JWKS)   (hexagon 1.6M, catalog_*, …)
```

- **BFF (Backend-for-Frontend):** el navegador **no** habla con el backend. Las rutas
  `/api/*` del front (`Utils/apis/backendProxy.ts`) validan la sesión de Keycloak y
  reenvían al backend privado (`BACKEND_URL`) con **`X-Internal-Secret` (=
  `INTERNAL_API_SECRET`)** + identidad (`X-User-Sub`, `X-User-Roles`). `cache: no-store`;
  502 si el backend no responde. **Nunca** se mandan access tokens al cliente (cookie <4KB).
- **Backend stateless:** nada se carga a RAM al arrancar; cada request consulta Postgres en
  **streaming** (anti-OOM). Clean architecture: `api/` (routers) · `application/` (servicios)
  · `domain/` (motor de consulta/modelo) · `infrastructure/` (BD, auth, datos).
- **Identidad:** Keycloak como IdP (OIDC). El front usa Auth.js (NextAuth v5, provider
  Keycloak **custom**); el backend **solo verifica** el JWT (no emite).

---

## 3. Stack / lenguajes

| Capa | Tecnologías (versión real) |
|------|----------------------------|
| **Front** | TypeScript · **Next.js 16** (App Router, React Compiler) · React 19 · **deck.gl 9.2** + luma.gl + MapLibre/react-map-gl (mapa) · **h3-js 4** · Tailwind CSS v4 · **Auth.js / NextAuth v5-beta** · **jsPDF 4 + html2canvas-pro 2** (PDF) · jose (JWT) · SendGrid (correo) |
| **Backend** | **Python 3.12** · **FastAPI** · Uvicorn + **Gunicorn** (`-w 2`) · **SQLAlchemy 2** · **Alembic** · **psycopg 3** · pandas + pyarrow + openpyxl (parquet/xlsx) · **h3** · PyJWT[crypto] · anyio (threadpool) · python-dotenv (dev) |
| **BD** | **PostgreSQL** (`hexagon` ~1.6 M filas × ~746 B) |
| **Identidad** | **Keycloak** (OIDC/JWT; roles `admin`/`analista`) |
| **Infra** | Front en AccuWeb (Node ≥20) · Backend **Docker** (`python:3.12-slim`) · `docker-compose` (db + keycloak + app) para dev |

> No se usa `svg2pdf`. El PDF se genera con **html2canvas-pro + jsPDF** (ver §7).

---

## 4. Flujo del usuario

Orden canónico en `Utils/usePhaseNav.ts`:
`seleccion-area → dimensiones → características → informe` (+ `histórico`). El estado de
fase (`accion`) vive en `AccionPrincipalContext`; `dashboard/page.tsx` monta siempre
`SideBar` + `MapView` y conmuta la subpágina según `accion`. El `SideBar` es un stepper con
habilitación progresiva (retroceso libre; avance hasta `maxFaseIdx`; selección→dimensiones
exige `selectedHexes.size>0`).

| Fase | Componente | Qué hace |
|------|-----------|----------|
| Selección de área | `Map.tsx` (`canSelect`) | selección de hexes (click/pincel/polígono) + buscador (Nominatim) |
| Dimensiones | `dimensions/Dimensions.tsx` | tarjetas por dimensión, filtro mar/tierra, modales económico y regulatorio |
| Características | `caracteristicas/Caracteristicas.tsx` | emplazamiento (auto), capacidad MW, categoría S/M/L, nº aerogeneradores, aviso área-vs-capacidad |
| Informe | `report/Report.tsx` | preconfiguración + previsualización + export PDF |
| Histórico | `historial/HistorialList.tsx` | lista por recencia; restaura selección+variables+config |

**Contextos globales** (`Utils/contexts/*`): `AccionPrincipal` (fase, `selectedHexes`,
`focusNonce`, config restaurada), `Variables` (`activeVariables`; obligatorias siempre
activas; hidrata catálogo de BD), `HeatmapDimension` (dimensión activa del heatmap, mutex),
`Caracteristicas`, `Regulatory` (incluir sección), `Economic` (escenario/horizonte),
`Historial` (repo BD o localStorage según modo).

---

## 5. Modo TEMPLATE vs BACKEND

Interruptor: **`NEXT_PUBLIC_USE_BACKEND`**. Al arrancar se loguea `[VENTO] MODO: …`.

| Flag (derivado) | Efecto |
|-----------------|--------|
| `USE_BACKEND = (NEXT_PUBLIC_USE_BACKEND==="true")` | "sin mixtura": en backend las lecturas NO caen a template (dato real o vacío). Afecta histórico, `useAreaHexData`, capas del mapa, catálogo/bundle, hidratación. |
| `USE_PLACEHOLDER_FALLBACK = !USE_BACKEND` | enciende scores/heatmap/informativas **placeholder** (solo demo). |
| `SHOW_PLACEHOLDER_EXCLUDED = true` (**forzado**) | muestra 6 zonas excluidas demo (aún no hay máster de excluidas por dato real completa). |
| `USE_API_EMPLAZAMIENTO = true` | mar/tierra por dato + regla de no mezclar en la selección. |

**Regla de oro:** en modo backend el sistema **nunca inventa valores** (real o vacío). Los
placeholders solo existen en modo template.

---

## 6. Mapa (deck.gl)

`Map.tsx` usa `react-map-gl/maplibre` (basemap CartoDB) + `DeckGL`. Capas principales:
- **gridTileLayer** (`TileLayer`): calcula celdas H3 del bbox del tile a la **resolución del
  zoom** (`zoomToH3Res`) y filtra "solo lo visible" dentro de Colombia (ADR-014). Pinta viento
  (viridis) o gris (excluidas). Visible/pickable solo fuera del heatmap del informe.
- **informeHeatmapLayer** (`useInformeHeatmapLayer`): malla **res-8** del área con color por
  `backendScore` real (o placeholder/transparente según modo); se normaliza cualquier res a 8.
- **selección / bordes / hover / símbolos (zona, punto, iconos) / dibujo de polígono.**
- **Capas de variable:** se piden por **bbox** (`/api/tiles/variable[s-bulk]`), con **caché**
  y **cancelación de las peticiones en vuelo** al cambiar de capas o salir (evita apilar
  scans que saturan el backend). Ocultar una capa no vuelve a pedir datos.
- **Excluidas:** se cargan como **capa completa en una sola petición** (`/tiles/excluded`) y se
  marcan con `isHexBanned` (sin pedir tile-por-tile). El emplazamiento (mar/tierra) y la
  exclusión por dato se alimentan desde `/tiles/area` (`setBannedData`/`setEsOffshoreData`).

---

## 7. Informe / PDF

`Report.tsx` arma **"hojas" A4** (794×1123 @96dpi, `ReportSheet`) según la configuración:
índice + resumen ejecutivo (índice `Gauge`, gráfico por dimensión, top-influencers
`DivergingBars`, snapshot del mapa) · una hoja por dimensión puntuable (score, peso,
tabla paginada, excluyentes, resumen del cálculo) · económica (`LineChart`) · regulatoria
(semáforo + normas + autoridades) · informativas · fuentes · disclaimer. Los gráficos son
**SVG puro** (sin librería) para capturarse limpios.

**Pipeline de exportación PDF:**
1. Escala las hojas a 1 y espera a que rendericen (rAF + delay).
2. Recorre cada `[data-report-sheet]` — **una hoja = una página A4**.
3. `html2canvas-pro(sheet, {scale: 2, jpeg 0.95})` → `jsPDF.addImage` (ajuste "contain" a A4).
4. **Chunking:** las tablas largas (variables consideradas, intervalos de ponderación,
   normas, fuentes) se parten en varias hojas para que **nunca** se corten a mitad; el
   resto de secciones también respeta el A4.
5. `pdf.save(...)`.
El snapshot del mapa se compone de los `<canvas>` (basemap + deck) y se cachea; el informe
lo lee como `<img>`.

---

## 8. Ingesta de datos (comportamiento)

La normalización 1–5→[0,1] se hace en LECTURA; la ingesta guarda el dato crudo. Hay **cuatro
caminos** (según el caso) + los ingestores de catálogo:

| Camino | Dónde | Comportamiento |
|--------|-------|----------------|
| **`copy`** (default máster) | `hexagon_repository.copy_ingest` | **COPY** de Postgres, **atómico** (`TRUNCATE`+`COPY`+`hexagon_meta` en una transacción), streaming `dict→tupla→COPY`. Máximo rendimiento. |
| **`orm`** (portable) | `replace_all` | `DELETE` + lotes de 5000 vía ORM (sin COPY). No atómico (ventana con tabla parcial). Fallback para tests. |
| **`upsert_chunk`** (modular) | `upsert_chunk` | ingesta por paquete/row-group: `ON CONFLICT` **fusiona** JSONB (`variables`/`scores` con `||`), refina `hexagon_meta` con `least/greatest`. No vacía la tabla. |
| **`blue_green`** (prod segura) | `blue_green_replace` | carga en `hexagon_new` y hace **SWAP atómico por rename**; la app lee `hexagon` durante toda la carga (sin downtime). |

- **Bundle por clases** (`bundle_service`): subir máster drag-and-drop → **plan** (lee solo el
  footer, clasifica columnas contra `parquet_column`) → **apply** protegido por **advisory
  lock** `pg_try_advisory_lock` (single-flight anti-OOM), merge outer por `h3_index` de a un
  parquet con `malloc_trim` (libera RSS), ruteo por clase (`global`→score_general,
  `criterio/subcriterio`→scores, `variable_*/alerta`→variables, `excluyente`→tipo_celda). El
  camino más pesado corre **aislado en subproceso** (`apply_detached` con `RLIMIT_AS` =
  `INGEST_MEM_CAP_MB`).
- **Catálogo** (`metadata_ingest`): InfoVariables.xlsx → jerarquía `dimension→criterio→
  subcriterio→variable`, **concilia cada variable por `master_id`**, rutea filas REG… a
  `catalog_norma`. **Económico** (`economic_ingest`): bundle macro → tabla long
  `economic_series` + `economic_panel`.
- **Después de ingerir:** `VACUUM ANALYZE hexagon;` (para `reltuples`/visibility map) y
  verificar con **`GET /api/admin/db/overview`** (columnas por tabla + diff h3 ↔ catálogo ↔
  máster).

---

## 9. Backend — endpoints

Guards: `require_user` (JWT **o** modo BFF interno), `require_admin` (rol `admin`).

| Método · Ruta | Auth | Qué hace |
|---|---|---|
| `GET /api/health` | — | estado + `index_ready` |
| `GET /tiles/warmup` | abierto | metadatos (conteo **estimado** `reltuples`, no `count(*)`) |
| `GET /tiles/variables` · `/counts` | user | catálogo con etiquetas reales · conteos |
| `GET /tiles/detail/{h3}` | user | detalle de un hex (PK) |
| `GET /tiles/{z}/{x}/{y}` | user | tile XYZ agregado al zoom (`Cache-Control 1h`) |
| `GET /tiles/excluded` | user | capa completa de excluidos (índice parcial + caché TTL) |
| `POST /tiles/area` | user | **informe**: hexes del área con score/dimensiones/variables |
| `POST /tiles/variable` · `/variables-bulk` · `/heatmap/area` | user | capa(s) de variable por bbox (bulk = N códigos en 1 scan) |
| `GET/POST/DELETE /historico[/{id}]` | user | histórico del usuario (rotación `MAX_HISTORIAL_PER_USER`) |
| `/admin/catalog/*` | user (lee) / admin (escribe) | variables, datasets, normas, escenarios, turbinas, jerarquía, metadatos, económico, `config/{key}` |
| `/admin/master/*` | admin | estado / lanzar-programar actualización de máster |
| `/admin/bundle/*` | admin | subir/plan/columns/apply/chunks/finalize de la ingesta por clases |
| `GET /admin/db/overview` | admin | verificación de ingesta (columnas + tríada h3/catálogo/máster) |
| `GET /api/_debug/stats` · `/inflight` | gate `DEBUG_INFLIGHT=1` | RAM/swap/in-flight (lo consume `loadtest.py`) |

**Anti-OOM / concurrencia:** streaming (`yield_per=5000`) · agregación por `res` · pool
explícito (20/worker) · **cap del threadpool anyio** (`APP_THREAD_LIMIT=18 ≤ 20`) para que
los endpoints hagan cola en vez de reventar el pool · gunicorn **2 workers** · `malloc_trim`
tras lotes · ingesta pesada aislada. Trazabilidad: `TRACE_REQUESTS`/`INFLIGHT_WARN`/`SLOW_REQUEST_MS`.

---

## 10. Base de datos

| Tabla | Rol |
|-------|-----|
| `hexagon` | malla res 8: `h3_index` (PK), `score_general`, `tipo_celda`, `lat`/`lng` (idx), `variables` + `scores` (JSONB), `emplazamiento` (idx) |
| `hexagon_meta` | rango min–max por variable (normalización) |
| `hexagon_variables_pon` | ponderadas por hex (score por dimensión del informe) |
| `catalog_variable` / `_norma` / `_escenario` / `_turbine` | catálogo editable de admin |
| `catalog_dimension` / `_criterio` / `_subcriterio` | jerarquía del modelo |
| `parquet_column` / `column_mapping` | registro de columnas de la máster / mapeos de ingesta |
| `economic_panel` / `economic_series` | dimensión económica (tabla long) |
| `app_config` | clave→JSON (p.ej. `support_email`, `report_calc_text`) |
| `informe` / `master_version` / `app_user` / `data_source` | histórico / versiones / usuarios / fuentes |

- **Consultas** (`hexagon_query_repository`): por celda (IN sobre PK, streaming), por bbox
  (btree lat/lng), `excluded_cells` (`tipo_celda='excluida' OR score_general<0`), `count_estimate`
  (`pg_class.reltuples`), `is_ready` (EXISTS O(1)).
- **Migraciones:** Alembic `0001`→`0015` (ver Manual de Instalación §5). Última:
  `0015_hexagon_excluded_index` (índice parcial para `/tiles/excluded`). En prod `alembic
  upgrade head`.
- **Fase 2 (propuesta):** rediseño con **h3-pg** (PK `h3index` BIGINT), partir el JSONB fuera
  del camino caliente, columnas padre H3 y vistas materializadas por resolución para
  `variables-bulk` (sube el cache-hit, hoy ~74 %, y el techo de concurrencia).

---

## 11. Seguridad y autenticación

- **Front (Auth.js / NextAuth v5):** provider Keycloak **custom** (reescritura de issuer para
  AccuWeb). El `jwt` callback persiste `roles` (de `realm_access.roles`) y refresca el token;
  el `session` expone **solo** `roles`/`sub`/`error` (no tokens). `SessionGuard` cierra sesión
  si falla el refresh.
- **Guard de admin triple:** `middleware.ts` (redirect) + `admin/layout.tsx` (server) +
  rutas BFF admin (403 si no `admin`). `useIsAdmin()` es solo UI.
- **Registro (ADR-012):** `/api/auth/register` → Keycloak `/registrations` con `state` CSRF;
  el callback hace token-exchange + logout federado y **nunca** crea sesión NextAuth. `kc-logout`
  = logout federado. Gestión de usuarios usa la **Keycloak Admin API** (no FastAPI);
  "eliminar" = **deshabilitar** (soft). Notificación de promoción a admin vía **SendGrid**.
- **Backend (`keycloak_guard`):** `require_user` es **dual** — (a) modo BFF: si
  `X-Internal-Secret` coincide con `INTERNAL_API_SECRET`, toma identidad de `X-User-*` sin
  validar JWT; (b) si no, valida el `Bearer` JWT contra el JWKS (firma RS256 + issuer;
  `verify_aud=False`). `require_admin` exige rol. CORS restringido con `CORS_ORIGINS`.
- **Datos:** backend = real o vacío. Credenciales fuera del repo.

---

## 12. Capacidad (medida con `tools/loadtest.py`)

Server 2 workers / ~2 GB. Techo útil ≈ **25 usuarios concurrentes** explorando (evidencia:
`docs/testing/benchmark-carga-h3-2026-09-30.md`).

| Endpoint | Techo (2 GB) | ≈ por GB | Cuello | Datos movidos |
|----------|-------------|----------|--------|---------------|
| `detail` / `area` / `variables` | ~100 | ~50 | app (2 workers) | 1 hex / 20–300 hexes / meta |
| `warmup` | >100 | >50 | — | conteo estimado |
| `variables-bulk` | ~10 | ~5 | **BD** (scan bbox) | hasta ~165 MB leídos |

**Regla:** `2 workers × APP_THREAD_LIMIT(18) = 36` operaciones de BD concurrentes (de ahí el
techo). Más capacidad = más workers (necesita RAM) o escalar; respetar
`APP_THREAD_LIMIT ≤ DB_POOL_SIZE+DB_MAX_OVERFLOW` y `(pool)×workers ≤ max_connections`.

---

## 13. Configuración — variables de entorno (efecto técnico)

El `.env` completo con ejemplos está en `docs/manual-instalacion.md`. Aquí, el **efecto**:

### Frontend
| Variable | Efecto |
|----------|--------|
| `NEXT_PUBLIC_USE_BACKEND` | **interruptor de modo** (backend real vs template). |
| `BACKEND_URL` / `NEXT_PUBLIC_API_URL` | destino del proxy `/api/*` (servidor) / URL de API (cliente). |
| `INTERNAL_API_SECRET` | secreto BFF→backend (debe coincidir con el del backend). |
| `AUTH_SECRET` / `AUTH_URL` / `AUTH_TRUST_HOST` | sesión Auth.js. |
| `AUTH_KEYCLOAK_ID`/`_SECRET`/`_ISSUER` | cliente OIDC (servidor). |
| `NEXT_PUBLIC_KEYCLOAK_URL`/`_REALM`/`_ISSUER` | Keycloak visible al cliente (logout/registro). |
| `SENDGRID_API_KEY`/`_FROM_EMAIL` | correos (p.ej. promoción a admin). |

### Backend
| Variable | Def. | Efecto |
|----------|------|--------|
| `DATABASE_URL` | localhost | DSN Postgres (`postgresql+psycopg://…`). |
| `PARQUET_PATH` | `data/…parquet` | parquet maestro a ingerir. |
| `HEXAGON_INGEST` | `copy` | método de ingesta (`copy`/`orm`). |
| `INGEST_MEM_CAP_MB` | — | `RLIMIT_AS` de la ingesta aislada (`apply_detached`). |
| `OFFSHORE_VAR` | `""` | columna mar/tierra; vacío = no se expone `off`. |
| `KEYCLOAK_ISSUER`/`_JWKS_URL`/`_AUDIENCE` · `JWT_ALGORITHMS` | / derivado / `account` / `RS256` | verificación del JWT. |
| `INTERNAL_API_SECRET` | `""` | exige el secreto del BFF; vacío = BFF off. |
| `CORS_ORIGINS` | `localhost:3000` | orígenes permitidos (CSV). |
| `MAX_HISTORIAL_PER_USER` | 50 | rotación del histórico. |
| `DB_POOL_SIZE`/`DB_MAX_OVERFLOW`/`DB_POOL_TIMEOUT`/`DB_POOL_RECYCLE` | 5/15/30/1800 | pool por worker. |
| `APP_THREAD_LIMIT` | 18 | threads anyio/worker = ops BD concurrentes (techo). |
| `EXCLUDED_CACHE_TTL` | 300 | TTL caché de `/tiles/excluded`. |
| `DEBUG_INFLIGHT` / `TRACE_REQUESTS` / `INFLIGHT_WARN` / `SLOW_REQUEST_MS` | off/0/12/3000 | diagnóstico. |
| `RUN_INGEST` | — | si `true`, el entrypoint ingiere el parquet al arrancar. |

> El **backend no tiene** flag template/real: siempre sirve dato real o vacío. El modo lo
> decide el **front** con `NEXT_PUBLIC_USE_BACKEND`. Proceso: `gunicorn -w 2 --timeout 120`
> (fijado en el Dockerfile).

---

## 14. Observabilidad / referencias
- **`tools/loadtest.py`** (carga por endpoint + `EXPLAIN`/salud BD con `--db-url`) ·
  `tools/ingest_parquet.py` · `tools/ingest_bundle.py` · `tools/inspect_parquet(s).py`.
- **`/api/_debug/stats` · `/inflight`** (`DEBUG_INFLIGHT=1`).
- Red de seguridad de memoria: swap + earlyoom (Manual de Instalación §7).
- Benchmark: `docs/testing/benchmark-carga-h3-2026-09-30.md` · Comportamiento/config:
  `docs/ops/documento-tecnico-comportamiento-herramientas-config.md` · Runbook AccuWeb:
  `docs/ops/accuweb-runbook.md` · Instalación y `.env`: `docs/manual-instalacion.md` · ADRs: `docs/adr/`.
