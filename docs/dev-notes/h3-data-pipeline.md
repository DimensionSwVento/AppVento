---
version: 3.0
date: 2026-04-09
status: activo
autor: wessley - mavalan software
scope: Pipeline de datos H3 — dos modos (client-side grid + API heatmap), del parquet al render
---

# Notas de Desarrollo — Pipeline de Datos H3

## 1. Resumen

Los datos geoespaciales de Vento se originan en un archivo `.h3.parquet` de 126 MB con hexágonos H3 a resolución 8. En v2.0 se migró de un modelo monolítico (fetch completo → procesar en cliente) a una **arquitectura tile-based** donde el servidor sirve solo los hexágonos visibles en cada tile y deck.gl gestiona la carga/descarga automática.

---

## 2. Modelo de Datos — Implementado

### 2.1 Origen: `master_variables.h3.parquet`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `h3_index` (o `hex_id`) | string | Índice H3 a resolución 8 (prefijo `88`, ~460m de lado) |
| `score_general` (o `score`) | float [0-1] | Score de idoneidad general (promedio de 5 dimensiones) |
| `tipo_celda` (o `cell_type`) | string | Clasificación de la celda (default: `"activa"`) |
| *columnas numéricas adicionales* | float | Variables individuales por dimensión (no cargadas actualmente) |

**Ubicación:** `Vento/src/app/Utils/master_variables.h3.parquet` (excluido de git vía `.gitignore`)

### 2.2 Interfaces TypeScript

**Server-side (`parseH3Parquet.ts`):**
```typescript
interface H3HexagonData {
  h3_index: string;
  score_general: number;
  tipo_celda: string;
  variables: Record<string, number>;
  metadata?: Record<string, string>;
}
```

**Tile response (`h3TileIndex.ts` → API → cliente):**
```typescript
interface TileHex {
  h: string;   // h3_index (compacto)
  s: number;   // score_general
  t: string;   // tipo_celda
  la: number;  // lat
  ln: number;  // lng
}
```

**Decisión:** El payload del tile usa nombres cortos (`h`, `s`, `t`, `la`, `ln`) para reducir tamaño JSON.

### 2.3 Visualización Actual

**Map.tsx (modo esencial — cuadrícula client-side):**
- **Grid:** Transparente `[0,0,0,0]` + borde gris-azulado `[90,110,140,100]`
- **Seleccionados:** Relleno gris-azulado `[90,110,140,160]` + borde `[70,90,120,220]`
- **Sin API** — hexágonos generados con `polygonToCells(COLOMBIA_POLYGON, res)`

**HeatmapDemo.tsx (modo demo — API tiles):**
- **Positivas** (velocidad viento, densidad, score): azul → amarillo → verde (alto = bueno)
- **Negativas** (cigarrillos ilegales, zona campesina): azul → amarillo → rojo (alto = malo)
- **Seleccionados:** Azul `[0,180,255,140]`
- **Ancestor:** Azul oscuro `[15,30,100]`

---

## 3. Flujo de Datos — Implementado (Tile-Based)

```
master_variables.h3.parquet (126 MB, res 8)
         │
         ▼
  ┌──────────────────────────────────────┐
  │  GET /api/tiles/warmup               │
  │  (se llama al montar MapView)        │
  │  1. Parsea parquet con hyparquet     │
  │     (solo columnas esenciales)       │
  │  2. Almacena en h3DataCache          │
  │  3. Inicializa h3TileIndex           │
  │     (indexa lat/lng por hexágono)    │
  │  4. Retorna { status: "ready" }      │
  └──────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  GET /api/tiles/{z}/{x}/{y}          │
  │  (deck.gl TileLayer pide por tile)   │
  │  1. tileToBBox(z,x,y) → bbox        │
  │  2. zoomToH3Res(z) → resolución H3  │
  │  3. getAtResolution(res) → agrupados │
  │     (cache por resolución server)    │
  │  4. Filtra por bbox + margen 10%     │
  │  5. Retorna TileHex[] (compacto)     │
  └──────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  TileLayer (deck.gl)                 │
  │  - maxCacheSize: 64 tiles            │
  │  - maxRequests: 4 concurrentes       │
  │  - refinementStrategy: best-available│
  │  - Carga/descarga automática         │
  └──────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  renderSubLayers por tile:           │
  │  ├─ PolygonLayer (grid base)         │
  │  │  cellToBoundary(h, true) → polys  │
  │  └─ PolygonLayer (seleccionados)     │
  │     filtrados por selectedHexes Set  │
  └──────────────────────────────────────┘
```

### 3.1 Warmup: Pre-inicialización del Índice

El parseo del parquet (126 MB) tarda varios segundos. Si los tiles se piden antes de que el índice esté listo, deck.gl cancela los requests (`NS_BINDING_ABORTED`).

**Solución:** Endpoint `/api/tiles/warmup` que se llama al montar `MapView`. El overlay "... cargando mapa" se mantiene hasta que warmup responda `ready`. Solo entonces se activa la TileLayer.

### 3.2 Parseo Selectivo de Columnas (`parseH3Parquet.ts`)

```typescript
const MAP_COLUMNS = ["h3_index", "hex_id", "score_general", "score", "tipo_celda", "cell_type"];
```

Se incluyen aliases para tolerar variaciones en el esquema. `hyparquet` ignora columnas inexistentes.

### 3.3 Índice Espacial del Servidor (`h3TileIndex.ts`)

Singleton que se construye una vez tras parsear:

1. **`initTileIndex(hexagons)`** — Indexa todos los hexágonos con `cellToLatLng()` pre-computado
2. **`getAtResolution(targetRes)`** — Agrupa hexágonos a resolución H3 menor usando `cellToParent()`, promediando `score_general`. Cache por resolución (lazy).
3. **`getHexagonsForTile(z, x, y)`** — Convierte tile a bbox con `tileToBBox()`, filtra hexágonos dentro del bbox (10% margen), retorna formato compacto `TileHex[]`

### 3.4 Cinco Niveles de Cache — Implementado

| Nivel | Ubicación | Qué cachea | Duración |
|-------|-----------|-----------|----------|
| 1. `h3DataCache.ts` | Server (memoria) | Parquet parseado completo | Vida del proceso |
| 2. `h3TileIndex.ts` resolutionCache | Server (memoria) | Agrupaciones por resolución H3 | Vida del proceso |
| 3. TileLayer `maxCacheSize: 64` | Client (memoria) | Tiles renderizados por deck.gl | Sesión del mapa |
| 4. HTTP `Cache-Control: max-age=3600` | Browser cache | Responses de `/api/tiles/z/x/y` | 1 hora |
| 5. `useMemo` de tileLayer | Client (React) | Instancia de TileLayer | Hasta cambio de selección |

### 3.5 Agrupación por Resolución según Zoom

| Zoom mapa | Resolución H3 | Tamaño hexágono |
|-----------|---------------|-----------------|
| ≥ 10 | 7 | ~1.2 km |
| ≥ 8 | 6 | ~3.2 km |
| ≥ 7 | 5 | ~8.5 km |
| ≥ 6 | 4 | ~22 km |
| ≥ 5 | 3 | ~59 km |
| < 5 | 2 | ~158 km |

La agrupación ocurre **server-side** en `h3TileIndex.ts`, no en el cliente.

---

## 4. API Contracts — Implementado

### 4.1 `GET /api/tiles/warmup`

Pre-carga el índice H3 en el servidor.

**Response (200):**
```json
{ "status": "ready", "count": 150000 }
```

**Sin datos (404):**
```json
{ "status": "no_data" }
```

### 4.2 `GET /api/tiles/{z}/{x}/{y}`

Sirve hexágonos dentro de un tile específico.

**Response (200):**
```json
[
  { "h": "8466001ffffffff", "s": 0.72, "t": "activa", "la": 4.5, "ln": -73.2 },
  { "h": "8466003ffffffff", "s": 0.45, "t": "activa", "la": 4.6, "ln": -73.1 }
]
```

**Headers:** `Cache-Control: public, max-age=3600, s-maxage=3600`

**Sin datos / error:** `[]` con status 404 o 500

### 4.3 `GET /api/hexagons` (deprecado)

API monolítica anterior. Aún funcional pero ya no se usa desde el frontend.

### 4.4 `GET /api/health`

```json
{ "status": "ok", "timestamp": "2026-03-31T10:00:00.000Z" }
```

### 4.5 `GET /api/users` y `POST /api/users` (stubs)

Pendiente: integración con Keycloak Admin API.

---

## 5. Pendiente de Implementar

### 5.1 Carga de Variables Bajo Demanda

**Estado actual:** Implementado en HeatmapDemo.tsx:
- Endpoint `GET /api/tiles/detail/[h3_index]` retorna variables completas para un hexágono.
- `GET /api/tiles/variables` retorna lista de variables con rangos min/max.
- Tile response incluye `v` (valor variable filtrada) cuando se pide con `?var=nombre`.
- HexPopup muestra score + variables + H3 ID al hacer long-press.

**Pendiente para Map.tsx (esencial):**
- En fase dimensiones, usar `/api/tiles/detail/{h3}` para colorear solo los hexágonos seleccionados.

### 5.2 Validación de Integridad del Parquet (AC6)

**Pendiente:**
- Verificar conteo, rangos de score [0-1], h3_index nulos/duplicados.
- Validar en warmup o como script CI.

### 5.3 Score General: Recálculo por el Usuario

**Pendiente:**
- Definir si la app recalculará scores cuando el usuario modifique pesos de dimensiones.
- Si sí, se necesitarán columnas de scores individuales por dimensión.

### 5.4 Migración a Backend Real (Épica E6)

**Estado actual:** Todo corre en el proceso Next.js.

**Pendiente:**
- Migrar a PostgreSQL + PostGIS con H3 nativo.
- PostGIS puede servir tiles directamente con funciones H3.
- La arquitectura tile-based actual facilita la migración — solo cambia la URL de los tiles.

### 5.5 Formato Binario para Tiles

**Estado actual:** Los tiles se sirven como JSON.

**Pendiente:**
- Evaluar Float32Array o Protocol Buffers para reducir payload.
- deck.gl soporta datos binarios en `getTileData`.

### 5.6 Actualización del Parquet

**Pendiente:**
- Script Python con pandas + pyarrow para generar nuevas versiones.
- Mecanismo de invalidación del cache (reiniciar `h3TileIndex`).

---

## 6. Dependencias Técnicas

| Librería | Versión | Uso |
|----------|---------|-----|
| `hyparquet` | ^1.25.2 | Lectura de archivos .parquet en Node.js |
| `h3-js` | ^4.4.0 | `cellToParent`, `cellToLatLng`, `cellToBoundary` |
| `@deck.gl/geo-layers` | ^9.2.11 | `TileLayer` — gestión automática de tiles |
| `@deck.gl/layers` | ^9.2.11 | `PolygonLayer` — render de hexágonos como polígonos |
| `@deck.gl/react` | ^9.2.11 | Integración React de DeckGL |
| `maplibre-gl` | ^5.21.1 | Mapa base (tiles CartoDB Positron) |
| `@luma.gl/webgl` | - | Adaptador WebGL2 para DeckGL |

---

## 7. Archivos Involucrados

| Archivo | Estado | Responsabilidad |
|---------|--------|----------------|
| `Utils/master_variables.h3.parquet` | Dato fuente | 126 MB, hexágonos H3 res 8 (excluido de git) |
| `Utils/parseH3Parquet.ts` | Implementado | Parseo selectivo de columnas con hyparquet |
| `Utils/h3DataCache.ts` | Implementado (temporal) | Cache en memoria del parquet parseado |
| `Utils/h3TileIndex.ts` | Implementado | Índice espacial, agrupación por resolución, filtro por bbox |
| `Utils/h3Resolution.ts` | Implementado | Constantes del mapa (INITIAL_VIEW_STATE, MAX_BOUNDS, etc.) |
| `api/tiles/warmup/route.ts` | Implementado | Pre-carga del índice antes de servir tiles |
| `api/tiles/[z]/[x]/[y]/route.ts` | Implementado | API tile-server: sirve hexágonos por tile |
| `api/hexagons/route.ts` | Deprecado | API monolítica anterior (aún funcional) |
| `Components/Map.tsx` | Implementado | Cuadrícula client-side (polygonToCells + COLOMBIA_POLYGON) + selección |
| `Components/HeatmapDemo.tsx` | Implementado (demo) | TileLayer API + heatmap colores pos/neg + leyenda + selector + popup |
