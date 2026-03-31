---
id: ADR-002
title: Resolución H3 para Colombia
status: actualizado
date: 2026-03-31
supersedes: ADR-002 (2026-03-24)
---

# ADR-002: Resolución H3 para Colombia

## Contexto

El sistema usa hexágonos H3 de Uber para discretizar el territorio colombiano. La resolución determina el tamaño de cada hexágono y por tanto la cantidad total, impactando rendimiento y nivel de detalle.

**Actualización (2026-03-31):** Los datos recibidos en `.h3.parquet` del equipo de investigación vienen a **resolución 8** (prefijo `88` en los h3_index), lo cual genera ~150K+ hexágonos. Esto invalida la suposición original de que res 5-6 sería suficiente y que el dataset cabría en memoria del navegador sin optimización.

## Opciones Evaluadas

| Resolución | Tamaño hex. | Hexágonos Colombia | Viabilidad Frontend |
|------------|------------|-------------------|---------------------|
| Res 3 | ~59 km | ~20-50 | Trivial — demasiado grande |
| Res 4 | ~22 km | ~50-100 | Trivial — granularidad insuficiente |
| Res 5 | ~8.5 km | ~100-200 | Viable para vista alejada |
| Res 6 | ~3.2 km | Cientos | Viable para vista media |
| Res 7 | ~1.2 km | Miles | Requiere optimización |
| **Res 8** | **~460 m** | **~150,000+** | **⚠️ Imposible sin tiles** |

## Decisión

**Resolución 8 como dato fuente**, con **agrupación dinámica server-side por nivel de zoom** para servir resoluciones menores en tiles.

| Zoom mapa | Resolución servida | Hexágonos por tile |
|-----------|-------------------|--------------------|
| < 5 | Res 2 | ~5-15 |
| ≥ 5 | Res 3 | ~20-50 |
| ≥ 6 | Res 4 | ~50-100 |
| ≥ 7 | Res 5 | ~100-200 |
| ≥ 8 | Res 6 | Cientos |
| ≥ 10 | Res 7 | Miles |

La agrupación usa `cellToParent()` de h3-js y promedia `score_general` de todos los hijos. Se computa server-side en el tile-server y se cachea por resolución.

## Justificación

- El equipo de investigación entrega datos a res 8 — no controlamos la resolución de entrada
- 150K+ hexágonos a res 8 crashea el navegador si se cargan de golpe (probado)
- La arquitectura tile-based (ADR-008) resuelve el rendimiento sirviendo solo los hexágonos visibles
- Al hacer zoom in, el usuario obtiene más detalle progresivamente
- Al hacer zoom out, se agrupan hexágonos con promedios — mantiene rendimiento

## Consecuencias

- ~~Frontend puede cargar todos los hexágonos de una vez~~ → Se requiere tile-server (ADR-008)
- ~~Leaflet con Canvas renderer es suficiente~~ → Se usa DeckGL TileLayer + PolygonLayer
- El servidor necesita pre-indexar los hexágonos con lat/lng para filtrar por bbox
- La agrupación por resolución se cachea server-side (una vez por resolución)
