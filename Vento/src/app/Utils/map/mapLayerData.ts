"use client";

/**
 * SEAM de capas de mapa por variable en RES8 (V0 Sprint 4 — "verse en el mapa").
 *
 * Toda variable con "ver en mapa" se pinta como **hexágonos res8**:
 *  - `area` (protegidas, resguardos, nodos, puertos, vías…): hex de cobertura
 *    con **relleno suave** del color de la variable.
 *  - `heat` (velocidad / densidad de viento): hex coloreados en **viridis** y,
 *    para no contaminar la vista, **solo los que superan un umbral**.
 *
 * Hoy: placeholder DETERMINISTA (parche de hex res8 alrededor de los puntos de
 * `MAP_SYMBOLS`, con valor que decae para heat). Con `USE_BACKEND=true`: fetch a
 * `POST /api/tiles/variable` (contrato en memoria `map-res8-contract`). El valor
 * de heat sale del campo `variables[code]` de la máster (res8); la cobertura de
 * área = presencia de valor para esa variable.
 */
import { latLngToCell, cellToLatLng, gridDisk } from "h3-js";
import { MAP_SYMBOLS, type MapSymbol, type MapSymbolKind } from "./mapSymbols";
import { getVariableById } from "../variables/variablesCatalog";
import { USE_BACKEND } from "../projectData";

/** Resolución H3 de las capas de ÁREA (cobertura localizada de la máster). */
export const MAP_LAYER_RES = 8;

/**
 * MODO SUBTEMPLATE por variable: si el código real de la variable aún NO se
 * conoce (p.ej. no sabemos cuál código de la máster es viento/densidad), el
 * backend elige uno disponible al azar (determinista) para mostrar datos reales
 * "de puente". Activable/desactivable por variable (granular, como USE_BACKEND).
 * Por defecto, las de viento (códigos por confirmar). Editar este set = seam.
 */
export const SUBTEMPLATE_VARS = new Set<string>([
  "velocidad-viento",
  "densidad-viento",
]);

/** masterId de la variable (código de la máster) para pedirle al backend. */
function masterIdFor(variableId: string): string {
  return getVariableById(variableId)?.masterId || variableId;
}

/**
 * Umbral de display del heat de viento (0–1): por debajo el hex no se pinta.
 * Ahora en 0 → se pinta TODO de 0 para arriba (mapa de calor de toda Colombia,
 * para ver el alcance completo). El "no contaminar" lo da el relleno al 20%.
 * Real: `mapThreshold` por variable desde la máster (si se quiere recortar).
 */
export const WIND_THRESHOLD = 0;

/**
 * Valor de viento (0–1) de UN hexágono, a CUALQUIER resolución (el heat colorea
 * los hex que el grid ya muestra, que cambian de res con el zoom — no un set
 * fijo res8). Placeholder: campo de CORREDORES ("zanjas") determinista por la
 * posición del hex (centro cálido / bordes fríos). Real: valor de la máster
 * (`variables[code]`) del hex, agregado a la resolución mostrada.
 */
export function windValueForHex(
  variableId: string,
  h3Index: string,
  realValues?: Map<string, number> | null,
): number | null {
  // Dato REAL del backend si el hex está en el mapa cargado (res8/zoom alto).
  const real = realValues?.get(h3Index);
  if (real != null) return real;
  // Modo BACKEND sin dato → NO se inventa (retorna null: el hex no se pinta).
  // Sin mixtura: nunca el corredor placeholder sobre datos reales.
  if (USE_BACKEND) return null;
  // Modo TEMPLATE: campo placeholder determinista (corredores).
  const [lat, lng] = cellToLatLng(h3Index);
  const off = variableId === "densidad-viento" ? 0.7 : 0;
  const theta = (lng * 2.1 + lat * 1.1 + off) * Math.PI;
  return Math.pow(Math.max(0, Math.sin(theta)), 1.4);
}

/**
 * Valores reales por hex (res8) de una variable de viento desde el backend.
 * Devuelve `Map<h3, valor 0–1>`, o `null` si no hay backend o falla → el
 * heatmap cae al placeholder. Envía el `masterId` y el flag `subtemplate`.
 */
export async function fetchWindCells(
  variableId: string,
  bbox?: { west: number; south: number; east: number; north: number },
  resolution?: number,
): Promise<Map<string, number> | null> {
  if (!USE_BACKEND) return null;
  try {
    const resp = await fetch(`/api/tiles/variable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: masterIdFor(variableId),
        // bbox + res acotan la consulta y el backend AGREGA al padre `res` →
        // memoria y payload acotados (evita OOM con el país entero).
        ...(bbox ? { bbox } : {}),
        ...(resolution != null ? { res: resolution } : {}),
        subtemplate: SUBTEMPLATE_VARS.has(variableId),
      }),
    });
    if (!resp.ok) return null;
    const rows = (await resp.json()) as { h3_index: string; value: number }[];
    return new Map(rows.map((r) => [r.h3_index, r.value]));
  } catch {
    return null;
  }
}

/**
 * Capa COMPLETA de excluidos en UNA sola petición (`GET /api/tiles/excluded`).
 * El front la pide una vez al montar el mapa y la cachea (bannedStore), en vez de
 * pedir `get_tile` por cada tile solo para marcar zonas no seleccionables (ese
 * endpoint, a zoom bajo, barría millones de filas por tile → saturaba los hilos).
 * `[]` si no hay backend o falla → cae al placeholder local, sin romper la malla.
 */
export async function fetchExcludedCells(): Promise<string[]> {
  if (!USE_BACKEND) return [];
  try {
    const resp = await fetch(`/api/tiles/excluded`);
    if (!resp.ok) return [];
    const data = (await resp.json()) as { cells?: string[] };
    return Array.isArray(data?.cells) ? data.cells : [];
  } catch {
    return [];
  }
}

/**
 * Valores (0–1) de una variable ACOTADOS a un bbox — para colorear la rejilla del
 * mapa como heatmap por zoom. Pasa `resolution` (zoom→res) para que el backend
 * AGREGUE al hexágono padre (respuesta pequeña, memoria acotada, sin OOM).
 * `null` si no hay backend o falla (el grid queda sin color de calor).
 */
export async function fetchVariableCellsBBox(
  variableId: string,
  bbox: { west: number; south: number; east: number; north: number },
  resolution?: number,
): Promise<Map<string, number> | null> {
  if (!USE_BACKEND) return null;
  try {
    const resp = await fetch(`/api/tiles/variable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: masterIdFor(variableId),
        bbox,
        ...(resolution != null ? { res: resolution } : {}),
        subtemplate: SUBTEMPLATE_VARS.has(variableId),
      }),
    });
    if (!resp.ok) return null;
    const rows = (await resp.json()) as { h3_index: string; value: number }[];
    return new Map(rows.map((r) => [r.h3_index, r.value]));
  } catch {
    return null;
  }
}

/** Hash determinista de un id (para elegir anclas/huella sin `Math.random`). */
function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Placeholder de cobertura (res8) de una variable GENÉRICA de mapa (área/
 * interconectado) que NO está en `MAP_SYMBOLS` — p.ej. una variable de modelo o
 * informativa que el admin marca "en mapa". Como no tiene `points` propios, la
 * huella se ancla a los puntos de las capas curadas (región de estudio: La
 * Guajira / Caribe) eligiendo un subconjunto DETERMINISTA por el id (así cada
 * variable tiene su propia mancha, distinguible por color/icono). Las `mar` se
 * empujan mar adentro. Solo TEMPLATE (demo); en backend se usa el dato real.
 */
function placeholderCatalogCells(variableId: string): string[] {
  const anchors = MAP_SYMBOLS.flatMap((s) => s.points);
  if (anchors.length === 0) return [];
  const seed = hashId(variableId);
  const seaShift = getVariableById(variableId)?.aplicaEn === "mar" ? 0.25 : 0;
  const acc = new Set<string>();
  const nCenters = 2 + (seed % 3); // 2–4 anclas por variable
  for (let k = 0; k < nCenters; k++) {
    const p = anchors[(seed + k * 7) % anchors.length];
    const center = latLngToCell(p.lat + seaShift, p.lng - seaShift, MAP_LAYER_RES);
    for (const h of gridDisk(center, 3)) acc.add(h);
  }
  return [...acc];
}

/**
 * Hexes (res8) de una variable GENÉRICA para el `catalogLayers` del mapa.
 * REGLA: template = placeholder determinista (pinta algo: área + icono);
 * backend = dato REAL (`fetchWindCells`) o VACÍO si no hay/falla (nunca inventa).
 */
// CACHÉ por variable de las capas del mapa (catálogo/símbolos). Los hex de una
// variable son ESTÁTICOS entre ingestas de la máster, así que se piden UNA vez por
// sesión en vez de re-consultar el país entero cada vez que se recomputan las capas
// (era el "pide res8 cada vez que satura de peticiones"). No se cachean resultados
// vacíos (fallo/backend caído) → se reintenta la próxima vez.
const _catalogCellsCache = new Map<string, Promise<string[]>>();
const _mapLayerCellsCache = new Map<string, Promise<MapLayerCell[]>>();

type BBox = { west: number; south: number; east: number; north: number };

/** Clave de caché por bbox redondeado a ~0.5° (paneos chicos reusan la misma). */
function bboxKey(bbox?: BBox): string {
  if (!bbox) return "all";
  const r = (n: number) => Math.round(n * 2) / 2;
  return `${r(bbox.west)},${r(bbox.south)},${r(bbox.east)},${r(bbox.north)}`;
}

export async function fetchCatalogCells(
  variableId: string,
  res: number = 7,
  bbox?: BBox,
): Promise<string[]> {
  if (!USE_BACKEND) return placeholderCatalogCells(variableId);
  // Clave por (variable, res, bbox): se pide SOLO el bbox del viewport a la res del
  // zoom → el backend escanea lo visible, no el país (era el scan de 5 min). Se
  // cachea por nivel de resumen y zona; sin bbox = país (fallback, no debería pasar).
  const key = `${variableId}:${res}:${bboxKey(bbox)}`;
  let p = _catalogCellsCache.get(key);
  if (!p) {
    // Capa de ÁREA/interconectado: solo se necesita la PRESENCIA (keys), no el valor.
    p = fetchWindCells(variableId, bbox, res).then((m) => {
      const keys = m ? [...m.keys()] : [];
      if (keys.length === 0) _catalogCellsCache.delete(key); // no cachear vacío
      return keys;
    });
    _catalogCellsCache.set(key, p);
  }
  return p;
}

export interface MapLayerCell {
  /** Índice H3 res8. */
  h: string;
  /** Valor normalizado 0–1 (heat → intensidad viridis; area → cobertura). */
  value: number;
}

export interface MapLayerData {
  variableId: string;
  kind: MapSymbolKind;
  /** Color base de la variable (para relleno suave de `area`). */
  color: string;
  cells: MapLayerCell[];
  /** Umbral de display 0–1: por debajo NO se pinta (evita saturar el heat). */
  threshold: number;
}

/**
 * Placeholder de cobertura de una variable de ÁREA (protegidas, resguardos,
 * nodos…): hex alrededor de sus puntos (relleno suave). El viento NO usa esto
 * (es un mapa de calor que colorea los hex del grid — ver `windValueForHex`).
 * Real: los hex de cobertura vienen de la máster res8.
 */
function placeholderCells(s: MapSymbol): MapLayerCell[] {
  const acc = new Map<string, number>();
  for (const p of s.points) {
    const center = latLngToCell(p.lat, p.lng, MAP_LAYER_RES);
    for (const h of gridDisk(center, 4)) acc.set(h, 0.85);
  }
  return Array.from(acc, ([h, value]) => ({ h, value }));
}

/**
 * Devuelve los hex res8 (+valor) de la capa de una variable de mapa.
 * Real (`USE_BACKEND`): `POST /api/tiles/variable`. Template: placeholder.
 */
export async function fetchMapLayerCells(
  s: MapSymbol,
  res: number = MAP_LAYER_RES,
  bbox?: BBox,
): Promise<MapLayerCell[]> {
  // Modo template (demo): placeholder de cobertura.
  if (!USE_BACKEND) return placeholderCells(s);
  // CACHÉ por (variable, res, bbox): se pide SOLO el bbox del viewport a la res del
  // zoom → el backend escanea lo visible, no el país entero a res8 (era el scan de
  // ~5 min que apilaba los hilos). Cacheado por zona/nivel de resumen.
  const key = `${s.variableId}:${res}:${bboxKey(bbox)}`;
  let p = _mapLayerCellsCache.get(key);
  if (!p) {
    p = (async () => {
      // Si el backend no entrega la capa, vacío — NUNCA el placeholder arbitrario.
      try {
        const resp = await fetch(`/api/tiles/variable`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: masterIdFor(s.variableId),
            res,
            ...(bbox ? { bbox } : {}),
            subtemplate: SUBTEMPLATE_VARS.has(s.variableId),
          }),
        });
        if (resp.ok) {
          const rows = (await resp.json()) as { h3_index: string; value: number }[];
          return rows.map((r) => ({ h: r.h3_index, value: r.value }));
        }
      } catch {
        /* backend sin dato → vacío */
      }
      return [] as MapLayerCell[];
    })().then((cells) => {
      if (cells.length === 0) _mapLayerCellsCache.delete(key); // no cachear vacío
      return cells;
    });
    _mapLayerCellsCache.set(key, p);
  }
  return p;
}

const _bulkCache = new Map<string, Promise<Map<string, Map<string, number>>>>();

/**
 * BULK: valores de VARIAS variables en UNA sola petición (`POST /tiles/variables-bulk`)
 * → el backend escanea el bbox UNA vez y resuelve todos los códigos (antes: una
 * petición y un scan por variable → N scans que apilaban los hilos). Devuelve
 * `Map<variableId, Map<h3, valor>>`. Cacheado por (res, bbox, set de variables).
 * `null`/vacío si no hay backend o falla (no se cachea el fallo).
 */
export async function fetchVariableLayersBulk(
  variableIds: string[],
  res?: number,
  bbox?: BBox,
): Promise<Map<string, Map<string, number>>> {
  if (!USE_BACKEND || variableIds.length === 0) return new Map();
  const ids = [...new Set(variableIds)].sort();
  const key = `bulk:${res ?? "-"}:${bboxKey(bbox)}:${ids.join(",")}`;
  let p = _bulkCache.get(key);
  if (!p) {
    p = (async () => {
      // code → variableIds (la respuesta viene por code; puede haber varios ids
      // que mapeen al mismo code).
      const codeToIds = new Map<string, string[]>();
      for (const id of ids) {
        const code = masterIdFor(id);
        const arr = codeToIds.get(code);
        if (arr) arr.push(id);
        else codeToIds.set(code, [id]);
      }
      const out = new Map<string, Map<string, number>>();
      try {
        const resp = await fetch(`/api/tiles/variables-bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codes: [...codeToIds.keys()],
            ...(bbox ? { bbox } : {}),
            ...(res != null ? { res } : {}),
          }),
        });
        if (resp.ok) {
          const data = (await resp.json()) as Record<
            string,
            { h3_index: string; value: number }[]
          >;
          for (const [code, rows] of Object.entries(data)) {
            const cellMap = new Map(rows.map((r) => [r.h3_index, r.value]));
            for (const id of codeToIds.get(code) ?? [code]) out.set(id, cellMap);
          }
        } else if (resp.status === 404) {
          // El backend aún no tiene el endpoint bulk (despliegue viejo) → FALLBACK a
          // per-variable (fetchWindCells) para no dejar el mapa sin capas.
          await Promise.all(
            ids.map(async (id) => {
              const m = await fetchWindCells(id, bbox, res);
              if (m && m.size > 0) out.set(id, m);
            }),
          );
        }
      } catch {
        /* backend caído → vacío */
      }
      if (out.size === 0) _bulkCache.delete(key); // no cachear fallo total
      return out;
    })();
    _bulkCache.set(key, p);
  }
  return p;
}

/** Metadatos de capa (kind/color) sin cargar los hex. */
export function mapLayerMeta(variableId: string): {
  kind: MapSymbolKind;
  color: string;
} | null {
  const s = MAP_SYMBOLS.find((x) => x.variableId === variableId);
  if (!s) return null;
  return { kind: s.kind, color: s.color };
}

export function symbolFor(variableId: string): MapSymbol | undefined {
  return MAP_SYMBOLS.find((x) => x.variableId === variableId);
}
