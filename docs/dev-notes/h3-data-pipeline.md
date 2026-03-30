---
version: 1.0
date: 2026-03-30
status: activo
autor: wessley - mavalan software
scope: Pipeline de datos H3 — del parquet al render, modelo de datos, API y cache
---

# Notas de Desarrollo — Pipeline de Datos H3

## 1. Resumen

Los datos geoespaciales de Vento se originan en un archivo `.h3.parquet` de 126 MB con hexágonos H3 a resolución 8. Este documento describe el flujo completo desde el archivo fuente hasta el render en pantalla, separando lo implementado de lo pendiente.

---

## 2. Modelo de Datos — Implementado

### 2.1 Origen: `master_variables.h3.parquet`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `h3_index` (o `hex_id`) | string | Índice H3 a resolución 8 (prefijo `88`, ~460m de lado) |
| `score_general` (o `score`) | float [0-1] | Score de viabilidad general (promedio de 5 dimensiones) |
| `tipo_celda` (o `cell_type`) | string | Clasificación de la celda (default: `"activa"`) |
| *columnas numéricas adicionales* | float | Variables individuales por dimensión (no cargadas actualmente) |

**Ubicación:** `Vento/src/app/Utils/master_variables.h3.parquet`

### 2.2 Interfaces TypeScript (implementadas en `parseH3Parquet.ts`)

```typescript
interface H3HexagonData {
  h3_index: string;
  score_general: number;
  tipo_celda: string;
  variables: Record<string, number>;  // vacío en carga actual
  metadata?: Record<string, string>;
}

interface H3DataSet {
  hexagons: H3HexagonData[];
  totalCount: number;
  parsedAt: string;  // ISO timestamp del parseo
}
```

### 2.3 Gradiente de Color por Score (implementado en `Map.tsx`)

| Rango score | Color RGBA | Significado visual |
|-------------|-----------|-------------------|
| > 0.7 | `[220, 50, 50, 180]` rojo | Alta viabilidad |
| > 0.5 | `[240, 180, 50, 160]` amarillo | Viabilidad media-alta |
| > 0.3 | `[50, 180, 220, 140]` azul claro | Viabilidad media-baja |
| ≤ 0.3 | `[80, 120, 200, 120]` azul | Baja viabilidad |

Borde de hexágonos: `[22, 81, 112, 200]` — azul opaco (#165170), `lineWidthMinPixels: 2`.

---

## 3. Flujo de Datos — Implementado

```
master_variables.h3.parquet (126 MB, res 8)
         │
         ▼
  ┌──────────────────────────────────────┐
  │  API Route: GET /api/hexagons        │
  │  1. Verifica cache en memoria        │
  │  2. Si no hay cache:                 │
  │     a. Verifica existencia archivo   │
  │     b. Lee con readFileSync          │
  │     c. Parsea con hyparquet          │
  │        (solo columnas esenciales)    │
  │     d. Almacena en h3DataCache       │
  │  3. Retorna JSON                     │
  └──────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  MapView: fetch("/api/hexagons")     │
  │  - Solo si mapState === "active"     │
  │  - Solo si hexData está vacío        │
  │  - AbortController para cancelar     │
  └──────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  buildResolutionCache()              │
  │  Pre-computa 7 niveles (res 2..8)   │
  │  con cellToParent + promedio scores  │
  │  + lat/lng pre-calculados            │
  │  (ejecuta una sola vez via useMemo) │
  └──────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  zoomToH3Res(zoom) → selecciona res │
  │  filterByViewport() → solo visibles │
  └──────────────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  H3HexagonLayer (DeckGL)             │
  │  Renderiza hexágonos filtrados       │
  │  con color por score_general         │
  └──────────────────────────────────────┘
```

### 3.1 Parseo Selectivo de Columnas (implementado en `parseH3Parquet.ts`)

```typescript
const MAP_COLUMNS = ["h3_index", "hex_id", "score_general", "score", "tipo_celda", "cell_type"];
```

Se incluyen ambos nombres posibles (aliases) para tolerar variaciones en el esquema del parquet. `hyparquet` ignora columnas que no existen en el archivo.

**Decisión:** No se cargan las columnas de variables individuales. El campo `variables` queda como `{}` vacío. Esto reduce drásticamente el tamaño del JSON response.

### 3.2 Cache del Servidor (implementado en `h3DataCache.ts`)

```typescript
let cachedData: H3DataSet | null = null;

storeH3Data(data)  // guarda en variable módulo
getH3Data()        // retorna o null
```

- Cache en memoria del proceso Node.js de Next.js.
- Persiste mientras el proceso viva (se pierde en restart/deploy).
- Sin TTL ni invalidación — el parquet se considera inmutable durante la sesión.

### 3.3 Agrupación por Resolución (implementado en `Map.tsx`)

Pre-computa todas las resoluciones una sola vez:

| Zoom mapa | Resolución H3 | Tamaño hexágono | Hexágonos estimados |
|-----------|---------------|-----------------|---------------------|
| ≥ 10 | 7 | ~1.2 km | Miles |
| ≥ 8 | 6 | ~3.2 km | Cientos |
| ≥ 7 | 5 | ~8.5 km | ~100-200 |
| ≥ 6 | 4 | ~22 km | ~50-100 |
| ≥ 5 | 3 | ~59 km | ~20-50 |
| < 5 | 2 | ~158 km | ~5-15 |

La agrupación usa `cellToParent()` de h3-js y promedia `score_general` de todos los hijos.

### 3.4 Filtrado por Viewport (implementado en `Map.tsx`)

Cada hexágono en el cache tiene `lat`/`lng` pre-computados con `cellToLatLng()`. Al cambiar la vista del mapa:

1. Se calcula el bounding box visible (con 30% de margen).
2. Se filtran solo hexágonos cuyo centro está dentro del bbox.
3. Solo esos se envían al GPU.

**Cambio de zoom:** `Map.get(targetRes)` → O(1) para seleccionar nivel, luego `.filter()` sobre el subset.

---

## 4. API Contracts — Implementado

### 4.1 `GET /api/hexagons`

**Response exitosa (200):**
```json
{
  "hexagons": [
    {
      "h3_index": "8866000001fffff",
      "score_general": 0.72,
      "tipo_celda": "activa",
      "variables": {}
    }
  ],
  "totalCount": 150000,
  "parsedAt": "2026-03-30T10:00:00.000Z"
}
```

**Archivo no encontrado (404):**
```json
{
  "hexagons": [],
  "totalCount": 0,
  "error": "Archivo parquet no encontrado"
}
```

**Error de parseo (500):**
```json
{
  "hexagons": [],
  "totalCount": 0,
  "error": "Error al procesar datos H3"
}
```

### 4.2 `GET /api/health` (implementado)

```json
{ "status": "ok", "timestamp": "2026-03-30T10:00:00.000Z" }
```

### 4.3 `GET /api/users` y `POST /api/users` (stubs)

Retornan respuestas vacías. Marcados con TODO para integración con Keycloak Admin API.

---

## 5. Pendiente de Implementar

### 5.1 Carga de Variables Bajo Demanda

**Estado actual:** El campo `variables` siempre es `{}`. Las columnas de variables del parquet (scores por dimensión, métricas individuales) no se cargan.

**Pendiente:**
- Crear endpoint `GET /api/hexagons/[h3_index]/variables` que lea las columnas de variables para un hexágono específico.
- Se activaría al hacer click/hover sobre un hexágono en el mapa.
- Evaluar si leer el parquet por fila individual es viable o si conviene un índice en memoria.

### 5.2 Validación de Integridad del Parquet (AC6)

Según el PRD, los criterios de aceptación de AC6 requieren:

- Verificar conteo esperado de hexágonos.
- Validar rangos de score [0-1].
- Detectar `h3_index` nulos o duplicados.
- Output reproducible.

**Estado actual:** No hay validación. El parseo confía en los datos tal como vienen.

**Pendiente:**
- Agregar validación post-parseo en `parseH3Parquet.ts` o como paso separado.
- Decidir si validar en cada carga o solo en un script de CI/pre-deploy.

### 5.3 Score General: Cálculo y Composición

**Estado actual:** `score_general` viene pre-calculado en el parquet. La app lo consume directamente.

**Pendiente:**
- Documentar cómo se calcula el score general (promedio de 5 dimensiones: técnica, ambiental, regulatoria, socioeconómica, macroeconómica).
- Definir si la app recalculará el score cuando el usuario modifique pesos de dimensiones, o si siempre se usa el pre-calculado.
- Si se recalcula, se necesitarán las columnas de scores individuales por dimensión.

### 5.4 Selección de Hexágonos por el Usuario

**Estado actual:** Los hexágonos se renderizan pero no son seleccionables interactivamente. El tooltip muestra info pero no hay estado de "seleccionado".

**Pendiente:**
- Implementar click para seleccionar/deseleccionar hexágonos.
- Almacenar set de `h3_index` seleccionados en contexto global.
- Usar selección como gate para avanzar de `seleccion-area` a `dimensiones`.
- Visual: diferenciar hexágonos seleccionados de no seleccionados (opacidad, borde, color).

### 5.5 Migración a Backend Real (Épica E6)

**Estado actual:** Todo el pipeline corre en el proceso Next.js (servidor de desarrollo).

**Pendiente:**
- Migrar `h3DataCache` a PostgreSQL + PostGIS.
- Servir datos H3 desde un backend dedicado (API REST o GraphQL).
- La API route actual (`/api/hexagons`) facilita la transición: el frontend ya consume JSON vía fetch, solo cambia la URL.
- Evaluar si PostGIS puede hacer la agrupación por resolución del lado del servidor (más eficiente que en el cliente).

### 5.6 Actualización del Parquet

**Estado actual:** El archivo parquet es estático. No hay proceso documentado para actualizar los datos.

**Pendiente (AC6):**
- Documentar el proceso de generación/actualización del parquet.
- Script Python con pandas + pyarrow para generar nuevas versiones.
- Versionado del archivo o mecanismo de invalidación del cache del servidor.

### 5.7 Web Worker para Pre-computación

**Estado actual:** `buildResolutionCache()` se ejecuta en el thread principal. Con datasets muy grandes, puede bloquear la UI durante la computación inicial.

**Pendiente:**
- Mover la pre-computación de resoluciones a un Web Worker.
- El worker recibe el array de hexágonos, computa los 7 niveles, y envía el `ResolutionCache` de vuelta.
- Esto libera el thread principal para mantener la UI responsive durante la carga inicial.

---

## 6. Dependencias Técnicas

| Librería | Versión | Uso |
|----------|---------|-----|
| `hyparquet` | ^1.25.2 | Lectura de archivos .parquet en Node.js |
| `h3-js` | ^4.4.0 | `cellToParent`, `cellToLatLng` para agrupación y geolocalización |
| `@deck.gl/geo-layers` | ^9.2.11 | `H3HexagonLayer` para render de hexágonos |
| `@deck.gl/react` | ^9.2.11 | Integración React de DeckGL |
| `maplibre-gl` | ^5.21.1 | Mapa base (tiles CartoDB Positron) |
| `@luma.gl/webgl` | - | Adaptador WebGL2 para DeckGL |

---

## 7. Archivos Involucrados

| Archivo | Estado | Responsabilidad |
|---------|--------|----------------|
| `Utils/master_variables.h3.parquet` | Dato fuente | 126 MB, hexágonos H3 res 8 con scores y variables |
| `Utils/parseH3Parquet.ts` | Implementado | Parseo selectivo de columnas con hyparquet |
| `Utils/h3DataCache.ts` | Implementado (temporal) | Cache en memoria del servidor |
| `api/hexagons/route.ts` | Implementado | API route: cache → parseo → JSON |
| `api/health/route.ts` | Implementado | Health check |
| `api/users/route.ts` | Stub | Pendiente: integración Keycloak |
| `Components/Map.tsx` | Implementado | Fetch, resolución cache, viewport filter, render H3 |
