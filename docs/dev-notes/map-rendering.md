---
version: 2.0
date: 2026-03-31
status: activo
autor: wessley - mavalan software
scope: Mapa SIG — Gestión de recursos GPU, tile-based rendering y rendimiento
---

# Notas de Desarrollo — Renderizado del Mapa y Gestión de Recursos

## 1. Contexto

Vento utiliza DeckGL + MapLibre para un mapa SIG interactivo con hexágonos H3. DeckGL opera con un **device WebGL** que renderiza directamente en la GPU. En v2.0 se migró a una arquitectura **tile-based** para resolver problemas de rendimiento con el dataset de 126 MB.

### 1.1 Problemas Resueltos en v2.0

| Problema | Causa | Solución |
|----------|-------|----------|
| `maxTextureDimension2D` undefined | Device WebGL no listo en SSR | `dynamic({ ssr: false })` en dashboard |
| Error de hidratación SSR/CSR | MapView se renderizaba en servidor | `dynamic({ ssr: false })` |
| Mapa crashea con todos los hexágonos | ~150K hexágonos res 8 de golpe | Arquitectura tile-based |
| `NS_BINDING_ABORTED` | Parseo lento, deck.gl cancela requests | Endpoint `/api/tiles/warmup` |
| `Maximum call stack size exceeded` | Spread operator con arrays grandes | Eliminado con arquitectura tile |

---

## 2. Arquitectura Tile-Based — Implementado

### 2.1 Principios Aplicados

1. **Solo tiles visibles** — deck.gl `TileLayer` carga/descarga tiles automáticamente según viewport
2. **Límites de concurrencia** — `maxRequests: 4`, `maxCacheSize: 64`
3. **Agrupación server-side** — Resolución H3 por zoom se computa en el servidor, no en el cliente
4. **Memoización** — `useMemo` en `tileLayer` para no recrear la capa en cada render
5. **Warmup** — Pre-cargar índice antes de activar tiles

### 2.2 Componente MapView — Estructura

```
MapView (dynamic import, ssr: false)
  ├─ Estado: viewState, mapReady, dataReady, mapState, selectedHexes
  ├─ useEffect: warmup + fullscreen listener
  ├─ useEffect: freeze/unfreeze por fase
  ├─ useMemo: tileLayer (TileLayer + PolygonLayer)
  └─ Render:
       ├─ Overlay "... cargando mapa" (while !mapReady || !dataReady)
       ├─ Snapshot congelado (if frozen)
       └─ DeckGL + MapGL (siempre montado para onLoad)
            ├─ TileLayer (solo si dataReady)
            │    ├─ PolygonLayer grid (todos los hex del tile)
            │    └─ PolygonLayer selected (hex seleccionados)
            └─ MapGL (CartoDB Positron, maxBounds Sudamérica)
```

### 2.3 Rendering Pipeline

```
Usuario mueve/zoom el mapa
         │
         ▼
DeckGL detecta tiles visibles nuevos
         │
         ▼
TileLayer.getTileData(z, x, y)
  → fetch /api/tiles/z/x/y
  → servidor filtra hexágonos por bbox
  → retorna TileHex[] (JSON compacto)
         │
         ▼
TileLayer.renderSubLayers(tileData)
  → PolygonLayer grid: cellToBoundary(h, true) → polígonos WebGL
  → PolygonLayer selected: solo hex en selectedHexes Set
         │
         ▼
GPU renderiza polígonos (fill + stroke)
```

---

## 3. Ciclo de Vida del Mapa por Fase — Implementado

| Fase | Estado del Mapa | Recursos GPU |
|--------------------|---------------------|--------------|
| `seleccion-area` | Activo (interactivo) | En uso |
| `dimensiones` | Congelado (snapshot) | Liberados |
| `caracteristicas` | Congelado (snapshot) | Liberados |
| `informe` | Congelado (snapshot) | Liberados |

### 3.1 Proceso de Freeze/Unfreeze

**Congelar** (al salir de `seleccion-area`):
1. Obtener todos los `<canvas>` del contenedor (MapLibre + DeckGL)
2. Componer en un canvas temporal (base map primero, hexágonos después)
3. Convertir a `dataURI` PNG
4. Almacenar en Cache API vía `useCachedImage`
5. Mostrar imagen estática, DeckGL deja de renderizar

**Descongelar** (al volver a `seleccion-area`):
1. Limpiar Cache API y revocar `objectURL`
2. Restaurar mapa interactivo con estado de vista preservado

---

## 4. Selección de Hexágonos — Implementado

### 4.1 Mecanismo

- Click en hexágono → `toggleHex(h3Index)` → toggle en `selectedHexes` Set
- `selectedHexes` vive en `AccionPrincipalContext` (compartido con SideBar)
- DeckGL distingue click de drag internamente — no interfiere con pan

### 4.2 Render de Selección

Cada tile renderiza dos sub-layers:
1. **Grid base** — Todos los hexágonos, relleno gris transparente `[180,180,180,25]`, pickable
2. **Seleccionados** — Solo hex en `selectedHexes`, relleno azul `[0,180,255,140]`, no pickable

`updateTriggers.renderSubLayers: [selectedHexes.size]` fuerza re-render de sublayers cuando cambia la selección.

---

## 5. Gestión de Carga — Implementado

### 5.1 Secuencia de Inicialización

```
1. Dashboard monta MapView (dynamic, ssr: false)
2. MapGL empieza a cargar tiles base
3. useEffect llama GET /api/tiles/warmup
   → Servidor parsea parquet + construye índice
4. MapGL dispara onLoad → setMapReady(true)
5. Warmup responde "ready" → setDataReady(true)
6. loading = false → overlay desaparece, botones visibles
7. TileLayer se activa (layers={dataReady ? [tileLayer] : []})
8. Tiles H3 empiezan a cargarse por viewport
```

### 5.2 ¿Por qué no H3HexagonLayer?

`H3HexagonLayer` es un `CompositeLayer` que no puede usarse dentro de `TileLayer` (también `CompositeLayer`). Se usa `PolygonLayer` + `cellToBoundary()` de h3-js para convertir cada H3 index a polígono de coordenadas.

---

## 6. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Acumulación de tiles en memoria | `maxCacheSize: 64` limita tiles cacheados |
| Requests concurrentes saturan servidor | `maxRequests: 4` limita peticiones simultáneas |
| Warmup tarda y usuario ve mapa vacío | Overlay "... cargando mapa" hasta warmup + onLoad |
| Snapshot no se limpia al descongelar | `clearCache()` + `URL.revokeObjectURL()` en unfreeze |
| `preserveDrawingBuffer` consume memoria | Solo activo en canvas de MapLibre para snapshot |

---

## 7. Archivos Involucrados

| Archivo | Responsabilidad |
|---------|----------------|
| `Components/Map.tsx` | TileLayer + PolygonLayer, selección, freeze/unfreeze, warmup |
| `Utils/h3TileIndex.ts` | Índice espacial server-side, bbox filtering, agrupación por res |
| `Utils/h3Resolution.ts` | Constantes: INITIAL_VIEW_STATE, MAX_BOUNDS, MAP_STYLE, SNAPSHOT_KEY |
| `Utils/useCachedImage.ts` | Hook para snapshot en Cache API del navegador |
| `Utils/AccionPrincipalContext.tsx` | Estado global: accion, selectedHexes |
| `api/tiles/warmup/route.ts` | Pre-carga del índice H3 |
| `api/tiles/[z]/[x]/[y]/route.ts` | API tile-server |
| `dashboard/page.tsx` | Dynamic import de MapView (ssr: false) |
