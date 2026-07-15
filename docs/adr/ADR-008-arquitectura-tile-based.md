---
id: ADR-008
title: Arquitectura Tile-Based para Renderizado de Hexágonos H3
status: aceptado
date: 2026-03-31
---

# ADR-008: Arquitectura Tile-Based para Renderizado de Hexágonos H3

## Contexto

El dataset de hexágonos H3 de Colombia llega a resolución 8 (~150K+ hexágonos, 126 MB en .parquet). Los intentos de renderizar todos los hexágonos de una vez causaron:

1. **Crash del navegador** — H3HexagonLayer con ~150K hexágonos agota memoria GPU
2. **`Maximum call stack size exceeded`** — Spread operator con arrays grandes al parsear
3. **UI congelada** — `buildResolutionCache` bloqueaba el thread principal por segundos
4. **`NS_BINDING_ABORTED`** — deck.gl cancelaba requests antes de que el parseo del parquet terminara
5. **`maxTextureDimension2D` undefined** — Device WebGL no disponible en SSR

Estos problemas se intentaron resolver con: `filterByViewport`, `requestAnimationFrame`, cache de resoluciones, `dynamic({ ssr: false })`. Ninguna combinación logró rendimiento aceptable con el dataset completo.

## Decisión

**Migrar de carga monolítica a arquitectura tile-based** usando `TileLayer` de deck.gl + API tile-server.

### Arquitectura Anterior (Descartada)

```
Parquet 126MB → API monolítica → JSON completo al cliente
  → buildResolutionCache (7 niveles, thread principal)
  → filterByViewport (cada pan/zoom)
  → H3HexagonLayer (todos los visibles al GPU)
```

**Problemas:** Carga inicial de 126MB, agrupación bloqueante, re-cómputo en cada movimiento.

### Arquitectura Actual (Tile-Based)

```
Parquet 126MB → warmup (parseo una vez) → índice espacial server-side
  → TileLayer pide /api/tiles/{z}/{x}/{y}
  → Server filtra por bbox + agrupa por resolución (cacheado)
  → PolygonLayer renderiza solo el tile visible
  → deck.gl gestiona carga/descarga automática
```

### Componentes

| Componente | Responsabilidad |
|-----------|-----------------|
| `TileLayer` (deck.gl) | Determina qué tiles son visibles, gestiona requests, cache de 64 tiles |
| `PolygonLayer` (deck.gl) | Renderiza hexágonos como polígonos WebGL (sublayer de cada tile) |
| `cellToBoundary()` (h3-js) | Convierte H3 index a polígono de coordenadas para PolygonLayer |
| `/api/tiles/{z}/{x}/{y}` | Sirve hexágonos filtrados por bbox del tile, agrupados por resolución |
| `/api/tiles/warmup` | Pre-parsea el parquet y construye el índice antes de servir tiles |
| `h3TileIndex.ts` | Índice espacial: tileToBBox, zoomToH3Res, getAtResolution, filtro por bbox |

### ¿Por qué PolygonLayer y no H3HexagonLayer?

`H3HexagonLayer` es un `CompositeLayer` que no puede usarse como sublayer dentro de `TileLayer` (también `CompositeLayer`). `PolygonLayer` es un layer primitivo compatible con `renderSubLayers`.

La conversión `H3 index → polígono` se hace con `cellToBoundary(h3Index, true)` de h3-js directamente en el frontend.

## Configuración TileLayer

```typescript
new TileLayer({
  data: "/api/tiles/{z}/{x}/{y}",
  minZoom: 2,
  maxZoom: 10,
  tileSize: 512,
  maxCacheSize: 64,        // máximo tiles en memoria
  maxRequests: 4,           // requests concurrentes al servidor
  refinementStrategy: "best-available",  // muestra tile de zoom cercano mientras carga
})
```

## Justificación

| Principio | Cómo se aplica |
|-----------|---------------|
| Solo tiles visibles | TileLayer carga/descarga automáticamente según viewport |
| Límites de concurrencia | `maxRequests: 4` evita saturar servidor |
| Agrupación server-side | Resolución H3 se computa en el servidor, no en el cliente |
| Cache con límite | `maxCacheSize: 64` + HTTP `Cache-Control: max-age=3600` |
| Memoización | `useMemo` en tileLayer para no recrear la capa en cada render |
| LOD por zoom | Zoom bajo → res 2-3 (pocos hex grandes), zoom alto → res 7 (muchos hex pequeños) |

## Consecuencias

- El frontend ya no descarga el dataset completo — solo tiles visibles
- Se requiere un servidor (FastAPI en producción, Next.js API routes en dev) para servir tiles
- `next export` no puede tener API routes — confirma la necesidad de FastAPI (ADR-007)
- El parseo del parquet ocurre una vez en el servidor (warmup), no en cada request
- La agrupación por resolución se cachea server-side — cambios de zoom son instantáneos
- La selección de hexágonos funciona via `onClick` en PolygonLayer + `selectedHexes` en contexto global

## Relación con Otros ADRs

| ADR | Relación |
|-----|----------|
| ADR-001 | Confirma deck.gl + MapLibre, pero reemplaza H3HexagonLayer por TileLayer+PolygonLayer |
| ADR-002 | Los datos son res 8, tile-server agrupa dinámicamente según zoom |
| ADR-006 | Tile-based es la estrategia de entrega de datos confirmada |
| ADR-007 | FastAPI implementa el tile-server en producción |
