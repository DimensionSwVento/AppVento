---
id: ADR-014
title: Validación per-tile con Point-in-Polygon en lugar de cache global de cells Colombia
status: aceptado
date: 2026-05-28
relacionado_con: ADR-008
---

# ADR-014: Validación per-tile con point-in-polygon en lugar de cache global de cells Colombia

## Contexto

`Map.tsx` renderiza la cuadrícula H3 sobre Colombia con `TileLayer` (ADR-008). Para que un hex de un tile aparezca, hay que validar que pertenezca a Colombia (no al mar ni a territorio vecino). La implementación anterior usaba un **cache global por resolución**:

```ts
const colombiaCellsSetCache = new Map<number, Set<string>>();

function getColombiaCellsSet(resolution: number): Set<string> {
  // Computa polygonToCells(COLOMBIA_POLYGONS, res) UNA vez, cachea el Set.
  ...
}

// En getTileData:
const colombiaSet = getColombiaCellsSet(res); // ← primera vez: pesado
for (const h of tileCells) {
  if (colombiaSet.has(h)) result.push({ h });
}
```

### Síntomas observados

- **Primer zoom a res 7-8 disparaba CPU spike**: `polygonToCells(COLOMBIA, 8)` produce ~840.000 cells de un solo síncrono → bloqueo del main thread de hasta 3 s en res 8.
- **Memoria**: pre-computar res 3-8 mantenía ~100 MB en heap, mayormente strings de hex IDs de zonas que el usuario nunca vería (interior del país lejano al área de interés).
- **Violación del principio "sólo lo visible"**: el cache global computaba TODAS las cells de Colombia aunque el usuario sólo iba a ver un corregimiento.

### Intentos previos

1. **Cache de `{h, lat, lng}[]`** (vsesión original): aún peor — además del set se mantenía lat/lng pre-calculados y `getTileData` iteraba la lista completa por tile. ~840k × N tiles = 10-15M operaciones síncronas.
2. **Pre-warm en idle** (propuesto, rechazado): trasladar el costo a `requestIdleCallback`. Reduce el spike pero igual computa millones de cells "por si acaso", contradiciendo "sólo lo visible".
3. **Cache global con `Set<string>`** (la implementación actual previa al ADR): mejora vs (1) porque elimina `{h, lat, lng}`. Pero sigue pagando los ~840k cells la primera vez que se accede a esa resolución.

## Decisión

**Eliminar el cache global de cells de Colombia. Validar cada cell del tile con point-in-polygon (ray casting) contra `COLOMBIA_POLYGONS` en el momento del compute del tile.**

```ts
function pointInRing(lat, lng, ring: [number, number][]): boolean { /* ray casting */ }

function isInColombia(lat, lng): boolean {
  for (const polygon of COLOMBIA_POLYGONS) {
    if (pointInRing(lat, lng, polygon)) return true;
  }
  return false;
}

// En getTileData (per-tile):
const tileCells = polygonToCells(tileBBoxPolygon, res, true);
for (const h of tileCells) {
  const [lat, lng] = cellToLatLng(h);
  if (isInColombia(lat, lng)) result.push({ h });
}
```

### Cómo respeta "sólo lo visible"

- Cada tile compute sólo sus cells (`polygonToCells(tileBBox)`)
- Validación point-in-polygon corre por cell, sólo sobre las cells del tile (~miles)
- No se pre-computa ni se cachea nada global
- Áreas no visitadas nunca pagan cómputo
- DeckGL `maxCacheSize: 64` sigue cacheando el RESULTADO de cada tile (no se duplica trabajo en re-visitas)

## Consecuencias

### Positivas

| Métrica | Antes (cache global) | Después (per-tile) |
|---|---|---|
| Primer tile en res 8 | Computa 840.000 cells de Colombia | Computa ~3.000 cells del bbox del tile + ~3.000 point-in-polygon checks |
| Bloqueo del main thread en primer zoom a res 7-8 | 500 ms - 3 s | 10-15 ms por tile (4 en paralelo → ~50 ms wall-time) |
| Memoria de caches | ~100 MB (todas las res) o ~85 MB (sólo res 8) | ~0 (sin estado global) |
| Hex en zonas no visitadas | Computado y guardado en memoria | Nunca computado |
| Re-visita del mismo tile | Free (set ya en memoria) | Free (DeckGL cache devuelve el resultado del tile) |

### Negativas

- **Costo por cell ligeramente mayor**: cada cell hace point-in-polygon (~N × M operaciones donde N = vertices de los polygons de Colombia, M = polygons en `COLOMBIA_POLYGONS`). Para los ~30 vertices actuales y 2 polygons (continente + archipiélago): ~60 operaciones por cell. Comparado con `set.has(h)` que era O(1).
- **Sensibilidad a precision del polígono de Colombia**: si `COLOMBIA_POLYGONS` cambia (ej. al integrar IGAC oficial con más vertices), el costo por cell sube proporcionalmente. A 100 vertices = ~200 ops/cell, ~600k ops/tile, ~10-15ms/tile (todavía manejable).
- **No hay "warm cache" de resoluciones**: si quisiera pre-procesar resoluciones en idle como mejora futura, esta arquitectura no aplica directo. Habría que pre-procesar tiles específicos, no resoluciones enteras.

### Tradeoffs aceptados

- Aceptamos un costo per-cell ligeramente mayor (de O(1) lookup a O(vertices) point-in-polygon) a cambio de eliminar un costo upfront masivo (~840k cells síncronos).
- Aceptamos que tile-by-tile sigue siendo el único cache (vía DeckGL `maxCacheSize: 64`), suficiente para el patrón de uso real.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| Cache global de Colombia por resolución | Causa el spike que se busca eliminar |
| Cache global pre-calentado en idle (`requestIdleCallback`) | Mitiga el spike pero contradice "sólo lo visible" — compute millones de cells "por si acaso" |
| Spatial index (R-tree / quadtree) sobre Colombia | Más rápido que point-in-polygon en consulta pero requiere lib externa + setup; el costo per-cell actual es manejable sin lib |
| Saltar la validación (renderizar todos los cells del tile bbox) | Mostraría hexes sobre el mar y países vecinos; rompe UX |

## Impacto en otros documentos

- **ADR-008** (Arquitectura Tile-Based): este ADR es una optimización del cómputo per-tile dentro del marco de ADR-008. No lo invalida; lo refina.
- **dev-notes/map-rendering.md**: actualizar sección 2.2 (Map.tsx — Estructura) para describir el nuevo `getTileData` y eliminar referencias a "cache por tile" que aludían al cache global de Colombia.
- **dev-notes/libraries-and-apis.md** (sección h3-js): añadir nota de uso de `polygonToCells` per-tile + helper local `pointInRing`/`isInColombia`.

## Notas de implementación

- `pointInRing` está en `Vento/src/app/Components/Map.tsx` (local al archivo; no se exporta porque el formato esperado de `ring` es `[lng, lat][]` igual que `COLOMBIA_POLYGONS`).
- Si más adelante se necesita reutilizar point-in-polygon en otro componente, mover a `Vento/src/app/Utils/geo.ts` o similar.
- Si `COLOMBIA_POLYGONS` crece a polígonos muy complejos (cientos-miles de vertices), reconsiderar spatial index.
