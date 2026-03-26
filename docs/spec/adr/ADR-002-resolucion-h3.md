---
id: ADR-002
title: Resolución H3 para Colombia
status: propuesto
date: 2026-03-24
---

# ADR-002: Resolución H3 para Colombia

## Contexto

El sistema usa hexágonos H3 de Uber para discretizar el territorio colombiano. La resolución determina el tamaño de cada hexágono y por tanto la cantidad total, impactando rendimiento y nivel de detalle.

Los datos recibidos en .parquet vienen para reconstruir regiones o zonas, NO para precisión a nivel de metros.

## Opciones

| Resolución | Tamaño hex. | Hexágonos Colombia | Viabilidad Frontend |
|------------|------------|-------------------|---------------------|
| Res 3 | ~12,000 km² | ~100 | Trivial — demasiado grande, sin utilidad |
| Res 4 | ~1,700 km² | ~670 | Trivial — granularidad insuficiente |
| **Res 5** | **~250 km²** | **~4,500** | **✅ Óptimo para nivel zonal** |
| **Res 6** | **~36 km²** | **~31,000** | **✅ Viable, nivel sub-regional** |
| Res 7 | ~5 km² | ~220,000 | ⚠️ Requiere optimización WebGL |

## Decisión

**Resolución 5 o 6** según los datos .parquet recibidos. La resolución exacta viene determinada por el `h3_index` presente en los archivos .parquet del equipo de investigación.

## Justificación

- El alcance es zonal/regional, no de precisión métrica
- 4,500-31,000 hexágonos es manejable sin tiles vectoriales, streaming ni WebGL pesado
- El dataset completo de Colombia cabe en memoria del navegador a esta resolución
- Permite carga completa de datos sin paginación

## Consecuencias

- Frontend puede cargar todos los hexágonos de una vez (sin lazy loading complejo)
- Leaflet con Canvas renderer es suficiente
- Si el equipo de investigación genera datos a resolución más alta, se necesitaría reevaluar
