---
version: 0.1 (DISEÑO — no implementado)
date: 2026-09-14
scope: Rediseño de la ingesta de datos del modelo — de "una master" a un BUNDLE multi-capa
status: pendiente de confirmar contenido real de los parquets del modelo
---

# Ingesta del modelo como BUNDLE (no "una master")

> Realización (2026-09-14): lo que llamábamos "la master" en realidad son **varias
> fuentes separadas** del mismo dataset. El `.parquet` que creíamos master = solo
> la capa de **variables crudas** (ponderadas + excluyentes + `excluido`/`alerta`).
> El **modelo** (carpeta de parquets) = las capas de **scores precalculados**.
> Además, el modelo entregado hoy es **onshore-only**; offshore llegará como otro
> bundle más adelante.

## 1. Capas del bundle (de `modelo.txt`)
```
DATASET onshore  (offshore = bundle futuro, mismo layout)
├── variables/variables.h3.parquet        ← valores crudos por hex (todas las columnas
│                                             DIM_NNN…) + `excluido` (bool) + `alerta` (bool)
├── variables_pon/variables_pon.h3.parquet ← variables ya ponderadas
├── criterios/<dim>.h3.parquet             ← score POR DIMENSIÓN (recurso_eolico, contexto_biotico,
│                                             contexto_abiotico, entorno_social, economia,
│                                             infraestructura, alerta)  [¿precalculado?]
├── criterios/global.h3.parquet            ← score GENERAL por hex               [¿precalculado?]
└── subcriterios/minmax_anchors.json       ← rangos de normalización por variable
```

## 2. Decisiones tomadas (usuario, 2026-09-14)
- **Onshore-only ahora.** Dejar preparado el eje mar/tierra; offshore = bundle aparte
  después. → columna `hexagon.emplazamiento` (default `"onshore"`), sin crearla aún.
- **Scores: POR CONFIRMAR** si vienen precalculados (ingerir `criterios/global` +
  `criterios/*`) o hay que calcularlos (AHP en backend). Diseñar para SOPORTAR AMBOS;
  no implementar la ingesta de scores hasta inspeccionar los parquets.
- **Variables→CSV: EN PAUSA.** El catálogo de metadatos (`catalog_variable`) sigue en
  `variables_seed.json` por ahora; no migrar a CSV hasta cerrar este rediseño.

## 3. Qué cambia y qué NO
- **Consumo (front + tiles → `hexagon`): NO cambia.** La app seguirá leyendo de
  `hexagon` (`score_general`, `variables`, `tipo_celda`). Cero cambios de front.
- **Ingesta: SÍ cambia.** Hoy `tile_service.update_from_parquet` lee UN parquet y
  **calcula** el score con pesos placeholder. Debe pasar a **ingesta de bundle**:
  - `variables/` → `hexagon.variables` (JSONB) + `excluido`→`tipo_celda` + `alerta`→flag.
  - `criterios/global` → `hexagon.score_general` (si precalculado).
  - `criterios/<dim>` → **nueva** `hexagon.scores` (JSONB por dimensión) [si precalculado].
  - `minmax_anchors.json` → `hexagon_meta` (reemplaza el min/max calculado).
  - Si NO hay scores precalculados → fallback: calcular con `model_weights` (AHP real).

## 4. Cambios de esquema PLANEADOS (no aplicados)
- `hexagon.emplazamiento: str = "onshore"` (índice) — para el eje mar/tierra futuro.
- `hexagon.scores: JSONB = {}` — score por dimensión precalculado (hoy se calcula en
  `get_area_report`; si el modelo lo trae, se ingiere y `get_area_report` lo prefiere).
- `data_source`: una fila POR CAPA del bundle (`model_variables`, `model_criterios`,
  `model_global`, `model_anchors`), no una sola "master". Reutiliza `catalog_ingest`.

## 5. Ingesta (diseño, alineado con lo ya montado)
- La ingesta destructiva del bundle = por **consola** (como hoy la master):
  `python -m tools.ingest_docs model --destructive` (o un comando de bundle dedicado).
- `base_code` (backend) debe ampliarse para casar `DIM_NNN` quitando sufijos
  `_onshore/_dist/_t/_alert/_svNNN…` (mapeo columna master ↔ `master_id` del catálogo).
- Reconciliación por capa (Quinn): ¿los hex de `criterios/global` casan con los de
  `variables`? huérfanos/faltantes → `data_source.notes`.

## 6. Pendiente de confirmar antes de implementar
1. ¿`criterios/*` y `global` vienen con score YA calculado? (define ingerir vs calcular).
2. ¿`variables_pon` se usa o basta con `variables` + pesos?
3. ¿Offshore será bundle separado con mismo layout? (confirmado: sí, futuro).
4. Formato exacto de columnas de `variables.h3.parquet` (para el mapeo `base_code`).
