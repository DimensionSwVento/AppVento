---
version: 1.0
date: 2026-03-30
status: activo
autor: wessley - mavalan software
scope: Mapa SIG — Gestión de recursos GPU, navegación y rendimiento H3
---

# Notas de Desarrollo — Renderizado del Mapa y Gestión de Recursos

## 1. Contexto del Problema

La aplicación Vento utiliza DeckGL + MapLibre para renderizar un mapa SIG interactivo con una capa de hexágonos H3 (resolución 8). DeckGL opera creando un **device WebGL** que renderiza directamente en la GPU del navegador a través de un elemento `<canvas>`. Esto implica que:

- Los recursos de GPU se reservan mientras el componente exista en el DOM.
- Múltiples capas o datos masivos saturan la memoria de video (VRAM).
- El device WebGL puede no estar disponible inmediatamente al montar el componente (error `maxTextureDimension2D`).

## 2. Arquitectura de Navegación y Ciclo de Vida del Mapa

### 2.1 Navegación por Estado Global

El dashboard maneja un estado global (`AccionPrincipalContext`) que controla la subpágina activa:

```
seleccion-area → dimensiones → caracteristicas → informe
```

- El `SideBar` controla la navegación: avance secuencial, retroceso libre.
- La subpágina seleccionada se renderiza como `children` del SideBar, al lado del mapa.
- El mapa (`MapView`) siempre está montado en el DOM del dashboard.

### 2.2 Ciclo de Vida del Mapa por Fase

| Fase               | Estado del Mapa     | Recursos GPU |
|--------------------|---------------------|--------------|
| `seleccion-area`   | Activo (interactivo) | En uso       |
| `dimensiones`      | Congelado (snapshot) | Liberados    |
| `caracteristicas`  | Congelado (snapshot) | Liberados    |
| `informe`          | Congelado (snapshot) | Liberados    |

**Decisión:** Cuando el usuario sale de `seleccion-area`, se captura un snapshot compuesto de todos los canvases (MapLibre base + DeckGL hexágonos), se almacena en Cache API y se reemplaza el mapa interactivo por una imagen estática.

## 3. Gestión del Snapshot y Cache de Canvas

### 3.1 Proceso de Congelamiento

1. Se obtienen todos los `<canvas>` del contenedor del mapa.
2. Se componen en un canvas temporal (base map primero, hexágonos después).
3. Se convierte a `dataURI` formato PNG.
4. Se almacena en Cache API (`vento-map-snapshots`) vía `useCachedImage`.
5. Se muestra la imagen estática y se destruye el renderizado activo.

### 3.2 Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Acumulación de snapshots en Cache API | `clearCache()` elimina la entrada anterior antes de guardar una nueva. Revocar `objectURL` al limpiar. |
| Canvas temporal no liberado | El canvas compuesto es una variable local — el GC lo recoge al salir del scope de `freeze()`. |
| `preserveDrawingBuffer` consume memoria extra | Necesario para capturar el canvas de MapLibre. Solo activo mientras el mapa está en modo `active`. |
| Snapshot desactualizado al reactivar | Al descongelar (`unfreeze`), se limpia el cache y se restaura el mapa interactivo con el estado de vista preservado. |

### 3.3 Registro de Adaptadores WebGL

```typescript
try {
  luma.registerAdapters([webgl2Adapter]);
} catch {
  // device no disponible aún — DeckGL reintenta al montar
}
```

El `try-catch` es necesario porque en SSR o en montaje inicial el contexto WebGL puede no existir. DeckGL resuelve internamente al crear su propio contexto.

## 4. Rendimiento con Datos H3 Masivos

### 4.1 El Problema

El archivo `master_variables.h3.parquet` tiene **126 MB** con hexágonos a resolución 8 (~460m de lado). Renderizar todos los hexágonos simultáneamente:

- **Crashea el navegador** por exceso de geometría enviada al GPU.
- **Satura la memoria** si se deserializa el parquet completo con todas las columnas.
- El spread operator (`...data`) con arrays grandes causa `Maximum call stack size exceeded`.

### 4.2 Estrategia de Rendimiento: Lectura Selectiva de Columnas

En la API route (`/api/hexagons`), `hyparquet` lee solo las columnas necesarias para el mapa:

```typescript
columns: ["h3_index", "hex_id", "score_general", "score", "tipo_celda", "cell_type"]
```

Las columnas de variables numéricas adicionales (decenas de métricas) se excluyen del payload inicial. Se cargarán bajo demanda cuando el usuario inspeccione un hexágono específico.

### 4.3 Estrategia de Rendimiento: Agrupación por Resolución

Se pre-computan **7 niveles de agrupación** (res 2 a res 8) una sola vez cuando llegan los datos:

```
Zoom ≥ 10 → Res 7  (hexágonos ~1.2 km)
Zoom ≥ 8  → Res 6  (hexágonos ~3.2 km)
Zoom ≥ 7  → Res 5  (hexágonos ~8.5 km)
Zoom ≥ 6  → Res 4  (hexágonos ~22 km)
Zoom ≥ 5  → Res 3  (hexágonos ~59 km)
Zoom < 5  → Res 2  (hexágonos ~158 km)
```

Cada nivel padre se calcula con `cellToParent()` desde los datos originales (res 8), y el `score_general` se **promedia** entre todos los hijos que pertenecen a ese padre.

**Costo:** La pre-computación ocurre una vez (`useMemo` sobre `hexData`). Al cambiar de zoom, solo se hace un `Map.get(res)` — O(1).

### 4.4 Estrategia de Rendimiento: Filtrado por Viewport

Además de la agrupación por resolución, solo se envían al GPU los hexágonos **visibles en el viewport actual**:

1. Cada hexágono tiene `lat`/`lng` pre-computados con `cellToLatLng()` (almacenados en el cache de resolución).
2. Se estima el bounding box visible a partir del `viewState` (latitud, longitud, zoom) con un margen del 30%.
3. Se filtran los hexágonos cuyo centro cae fuera del bounding box.

**Resultado:** En zoom bajo (país completo), se renderizan ~50-200 hexágonos (res 2-3) en vez de cientos de miles.

### 4.5 Cache en Memoria del Servidor

La API route utiliza `h3DataCache` (cache en memoria de Node.js) para evitar re-parsear el parquet en cada request. El parseo ocurre solo en la primera solicitud; las siguientes sirven desde memoria.

> **Nota:** Este cache es temporal. Migrar a PostgreSQL + PostGIS cuando se implemente la épica E6.

## 5. Flujo Completo de Datos

```
master_variables.h3.parquet (126 MB, res 8)
         │
         ▼
  API Route /api/hexagons
  (parseH3Parquet: solo columnas esenciales)
  (h3DataCache: cache en memoria)
         │
         ▼
  JSON response: { hexagons[], totalCount, parsedAt }
         │
         ▼
  MapView: fetch al montar (solo si activo y sin datos)
         │
         ▼
  buildResolutionCache(): pre-computa res 2..8 con lat/lng
         │
         ▼
  zoomToH3Res(zoom) → selecciona nivel
         │
         ▼
  filterByViewport() → solo hexágonos en pantalla
         │
         ▼
  H3HexagonLayer: renderiza con borde azul opaco (#165170)
  getFillColor por score_general (gradiente rojo→amarillo→azul)
```

## 6. Archivos Involucrados

| Archivo | Responsabilidad |
|---------|----------------|
| `Components/Map.tsx` | Mapa interactivo, capas H3, freeze/unfreeze, agrupación por zoom, filtrado viewport |
| `Utils/parseH3Parquet.ts` | Parseo del .parquet con hyparquet (solo columnas esenciales) |
| `Utils/h3DataCache.ts` | Cache temporal en memoria del servidor |
| `Utils/useCachedImage.ts` | Hook para almacenar/recuperar snapshots en Cache API del navegador |
| `Utils/AccionPrincipalContext.tsx` | Estado global de navegación (fase activa) |
| `api/hexagons/route.ts` | API route que sirve datos H3 como JSON |
| `Components/SideBar.tsx` | Navegación secuencial entre fases |
| `dashboard/page.tsx` | Layout principal: SideBar + MapView |

## 7. Puntos Criticos a Monitorear

1. **Memory leaks en Cache API:** Asegurar que `clearCache` se ejecute siempre al descongelar. Los `objectURL` no revocados persisten en memoria.
2. **Device WebGL huérfano:** Si el componente se desmonta sin descongelar, verificar que DeckGL libere el device internamente.
3. **Tamaño del JSON response:** Con ~126 MB de parquet, el JSON resultante (solo columnas esenciales) debe mantenerse bajo control. Monitorear el tamaño del payload.
4. **Pre-computación bloqueante:** `buildResolutionCache` itera todos los hexágonos 7 veces. Si el dataset crece, considerar mover a Web Worker.
5. **Datos de variables bajo demanda:** Las columnas de variables numéricas no se cargan inicialmente. Cuando se implemente la inspección de hexágonos individuales, crear un endpoint dedicado que lea solo las variables de un `h3_index` específico.
