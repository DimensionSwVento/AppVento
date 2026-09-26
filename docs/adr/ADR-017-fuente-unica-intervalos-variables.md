---
id: ADR-017
title: Fuente única de intervalos (min–max) de variables ponderadas
status: aceptado
date: 2026-09-26
---

# ADR-017: Fuente única de intervalos (min–max) de variables ponderadas

## Contexto

Cada variable ponderada se normaliza a `[0,1]` usando su **intervalo de medición**
(p.ej. "de 0 a 7"). Ese intervalo se obtenía de dos maneras, sin un único punto de
control en el front:

- **Backend:** rangos OFICIALES desde `minmax_anchors.json` → `hexagon_meta` (el
  backend normaliza con ellos). Fuente de verdad en producción.
- **Front (modo template/tiles):** el min/max se **derivaba del propio dato**
  cargado en `h3TileIndex` — no había una tabla fija editable.

No existía en el front un lugar único para **fijar/cambiar** el intervalo de una
ponderada sin editar la lógica de normalización, análogo a `variableWeights.ts`
para los pesos.

## Decisión

**La fuente única de los intervalos es el BACKEND: `minmax_anchors.json` →
`hexagon_meta`.** El backend normaliza con ellos (`tile_service` /
`variable_engine.normalize`).

Se evaluó crear un archivo de override en el front (`variableRanges.ts`, espejo de
`variableWeights.ts`), pero **se descartó**: como en modo template el front ya
**deriva** el min/max del propio dato y en modo backend mandan los anchors, un
archivo de overrides quedaría **vacío = código muerto**. No se agrega.

En modo template (sin backend), el front sigue derivando el rango del dato cargado
(`h3TileIndex`), que es el comportamiento actual.

## Justificación

- Evitar código muerto: no hay intervalos fijos que centralizar en el front (se
  derivan) y la verdad ya está centralizada en un solo lugar (el JSON del backend).
- Un solo punto para cambiar rangos = editar `minmax_anchors.json` y re-ingerir.

## Consecuencias

- Cambiar un intervalo = editar `minmax_anchors.json` y re-subir por el bundle/
  metadatos (se ingiere a `hexagon_meta`).
- **Mejora futura (próximo sprint):** menú en admin para editar estos intervalos
  desde la interfaz, sin tocar el JSON a mano (ver memoria del proyecto).
