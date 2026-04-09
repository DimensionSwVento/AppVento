---
version: 3.0
date: 2026-04-09
status: activo
autor: wessley - mavalan software
scope: Mapa SIG — Dos modos de renderizado (esencial + demo), gestión GPU y rendimiento
---

# Notas de Desarrollo — Renderizado del Mapa y Gestión de Recursos

## 1. Contexto

Vento utiliza DeckGL + MapLibre para un mapa SIG interactivo con hexágonos H3. En v3.0 se separó el mapa en dos componentes:

- **`Map.tsx`** (esencial/contrato): cuadrícula H3 client-side sobre Colombia, sin API, solo selección.
- **`HeatmapDemo.tsx`** (features demo): heatmap con API tiles, leyenda, selector variables, popup, freeze.

### 1.1 Problemas Resueltos

| Problema | Causa | Solución |
|----------|-------|----------|
| `maxTextureDimension2D` undefined | Device WebGL no listo en SSR | `"use client"` + import directo (no dynamic) |
| Error de hidratación SSR/CSR | MapView se renderizaba en servidor | `"use client"` directiva |
| Mapa crashea con todos los hexágonos | ~150K hexágonos res 8 de golpe | TileLayer tile-based |
| `dynamic()` rompe rendering | useEffect no ejecuta con next/dynamic | Import directo confirmado |
| Zoom lento con PolygonLayer monolítico | Toda Colombia renderizada de golpe | TileLayer client-side con `polygonToCells` + cache por tile |

---

## 2. Arquitectura Tile-Based — Implementado

### 2.1 Principios Aplicados

1. **Solo tiles visibles** — deck.gl `TileLayer` carga/descarga tiles automáticamente según viewport
2. **Límites de concurrencia** — `maxRequests: 4`, `maxCacheSize: 64`
3. **Agrupación server-side** — Resolución H3 por zoom se computa en el servidor, no en el cliente
4. **Memoización** — `useMemo` en `tileLayer` para no recrear la capa en cada render
5. **Warmup** — Pre-cargar índice antes de activar tiles

### 2.2 Map.tsx (Esencial) — Estructura

```
MapView (import directo, "use client")
  ├─ Estado: viewState, mapReady, fullscreen, selectedHexes
  ├─ useMemo: gridTileLayer (TileLayer client-side con polygonToCells)
  ├─ useMemo: selectedLayer (PolygonLayer top-level)
  └─ Render:
       ├─ Overlay "... cargando mapa" (while !mapReady)
       ├─ Zoom +/- y fullscreen (siempre visibles)
       └─ DeckGL + MapGL
            ├─ gridTileLayer (cuadrícula Colombia, transparente, clickeable)
            ├─ selectedLayer (hexágonos seleccionados, gris-azulado)
            └─ MapGL (CartoDB Positron, bounds Colombia)
```

### 2.3 HeatmapDemo.tsx (Features Demo) — Estructura

```
HeatmapDemo (import directo, "use client")
  ├─ Estado: viewState, mapReady, dataReady, mapState, activeVar, varRange, popup, layerCounts
  ├─ useEffect: warmup API + fullscreen
  ├─ useEffect: fetch counts + fetch variables
  ├─ useEffect: freeze/unfreeze por fase
  ├─ useMemo: tileLayer (TileLayer via API con heatmap colores pos/neg)
  └─ Render:
       ├─ Overlay "... cargando mapa"
       ├─ Snapshot congelado (if frozen)
       ├─ VariableSelector + Congelar + Leyenda dinámica + LayerInfo
       └─ DeckGL + MapGL
            ├─ TileLayer (API /api/tiles/{z}/{x}/{y})
            │    ├─ PolygonLayer grid (coloreado por score/variable pos/neg)
            │    ├─ PolygonLayer ancestor (azul oscuro)
            │    └─ PolygonLayer selected (azul)
            └─ MapGL (CartoDB Positron)
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

**Map.tsx (esencial):**
- **Grid cuadrícula** — Transparente `[0,0,0,0]` + borde gris-azulado `[90,110,140,100]`, pickable
- **Seleccionados** — Relleno gris-azulado `[90,110,140,160]` + borde `[70,90,120,220]`, top-level layer

**HeatmapDemo.tsx (demo):**
- **Grid heatmap** — Coloreado por score (positivas: azul→amarillo→verde, negativas: azul→amarillo→rojo)
- **Ancestor** — Azul oscuro `[15,30,100]` para hexágonos con hijos seleccionados
- **Seleccionados** — Azul `[0,180,255,140]`

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
| `Components/Map.tsx` | Cuadrícula client-side (polygonToCells + COLOMBIA_POLYGON) + selección. Sin API |
| `Components/HeatmapDemo.tsx` | Features demo: TileLayer via API, heatmap, leyenda, selector, popup, freeze |
| `Utils/h3TileIndex.ts` | Índice espacial server-side, bbox filtering, agrupación por res (usado por HeatmapDemo) |
| `Utils/h3Resolution.ts` | Constantes: INITIAL_VIEW_STATE, MAX_BOUNDS, COLOMBIA_POLYGON, SNAPSHOT_KEY |
| `Utils/useCachedImage.ts` | Hook para snapshot en Cache API del navegador (usado por HeatmapDemo) |
| `Utils/AccionPrincipalContext.tsx` | Estado global: accion, selectedHexes |
| `api/tiles/warmup/route.ts` | Pre-carga del índice H3 (usado por HeatmapDemo) |
| `api/tiles/[z]/[x]/[y]/route.ts` | API tile-server (usado por HeatmapDemo) |
| `dashboard/page.tsx` | Import directo de MapView (sin dynamic) |
