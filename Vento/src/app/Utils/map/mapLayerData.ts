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
): Promise<Map<string, number> | null> {
  if (!USE_BACKEND) return null;
  try {
    const res = await fetch(`/api/tiles/variable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: masterIdFor(variableId),
        subtemplate: SUBTEMPLATE_VARS.has(variableId),
      }),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { h3_index: string; value: number }[];
    return new Map(rows.map((r) => [r.h3_index, r.value]));
  } catch {
    return null;
  }
}

/**
 * Valores res8 (0–1) de una variable ACOTADOS a un bbox (solo lo visible) — para
 * colorear la rejilla del mapa como heatmap por zoom. Backend `/tiles/variable`
 * con bbox; `null` si no hay backend o falla (el grid queda sin color de calor).
 */
export async function fetchVariableCellsBBox(
  variableId: string,
  bbox: { west: number; south: number; east: number; north: number },
): Promise<Map<string, number> | null> {
  if (!USE_BACKEND) return null;
  try {
    const res = await fetch(`/api/tiles/variable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: masterIdFor(variableId),
        bbox,
        subtemplate: SUBTEMPLATE_VARS.has(variableId),
      }),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { h3_index: string; value: number }[];
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
export async function fetchCatalogCells(variableId: string): Promise<string[]> {
  if (USE_BACKEND) {
    const m = await fetchWindCells(variableId);
    return m ? [...m.keys()] : [];
  }
  return placeholderCatalogCells(variableId);
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
): Promise<MapLayerCell[]> {
  if (USE_BACKEND) {
    // Modo backend: los hex (con su símbolo/color) son FIELES a la máster. Si el
    // backend no entrega la capa, vacío — NUNCA el placeholder arbitrario.
    try {
      const res = await fetch(`/api/tiles/variable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: masterIdFor(s.variableId),
          res: MAP_LAYER_RES,
          subtemplate: SUBTEMPLATE_VARS.has(s.variableId),
        }),
      });
      if (res.ok) {
        const rows = (await res.json()) as { h3_index: string; value: number }[];
        return rows.map((r) => ({ h: r.h3_index, value: r.value }));
      }
    } catch {
      /* backend sin dato → vacío (abajo), no placeholder */
    }
    return [];
  }
  // Modo template (demo): placeholder de cobertura.
  return placeholderCells(s);
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
