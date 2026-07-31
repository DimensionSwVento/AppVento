---
title: Búsqueda en el mapa — animación de cámara y caché de tiles
date: 2026-05-28
audience: dev
---

# Búsqueda en el mapa: por qué el `flyTo` se anima en vez de saltar

## Síntoma observado

Si el `<MapSearchBox>` aplica `setViewState({ latitude, longitude, zoom })` directamente con el destino del corregimiento (salto instantáneo), el navegador se sobrecarga:

- El `TileLayer` de DeckGL detecta que los tiles visibles del destino no están en caché y los pide TODOS a la vez
- Si el salto es grande (ej. zoom 5 → 12, atravesando varios niveles H3), las peticiones se acumulan y el frame queda bloqueado mientras WebGL prepara los recursos
- En máquinas modestas o con red lenta, esto puede llegar a colgar la pestaña

## Por qué arrastrar funciona bien

Cuando el usuario arrastra el mapa, la cámara se mueve en pasos pequeños frame a frame. El `TileLayer` con `refinementStrategy: "best-available"`:

- Aprovecha tiles ya cacheados en pantalla (los que están entrando desde el borde)
- Pide tiles nuevos en lotes pequeños, uno o dos por frame
- Los tiles fuera de viewport se mantienen en cache hasta que el `maxCacheSize` los expulse

Resultado: arrastrar nunca dispara una avalancha de peticiones simultáneas.

## Solución implementada

En vez de `setViewState` directo, el handler `handlePlaceSelect` de `Map.tsx` aplica una animación con `LinearInterpolator` de `@deck.gl/core`:

```ts
import { LinearInterpolator } from "@deck.gl/core";

const SEARCH_FLY_DURATION_MS = 2000; // ~velocidad de arrastre

setViewState({
  ...current,
  latitude, longitude, zoom,
  transitionDuration: SEARCH_FLY_DURATION_MS,
  transitionInterpolator: new LinearInterpolator(["longitude", "latitude", "zoom"]),
});
```

Esto hace que la cámara se mueva linealmente en ~2 segundos. DeckGL emite `onViewStateChange` con valores intermedios, el `TileLayer` los procesa como si fuera un arrastre, y los tiles entran progresivamente sin sobrecargar.

### Por qué `LinearInterpolator` y no `FlyToInterpolator`

- `FlyToInterpolator` hace un movimiento tipo "Google Earth" (zoom out → pan → zoom in). Bonito pero confunde al usuario en distancias cortas y carga muchos tiles del zoom alto al inicio.
- `LinearInterpolator` mantiene la cámara siempre cerca del trazo recto entre origen y destino, lo más parecido posible a un arrastre.

### Duración 2000 ms

- Elegida empíricamente para que se sienta "rápido pero no salto"
- Configurable vía `SEARCH_FLY_DURATION_MS` en `Map.tsx` (handler `handlePlaceSelect`)
- Si los usuarios reportan que es lento, bajar a 1500. Si reportan glitches de tiles, subir a 2500.

## Efecto colateral: deselección de hexes durante la animación

`Map.tsx` tiene un `useEffect` que deselecciona los hexes que vinieron de la búsqueda cuando el usuario cambia de resolución H3 (ver `searchHexesRef` + `searchH3ResRef`). Durante la animación del flyTo, el zoom intermedio cruza varias resoluciones H3 (ej. res 3 → 5 → 7 → 8), lo que dispararía la deselección antes de tiempo.

**Mitigación**: `isSearchAnimatingRef` se pone en `true` antes del `setViewState` animado y se limpia con `setTimeout` después de `SEARCH_FLY_DURATION_MS + 100 ms`. La `useEffect` de deselección consulta el ref y se salta el chequeo mientras esté activo.

## Cuándo revisar este patrón

- Si el cliente quiere que la animación sea más rápida o instantánea: ajustar `SEARCH_FLY_DURATION_MS`. Por debajo de ~800 ms puede volver a aparecer el síntoma de sobrecarga.
- Si se añaden más entradas de cámara controladas (ej. "centrar en mi ubicación", "ir al área seleccionada"): reusar el mismo patrón con un helper común.
- Si se actualiza `@deck.gl/core` a una versión donde `LinearInterpolator` cambia su API: validar tipos y comportamiento.
