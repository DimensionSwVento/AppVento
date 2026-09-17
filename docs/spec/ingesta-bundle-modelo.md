---
version: 0.2 (DISEÑO — estructura CONFIRMADA por modelo.txt; entrega back mañana)
date: 2026-09-15
scope: Consumo del BUNDLE del modelo (varios .h3.parquet). Onshore ahora, offshore después.
status: estructura confirmada; falta implementar ingesta cuando lleguen los parquets
---

# Consumo del BUNDLE del modelo (varios .h3.parquet)

> Confirmado (2026-09-15, `modelo.txt`): el back entrega **un árbol de `.h3.parquet`**,
> NO una sola master. Los **scores vienen PRECALCULADOS** → se **ingieren**, no se
> calculan. Entrega mañana. Hoy = **onshore**; **offshore** llega después (otro
> bundle idéntico).

## 1. Estructura REAL del bundle (confirmada)
```
modelo/
├── criterios/
│   ├── criterios.h3.parquet         ← TODOS los criterios por hex (1 fila/hex, columnas por criterio)
│   ├── criterios.csv                ← definición/orden de criterios
│   ├── global/global.h3.parquet     ← SCORE GENERAL por hex (índice de idoneidad)
│   ├── recurso_eolico/…parquet      ← score criterio (→ dimensión TÉCNICA)
│   ├── infraestructura/…parquet     ← score criterio (→ dimensión TÉCNICA)
│   ├── contexto_biotico/…parquet    ← score criterio (→ dimensión AMBIENTAL)
│   ├── contexto_abiotico/…parquet   ← score criterio (→ dimensión AMBIENTAL)
│   ├── entorno_social/…parquet      ← score criterio (→ dimensión SOCIAL)
│   ├── economia/…parquet            ← score criterio (→ dimensión MACROECONÓMICA)
│   └── alerta/alerta.h3.parquet     ← bandera de ALERTA (viento) — no es dimensión
├── subcriterios/
│   ├── subcriterios.h3.parquet      ← TODOS los subcriterios por hex
│   ├── minmax_anchors.json          ← RANGOS de normalización (→ hexagon_meta)
│   └── <criterio>/<subcriterio>.h3.parquet  (amenazas, geologicas, areas_protegidas,
│        especies_bioticas, cond_vida, dist_interes, instituciones, brecha,
│        riesgo_seguridad, sensibilidad, gobernanza, vulnerabilidad, dist_infra,
│        dist_nodos, densidad_wpd, …)
├── variables/variables.h3.parquet       ← VALORES CRUDOS por hex (todas las variables) + excluido/alerta
├── variables_pon/variables_pon.h3.parquet ← variables ya PONDERADAS por hex
└── mcda_variables.error.txt             ← log de errores de la corrida (ignorar)
```
Cada `.h3.parquet` trae su `h3_index` como clave. Los `.h3.html` son solo previews.

## 2. Plan de CONSUMO (qué archivo alimenta qué) — el consumo de la app NO cambia
El front sigue leyendo de `hexagon` vía `/api/tiles/*`. Solo cambia la INGESTA:

| Archivo del bundle | → Destino en `hexagon` | Nota |
|---|---|---|
| `criterios/global/global.h3.parquet` | `hexagon.score_general` | índice de idoneidad (ya calculado) |
| `criterios/criterios.h3.parquet` | **`hexagon.scores` (JSONB nuevo)** | score por criterio; 1 pasada trae todos |
| `variables/variables.h3.parquet` | `hexagon.variables` (JSONB) + `excluido`→`tipo_celda` + `alerta` | valores crudos por hex |
| `subcriterios/minmax_anchors.json` | `hexagon_meta` (rangos) | reemplaza el min/max calculado |
| `variables_pon/…` | (opcional) | si se necesita el detalle ponderado |
| `criterios/alerta/…` | bandera de alerta (viento) | informativa, no puntúa |

**Decisión ya resuelta:** los scores se **INGIEREN** (no se recalculan). El AHP del
backend (`model_weights.py`, hoy placeholder 1.0) queda **solo de fallback**.

## 3. Reconciliación criterio ↔ dimensión de la app (DECISIÓN pendiente)
El modelo tiene **7 criterios**; la app muestra **5 dimensiones**. Mapeo:
- `recurso_eolico` + `infraestructura` → **Técnica**
- `contexto_biotico` + `contexto_abiotico` → **Ambiental**
- `entorno_social` → **Social**
- `economia` → **Macroeconómica**
- `regulatoria` → (sin datos aún)
- `alerta` → bandera, no dimensión

⚠️ El modelo salta de criterio → `global` (no da nivel "dimensión de la app"). Para
las **barras por dimensión** hay que decidir: (a) **mostrar los 7 criterios del
modelo** tal cual (recomendado: es lo que el modelo calcula), o (b) **agregar**
criterios→dimensión con una regla (promedio/pesos de `criterios.csv`). Definir con
el equipo. `criterios.csv` probablemente trae los pesos/orden para (b).

## 4. Onshore / offshore
- Bundle de mañana = **onshore**. Offshore = otro bundle idéntico después.
- Plan: columna `hexagon.emplazamiento` (default `"onshore"`) — una ingesta por bundle.
  El consumo no se entera (o se filtra por emplazamiento según la selección).

## 5. Checklist para MAÑANA (cuando lleguen los parquets)
1. Migración: `hexagon.scores` (JSONB) + `hexagon.emplazamiento` (str, default onshore).
2. Ingesta bundle en `tile_service`/`catalog_ingest`: leer los N parquets del árbol y
   mapear según §2 (una fila `hexagon` por hex: score_general + scores + variables +
   excluido/alerta). Registrar cada capa en `data_source`.
3. Ampliar `base_code` para casar columnas de `variables.h3.parquet` (`DIM_NNN_...`)
   con el `master_id` del catálogo (quitar `_onshore/_dist/_t/_alert/_svNNN`).
4. Ingerir `minmax_anchors.json` → `hexagon_meta`.
5. Confirmar §3 (criterios del modelo vs dimensiones de la app) antes de tocar el front.
6. Cargar el bundle onshore, humo `USE_BACKEND=true`, verificar mapa/informe.
