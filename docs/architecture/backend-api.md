---
version: 1.0
date: 2026-07-29
audience: devs · PM · integradores
revisar: cada 30 días
maintainer: mavalan Software
---

# Vento — Backend API (referencia técnica)

> Referencia del **backend de Vento**: una API geoespacial en **FastAPI** que evalúa el
> territorio colombiano mediante hexágonos **H3** (resolución base 8). Vive en un
> **repositorio separado** (`AppVento---Backend`) y lo consume el frontend Next.js a través
> del patrón **BFF**. Este documento describe endpoints, modelo de datos, autenticación,
> scoring, ingesta, configuración y despliegue, fiel al código actual.

Ver también: [Integración frontend ↔ backend](./frontend-backend-integration.md) · [Documentación maestra](../README.md).

---

## 1. Resumen

El backend evalúa el territorio colombiano por **hexágonos H3** (res base 8). Cada hexágono tiene:

- un **score general** (0–1),
- un **tipo de celda**,
- un conjunto **disperso** de variables codificadas (ej. `TEC_001`, `REG_034`, `SOE_002`, `TEC_001_sv001`) producidas por el modelo del equipo de investigación.

**Caso de uso principal — informe por área:** el usuario selecciona un polígono (o lista de celdas) y recibe los hexágonos de esa zona con su score general, sus **scores por dimensión** y el **detalle de variables**. Secundariamente sirve un **mapa por tiles** y un **histórico de informes por usuario**.

- **Framework:** FastAPI.
- **Arquitectura:** Clean Architecture / DDD — capas `domain` / `application` / `infrastructure` / `api`.
- **Runtime:** **Python 3.10+ obligatorio** (usa sintaxis PEP-604 evaluada en runtime).

---

## 2. Arquitectura — clave: STATELESS

El backend **no carga datos en memoria al arrancar**. Consulta **Postgres por request**. Diseñado así para escalar a **~1.6 M hexágonos** sin agotar RAM.

| Pieza | Ruta | Rol |
|---|---|---|
| **Puerto** `HexagonSource` | `domain/query_engine/source.py` | Contrato de acceso a datos (`fetch_cells`, `fetch_one`, `fetch_bbox`, `variable_names`, `variable_range`, `variable_ranges`, `count`, `counts`, `is_ready`). Inversión de dependencias: el servicio depende de esta interfaz. |
| **Implementación** `PostgresHexagonSource` | `infrastructure/db/hexagon_query_repository.py` | Consulta la tabla `hexagon` por PK (`WHERE h3_index = ANY(...)`), por bbox (`lat/lng BETWEEN`), y los metadatos desde `hexagon_meta`. Se instancia **por request** vía la dependencia `get_hexagon_source` (`api/deps.py`). |
| **Servicio de aplicación** | `application/services/tile_service.py` | Orquesta cada operación (resuelve geometría → pide datos al source → formatea salida). Stateless; cada función recibe un `source`. |
| **Lógica pura de dominio** | `domain/query_engine/` | `geo.py` (tile↔bbox, polígono→celdas H3), `scoring.py` (score placeholder `calc_temp_viability`, filtro Colombia, `zoom_to_h3_res`), `variable_engine.py` (lectura/normalización de variables), `aggregator.py` (agrega hexágonos a resolución de zoom). |

> **Nota:** `domain/query_engine/models.py` (`Query`, `QueryResult`, `TileXYZ`) es **legado** del motor previo (pre-stateless) y puede estar sin uso. Los DTOs de salida reales están en la [sección 6](#6-dtos-de-dominio-salida).

---

## 3. Autenticación (obligatoria, no configurable)

Guard dual **`require_user`** (`infrastructure/auth/keycloak_guard.py`). **Todos** los endpoints de datos la exigen; solo `/api/health` y `/api/tiles/warmup` quedan abiertos. Dos vías aceptadas:

1. **BFF interno** (el frontend Next reenvía identidad ya verificada):
   - `X-Internal-Secret` (debe igualar `INTERNAL_API_SECRET`)
   - `X-User-Sub`
   - `X-User-Roles` (roles separados por coma)
2. **JWT de Keycloak directo:** `Authorization: Bearer <token>`, verificado **RS256 vía JWKS**; se valida **firma + issuer** (`KEYCLOAK_ISSUER`). El **`aud` NO se valida**.

En ambas vías se **provisiona/actualiza** el usuario en Postgres (`ensure_user`, tabla `app_user`). **No hay login/registro propios** — los emite Keycloak. Fallo → **401**.

Existe además **`require_role(rol)`** (factory) que exige un rol del realm y devuelve **403** si falta (solo vía JWT).

**`CurrentUser`** expone: `sub` (str), `email` (str|None), `roles` (list[str]), `has_role(rol)`.

---

## 4. Endpoints

Todos cuelgan de `/api`. Router de tiles: `prefix=/tiles`. Router de histórico: `prefix=/historico`.

### 4.1 Salud

| Método | Ruta | Auth | Respuesta |
|---|---|---|---|
| `GET` | `/api/health` | — | `{"status":"ok","index_ready":<bool>}` · `index_ready` = hay datos en `hexagon`. |

### 4.2 Mapa / hexágonos — `/api/tiles`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/api/tiles/warmup` | — | Bundle de metadatos (barato, sin cargar datos). |
| `GET` | `/api/tiles/variables` | ✅ | Variables disponibles con etiqueta, dimensión y rango. |
| `GET` | `/api/tiles/counts` | ✅ | Conteos globales/selección. Query: `zoom` (int, def 6), `var` (str opc), `selected` (CSV h3 opc). |
| `GET` | `/api/tiles/detail/{h3_index}` | ✅ | Detalle de un hexágono. `404` si no existe. |
| `GET` | `/api/tiles/{z}/{x}/{y}` | ✅ | Hexágonos del tile, agregados a la resolución del zoom. Query `var` opc. `Cache-Control: public, max-age=3600`. |
| `POST` | `/api/tiles/heatmap/area` | ✅ | Heatmap de una variable sobre un área. |
| `POST` | `/api/tiles/area` | ✅ | **Método principal del informe.** Hexágonos del área con scores por dimensión + detalle. |

**Detalle de respuestas:**

- **`GET /warmup`** →
  ```json
  {"status":"ready"|"empty","count":0,"variableNames":["..."],"categories":["TEC","REG"],"ranges":{"VAR":{"min":0,"max":1}}}
  ```
- **`GET /variables`** → `{"variables":[{"name":"TEC_001","label":"<humano>","dimension":"TEC","range":{"min":x,"max":y}}]}`. BD vacía → `{"variables":[]}`.
- **`GET /counts`** → `{"total":0,"selected":0,"aboveThreshold":0}`. `aboveThreshold` = `score > 0.33` (o variable normalizada `> 0.33` si se pasa `var`).
- **`GET /detail/{h3}`** → `{"h3_index","score_general","tipo_celda","lat","lng","variables":{...}}` · `404` si no existe.
- **`GET /{z}/{x}/{y}`** → array de **`TileHex`** (claves cortas):
  ```json
  [{"h":"<h3>","s":0.8,"t":"<tipo>","la":6.1,"ln":-75.5,"v":null}]
  ```
- **`POST /heatmap/area`** — Body `{"polygon":[[lng,lat]...]}` **o** `{"hexes":["87..."]}` + **`var`** (requerido) + `resolution` (opc, def 8). Respuesta: `[{"h":"<h3>","value":<0-1|null>}]`. Falta `var` → **400**; falta `polygon`/`hexes` → **400**.
- **`POST /area`** — Body `{"polygon":[[lng,lat]...]}` **o** `{"hexes":[...]}` + `resolution` (opc, def 8). Respuesta: array de **`AreaHex`**:
  ```json
  [{"h3_index":"87...","lat":6.1,"lng":-75.5,"score_general":0.72,
    "scores":{"TEC":0.8,"REG":0.5},"tipo_celda":"disponible","variables":{"TEC_001":11}}]
  ```
  `scores` = por dimensión/categoría = **promedio** de las variables de esa categoría **normalizadas** con los rangos de `hexagon_meta`, redondeado a 4 decimales. Falta `polygon`/`hexes` → **400**.

### 4.3 Histórico de informes — `/api/historico`

Todas con **auth**; operan **solo sobre `user.sub`** (el usuario autenticado).

| Método | Ruta | Status | Descripción |
|---|---|---|---|
| `GET` | `/api/historico` | 200 | Lista los informes del usuario (más recientes primero). |
| `POST` | `/api/historico` | **201** | Crea un informe. Rotación: conserva solo los `MAX_HISTORIAL_PER_USER` (def 50) más recientes. |
| `DELETE` | `/api/historico/{informe_id}` | **204** | Elimina un informe propio. `404` si no existe / no es del usuario. |

- **`GET`** → `[{"id","createdAt"(ISO),"nombre","hexes":[...],"variables":[...],"caracteristicas":{...},"scores":{...},"region","areaKm2"}]`
- **`POST`** — Body (camelCase o snake): `{"nombre","hexes","variables","caracteristicas","scores"(o "scores_snapshot"),"region","areaKm2"(o "area_km2")}`. Guarda **parámetros compactados, nunca el PDF**. Devuelve el informe creado (mismo shape que `GET`).

---

## 5. Modelo de datos (Postgres)

Tres tablas de runtime + metadatos. Migraciones **Alembic** (`0001_initial`, `0002_hexagon_meta`). En dev `init_db()` hace `create_all` al arrancar.

### `app_user` — espejo local del usuario Keycloak
| Columna | Tipo | Notas |
|---|---|---|
| `sub` | str | **PK** |
| `email` | str, null | |
| `roles` | JSONB | |
| `created_at` | timestamptz | |

Se provisiona en cada request autenticado.

### `hexagon` — espejo persistido del parquet (fuente de runtime)
| Columna | Tipo | Notas |
|---|---|---|
| `h3_index` | str | **PK** |
| `score_general` | float | default 0 |
| `tipo_celda` | str | default `"disponible"` |
| `lat` | float, null | **indexado** (btree) |
| `lng` | float, null | **indexado** (btree) |
| `variables` | JSONB | dict disperso `{"REG_034":3.2,"TEC_001":null}` |
| `updated_at` | timestamptz | |

Índices en `lat`/`lng` para tiles por bbox.

### `hexagon_meta` — metadatos agregados (precalculados en la ingesta)
| Columna | Tipo | Notas |
|---|---|---|
| `variable` | str | **PK** |
| `vmin` | float | |
| `vmax` | float | |

Una fila por variable. Fuente de los **rangos de normalización** y del **catálogo de variables**. Evita barrer todo el dataset por request.

### `informe` — informes guardados por usuario
| Columna | Tipo | Notas |
|---|---|---|
| `id` | str (UUID) | **PK** |
| `user_id` | FK → `app_user.sub` | `ON DELETE CASCADE`, indexado |
| `created_at` | timestamptz | indexado |
| `nombre` | str | |
| `hexes` | JSONB list | |
| `variables` | JSONB list | |
| `caracteristicas` | JSONB dict | |
| `scores_snapshot` | JSONB dict | |
| `region` | str, null | |
| `area_km2` | float | default 0 |

---

## 6. DTOs de dominio (salida)

`domain/models/hexagon.py` y `source.py`:

| DTO | Campos | Uso |
|---|---|---|
| `HexagonData` | `h3_index, score_general, tipo_celda, variables` | Fila cruda del parquet. |
| `HexRow` (`source.py`) | `h3_index, score_general, tipo_celda, lat, lng, variables` | Fila devuelta por el source. |
| `TileHex` | `h, s, t, la, ln, v` | Payload liviano de tile. |
| `HexDetail` | `h3_index, score_general, tipo_celda, lat, lng, variables` | Detalle completo. |
| `AreaHex` | `h3_index, lat, lng, score_general, scores{dim}, tipo_celda, variables` | Hex del informe. |

---

## 7. Variables y scoring

- **Códigos de variable:** prefijo de 3 chars = **dimensión/categoría** (`TEC`, `REG`, `SOE`, `AMB`, `MAC`…); el resto identifica la variable (`TEC_001`, `TEC_001_sv001`). `variable_catalog.py` mapea código→etiqueta (`get_variable_label`) y código→dimensión (`dimension_of`); `extract_categories` obtiene los prefijos únicos.
- **Normalización:** `normalize(valor, min, max)` → `[0,1]` usando los rangos de `hexagon_meta`.
- **Score por dimensión** (en `/area`): promedio de las variables de esa categoría normalizadas.
- **Score general:** viene del parquet; si es ≤0 se calcula con **`calc_temp_viability`** (⚠️ **PLACEHOLDER** que pondera `TEC_001` viento, `TEC_004` densidad, `SOE_001` reserva, `SOE_002`; se reemplazará por el **modelo AHP real**). Se calcula **una vez en la ingesta** y se persiste.
- **Filtro Colombia:** `is_in_colombia(lat,lng)` (bounding + polígono); los hexágonos fuera se descartan en la ingesta.
- **H3:** base res 8. Tiles: `zoom_to_h3_res(z)` mapea zoom→resolución (`z≥10→7`, `≥8→6`, `≥7→5`, `≥6→4`, else `3`) y agrega los hexágonos base del bbox a esa resolución.

---

## 8. Ingesta de datos

El parquet (`data/master_variables.h3.parquet`, entregado por investigación, **no versionado**) es **solo entrada de ingesta, no runtime**.

| Herramienta | Descripción |
|---|---|
| `python -m tools.ingest_parquet [ruta]` | Ingesta **destructiva** (borra y recarga `hexagon` + `hexagon_meta`). Streaming con **pyarrow** (memoria acotada), calcula lat/lng + score efectivo + filtro Colombia, y acumula min/max por variable. Toggle `HEXAGON_INGEST`: **`copy`** (Postgres COPY, `TRUNCATE+COPY` atómico en una transacción, rápido) o **`orm`** (fallback portable por lotes). Progreso por lote. |
| `python -m tools.inspect_parquet [ruta]` | Imprime la estructura real del parquet (columnas, tipos, % nulos, dimensiones). |

CRUD incremental para mantenimiento en `infrastructure/db/hexagon_repository.py` (`get`, `upsert`, `update`, `delete_one`, `count`).

---

## 9. Configuración (variables de entorno) — `shared/config.py`

Carga `.env` con `python-dotenv`.

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | ej. `postgresql+psycopg://usuario:pass@host:5432/vento` |
| `KEYCLOAK_ISSUER` | Issuer del realm; base para validar el JWT. |
| `KEYCLOAK_JWKS_URL` | Derivada del issuer (sobreescribir solo si difiere). |
| `KEYCLOAK_AUDIENCE` | default `"account"` (no se valida el `aud`). |
| `JWT_ALGORITHMS` | default `RS256` (CSV). |
| `INTERNAL_API_SECRET` | Secreto compartido con el BFF Next. |
| `CORS_ORIGINS` | CSV de orígenes permitidos. |
| `PARQUET_PATH` | Ruta al parquet maestro (solo ingesta). |
| `MAX_HISTORIAL_PER_USER` | default `50`. |
| `HEXAGON_INGEST` | `copy` \| `orm` (default `copy`). |

> `AUTH_ENABLED` **fue eliminada** — la autenticación es obligatoria.

### Relación con el env del frontend

Tres variables del backend se comparten/coordinan con el frontend Vento:

| Backend | Frontend | Relación |
|---|---|---|
| `INTERNAL_API_SECRET` | `INTERNAL_API_SECRET` | **Idéntico** — secreto compartido BFF↔FastAPI. Generar **uno por entorno** y copiarlo a ambos. |
| `KEYCLOAK_ISSUER` | `AUTH_KEYCLOAK_ISSUER` | Mismo realm; en prod, el **HTTPS público** (el `iss` que Keycloak emite en el token). |
| `CORS_ORIGINS` | `AUTH_URL` (origen del front) | El backend permite el origen público del front. |
| `MAX_HISTORIAL_PER_USER` | `MAX_HISTORIAL_ENTRIES` (constante en `projectData.ts`) | Deben **alinear**. |

Detalle completo del flujo BFF y del despliegue por fases: [Integración frontend ↔ backend](./frontend-backend-integration.md).

---

## 10. Despliegue y runtime

- **Python 3.10+ obligatorio.**
- **Servidor:** `gunicorn main:app -k uvicorn.workers.UvicornWorker -w 2 -b 0.0.0.0:8000`. Bind `0.0.0.0` porque vive en **red privada (VPC)** y lo consume el **BFF Next desde otra instancia**; el aislamiento lo da el **security group** (sin ingress público).
- **Arranque** (`main.py` lifespan): `init_db()` + un chequeo stateless que loguea `Backend stateless listo: N hexágonos · M variables` (no carga datos).
- **Migraciones:** Alembic (`alembic upgrade head`).
- **Empaquetado:** `Dockerfile` + `docker-compose.yml` (con Postgres) y **systemd** (`deploy/vento-backend.service`).
- **CD:** GitHub Action `.github/workflows/deploy-back.yml` — push a `main` → CI (compila + importa) → deploy por SSH (`git reset --hard` + pip + alembic + restart + healthcheck).
- **Entorno (AlmaLinux + SELinux):** el servicio **no** usa `EnvironmentFile` (la app carga `.env` sola); el venv necesita contexto SELinux `bin_t`.

---

## 11. Códigos de estado relevantes

| Código | Cuándo |
|---|---|
| `200` | La mayoría de lecturas. |
| `201` | Crear informe (`POST /historico`). |
| `204` | Borrar informe (`DELETE /historico/{id}`). |
| `400` | Falta `polygon`/`hexes`, o `var` en `/area` / `/heatmap/area`. |
| `401` | No autenticado / token inválido / falta `X-User-Sub`. |
| `403` | Falta rol (vía `require_role`). |
| `404` | Detalle o informe no encontrado. |
| `500` / `503` | Errores internos / parquet no encontrado (warmup legado). |
