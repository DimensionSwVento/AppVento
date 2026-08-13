---
version: 1.0
date: 2026-07-30
audience: equipo backend · integradores
maintainer: Mavalan Software
scope: Peticiones del frontend Vento a la API y datos que el backend debe proveer/sincronizar
---

# Vento — Checklist de sincronización backend ↔ frontend

> Qué **pide el frontend** a la API y qué **debe proveer el backend** en cada endpoint, para que el modo con datos reales funcione. **No cubre auth** (la identidad la manejan Keycloak + el BFF de Next; este documento es solo del contrato de datos).
>
> Contrato completo del backend: [backend-api.md](./backend-api.md). Cómo se conecta el front: [frontend-backend-integration.md](./frontend-backend-integration.md).

Todo pasa por el **BFF**: el navegador llama same-origin `/api/tiles/*` y `/api/historico`, y Next reenvía al FastAPI privado (`BACKEND_URL`). `/api/auth/*` y `/api/admin/*` **no** son del backend FastAPI.

---

## 1. `POST /api/tiles/area` — informe + heatmap *(la más crítica)*

- **Envía el front:** `{ "hexes": ["<h3>", ...] }` — H3 de la selección. Pueden venir **compactados / con resoluciones mixtas** (H3 `compactCells`) → el backend debe expandir/soportarlas.
- **Espera por hexágono:**
  ```json
  {"h3_index","lat","lng","score_general","scores":{...},"tipo_celda","variables":{...}}
  ```
- **El backend debe proveer:**
  - `score_general` (0–1) y `scores` **por dimensión** con claves de categoría: `TEC, AMB, SOE, SOC, MAC, REG` (normalizados 0–1). El front agrega **SOE + SOC → "social"**, `MAC → económica`, `TEC → técnica`, `AMB → ambiental`, `REG` informativa.
  - `variables`: valor **por variable individual**. El front las llavea por **`masterId`** = **el código de la master** (`TEC-004-T`, `AMB-005-A`, `SOC-011-S`) → **es el mismo código** que usa el backend, así que casan directo. ⚠️ Solo **confirmar el FORMATO exacto de la clave** (si el parquet la trae como `TEC_001`/`TEC_001_sv001` con guion bajo, normalizar guion↔guion_bajo) y **si el valor viene 0–1 o crudo** (0–1 para el "puntaje 0–100"; crudo para informativas con unidad).
  - `tipo_celda` (`"disponible"` / `"excluida"`).
  - **Columna mar/tierra** (bool 0/1) — ⚠️ **hoy no está en el contrato**; definir su **nombre** e incluirla.

## 2. `GET /api/tiles/{z}/{x}/{y}` — hexágonos del mapa (TileLayer)

- **Envía:** `z/x/y` del tile (+ `var` opcional).
- **Espera:** array liviano `[{ h, s, t, la, ln, v }]` (h3, score, tipo_celda, lat, lng, valor de la variable).
- **El backend debe proveer:** hexágonos por bbox agregados a la resolución del zoom; `t` = `tipo_celda` (para pintar excluidas); e **idealmente la columna mar/tierra** también aquí (el front la necesita en la **selección**, antes de tener un área).

## 3. `GET /api/tiles/detail/{h3_index}` — popup de hexágono

- **Espera:** `{ h3_index, score_general, tipo_celda, lat, lng, variables }` · **404** si no existe.
- **El backend debe proveer:** el detalle completo del hex (mismas variables que en `/area`).

## 4. `GET /api/tiles/variables` — catálogo del backend

- **Espera:** `{ "variables": [{ "name", "label", "dimension", "range": {"min","max"} }] }`.
- **El backend debe proveer:** `name` (código) y `dimension` (prefijo) consistentes con las claves de `scores`/`variables`. Sirve además de base para el **mapeo con el masterId**.

## 5. Histórico — `GET / POST / DELETE /api/historico`

- **POST envía (camelCase):** `{ nombre, hexes, variables, caracteristicas, scores, region, areaKm2 }`; `hexes` **compactados** (H3 `compactCells`).
- **GET espera:** lista con ese shape + `id`, `createdAt` (ISO), más recientes primero.
- **El backend debe:** guardar `hexes` tal cual (compactados), operar por usuario y **rotar a 100** (`MAX_HISTORIAL_PER_USER = 100`, hoy 50) para alinear con `MAX_HISTORIAL_ENTRIES` del front.

---

## Resumen — items a cerrar para sincronizar

| # | Item | Endpoint(s) |
|---|------|-------------|
| 1 | `scores` con claves de categoría `TEC/AMB/SOE/SOC/MAC/REG` (SOE+SOC→social) | `/tiles/area` |
| 2 | Mapeo **`código_backend ↔ masterId`** + normalización del valor por variable | `/tiles/area`, `/tiles/detail`, `/tiles/variables` |
| 3 | **Mar/tierra** y **excluida** como **columnas consultables por hex** (como una variable más). Mar/tierra: **definir nombre** (`es_offshore` provisional). Excluida: `tipo_celda="excluida"` o su columna. El front ya las consume (`isOffshoreHex`/`isHexBanned`) desde `/area`; **incluirlas también en los tiles** para cobertura de todo el mapa y bloqueo en selección. | `/tiles/area`, `/tiles/{z}/{x}/{y}` |
| 4 | Confirmar formato exacto de la clave de `variables` (masterId tal cual vs `TEC_001`) + si el valor es 0–1 o crudo | `/tiles/area`, `/tiles/detail` |
| 5 | Soportar `hexes` **compactados / resoluciones mixtas** en el body | `/tiles/area` |
| 6 | `MAX_HISTORIAL_PER_USER = 100` | `/historico` |

## Verificación rápida (curl)

```bash
curl -s $BACKEND/api/health                                  # {"status":"ok","index_ready":true}
curl -s $BACKEND/api/tiles/variables | jq '.variables|length, .variables[0]'
curl -s -X POST $BACKEND/api/tiles/area \
  -H "Content-Type: application/json" \
  -d '{"hexes":["<h3_1>","<h3_2>"]}' \
  | jq '.[0] | {score_general, scores, variables, tipo_celda, es_offshore}'
```
Con esto se confirma: claves exactas de `scores`, formato de claves de `variables`, y si existe/llega la columna mar/tierra.
