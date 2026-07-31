import { cellToLatLng, cellToParent, getResolution } from "h3-js";
import { LAND_POLYGON_RINGS, SEA_BBOXES, type LngLat } from "./h3Resolution";
import {
  BANNED_HEXES,
  EXCLUSION_REASONS,
  MAX_SELECTION_GAP_KM,
  MIN_SELECTION_H3_RES,
  SHOW_PLACEHOLDER_EXCLUDED,
  USE_API_EMPLAZAMIENTO,
} from "../projectData";

// Placeholder de zonas excluidas: se agrupa por "zona" a esta resolución para
// que el gris sea coherente entre niveles de zoom (una zona excluida y todos
// sus hijos quedan excluidos por igual).
const EXCLUDED_ZONE_RES = 5;
const EXCLUDED_MODULO = 9; // ~1 de cada 9 zonas res-5 → parches grises visibles

/** Hash determinista de un índice H3 (para el placeholder de excluidas). */
function hashCell(h: string): number {
  let acc = 0;
  for (let i = 0; i < h.length; i++) acc = (acc * 31 + h.charCodeAt(i)) | 0;
  return Math.abs(acc);
}

/**
 * Store de zonas EXCLUIDAS por dato (excluida=true), alimentado por la API
 * (`useAreaHexData` desde `tipo_celda="excluida"` / la columna "excluida" que
 * llegará como una variable consultable más — nombre por confirmar). Es la
 * fuente REAL; si un hex no está en el store, cae a `BANNED_HEXES` o al
 * placeholder (modo template).
 */
const bannedStore = new Map<string, boolean>();

/** Alimenta las zonas excluidas por dato (columna "excluida" del backend). */
export function setBannedData(entries: Iterable<[string, boolean]>): void {
  for (const [hex, banned] of entries) bannedStore.set(hex, banned);
}

/**
 * `true` si el hex es una zona EXCLUIDA / prohibida (inviable) → gris sólido y
 * no seleccionable. Fuentes en orden: (0) dato de la API (`bannedStore`),
 * (1) `BANNED_HEXES` del doc maestro, (2) placeholder determinista mientras
 * `SHOW_PLACEHOLDER_EXCLUDED` (modo template). Ver `Utils/projectData.ts`.
 */
export function isHexBanned(h: string): boolean {
  // 0) Dato real de la API (por hex o heredado del ancestro a res mínima).
  const fromData = bannedStore.get(h);
  if (fromData !== undefined) return fromData;
  if (
    getResolution(h) > MIN_SELECTION_H3_RES &&
    bannedStore.get(cellToParent(h, MIN_SELECTION_H3_RES)) === true
  ) {
    return true;
  }
  // 1) Datos reales estáticos (cuando existan).
  if (BANNED_HEXES.size > 0) {
    if (BANNED_HEXES.has(h)) return true;
    if (
      getResolution(h) > MIN_SELECTION_H3_RES &&
      BANNED_HEXES.has(cellToParent(h, MIN_SELECTION_H3_RES))
    ) {
      return true;
    }
  }
  // 2) Placeholder demostrable hasta tener `tipo_celda="excluida"` real.
  if (SHOW_PLACEHOLDER_EXCLUDED) {
    const zoneKey =
      getResolution(h) > EXCLUDED_ZONE_RES ? cellToParent(h, EXCLUDED_ZONE_RES) : h;
    if (hashCell(zoneKey) % EXCLUDED_MODULO === 0) return true;
  }
  return false;
}

/**
 * Motivo de exclusión de un hex (TEMPLATE). `null` si no está excluido.
 * Determinista por zona res-5 → toda la zona excluida muestra el mismo motivo.
 * Cuando llegue el campo "motivo" real del dataset, se reemplaza la fuente aquí
 * (la leyenda de la UI no cambia).
 */
export function bannedReason(h: string): string | null {
  if (!isHexBanned(h)) return null;
  const zoneKey =
    getResolution(h) > EXCLUDED_ZONE_RES ? cellToParent(h, EXCLUDED_ZONE_RES) : h;
  return EXCLUSION_REASONS[hashCell(zoneKey) % EXCLUSION_REASONS.length];
}

/**
 * Clasificación `onshore` / `offshore` para hexes de Colombia.
 *
 * Pregunta que responde: ¿necesita emplazamiento marítimo o no?
 *
 *  1. Si el centroide cae dentro de cualquier `LAND_POLYGON` (islas
 *     demarcadas fielmente al contorno) → `onshore`. Gana sobre las
 *     sea-bboxes que las contienen.
 *  2. Si cae en una `SEA_BBOX` → `offshore`.
 *  3. Cualquier otro hex → `onshore` (continente).
 */
export type HexType = "onshore" | "offshore";

type Box = { minLat: number; maxLat: number; minLng: number; maxLng: number };

function inBox(lat: number, lng: number, b: Box): boolean {
  return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
}

/** Ray-casting clásico — funciona en cualquier orientación de vértices. */
function pointInPolygon(lng: number, lat: number, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > lat) !== (yj > lat);
    if (crosses && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function isInLand(lat: number, lng: number): boolean {
  for (const ring of LAND_POLYGON_RINGS) {
    if (pointInPolygon(lng, lat, ring)) return true;
  }
  return false;
}

function isInSea(lat: number, lng: number): boolean {
  for (const b of SEA_BBOXES) if (inBox(lat, lng, b)) return true;
  return false;
}

/** Devuelve `onshore` / `offshore` para un hex H3 dado. */
export function hexType(h: string): HexType {
  const [lat, lng] = cellToLatLng(h);
  if (isInLand(lat, lng)) return "onshore";
  if (isInSea(lat, lng)) return "offshore";
  return "onshore";
}

/**
 * Tipo dominante de un conjunto de hexes. Devuelve `offshore` si **al menos
 * uno** de los hexes seleccionados cae en mar — política conservadora pedida
 * por el cliente. `null` si el set está vacío.
 */
export function dominantHexType(
  hexes: Iterable<string>,
): HexType | null {
  let hasAny = false;
  for (const h of hexes) {
    hasAny = true;
    if (hexType(h) === "offshore") return "offshore";
  }
  return hasAny ? "onshore" : null;
}

/**
 * Emplazamiento por DATO: mar/tierra será una **columna del hexágono** que
 * entregue la API (como una variable más). `useAreaHexData` alimenta este store
 * con ese valor (0/1). Si un hex aún no tiene dato (p.ej. en selección antes de
 * consultar el área, o en modo template), cae a la geometría.
 * ⚠️ El **nombre real de la columna aún no está definido** (`es_offshore` es
 * provisional) y hoy NO viene en el contrato de `/api/tiles/area`.
 */
const esOffshoreStore = new Map<string, boolean>();

/** Alimenta el emplazamiento por dato (columna `es_offshore` del backend). */
export function setEsOffshoreData(entries: Iterable<[string, boolean]>): void {
  for (const [hex, off] of entries) esOffshoreStore.set(hex, off);
}

/**
 * ¿El hex es OFFSHORE (mar)? Fuente: la columna `es_offshore` de la API cuando
 * está disponible (store); si no, geometría (`hexType`) como fallback template.
 */
export function isOffshoreHex(hex: string): boolean {
  const fromData = esOffshoreStore.get(hex);
  if (fromData !== undefined) return fromData; // dato real de la API
  return hexType(hex) === "offshore"; // fallback geometría (modo template)
}

/** Naturaleza de una selección según mar/tierra. */
export function selectionNature(
  hexes: Iterable<string>,
): "mar" | "tierra" | "mixta" | "vacia" {
  let sea = false;
  let land = false;
  for (const h of hexes) {
    if (isOffshoreHex(h)) sea = true;
    else land = true;
    if (sea && land) return "mixta";
  }
  if (!sea && !land) return "vacia";
  return sea ? "mar" : "tierra";
}

// MAX_SELECTION_GAP_KM vive en el doc maestro (Utils/projectData).
const EARTH_R_KM = 6371;
function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.sqrt(s));
}

/**
 * `true` si el hex nuevo puede añadirse a la selección. Única restricción: que
 * no esté "muy lejos" del área ya elegida (a ≤ `MAX_SELECTION_GAP_KM` de algún
 * hex del set). Se quitó la restricción tierra/mar — el emplazamiento ahora es
 * manual (#11). La primera selección es siempre libre.
 */
export function canAddHexToSelection(
  newHex: string,
  selectedHexes: Set<string>,
): boolean {
  if (selectedHexes.size === 0) return true;
  // Sprint 3 (USE_API_EMPLAZAMIENTO): no mezclar mar y tierra en una misma
  // selección. El nuevo hex debe coincidir con la naturaleza del área elegida.
  if (USE_API_EMPLAZAMIENTO) {
    const nature = selectionNature(selectedHexes);
    if (nature === "mar" && !isOffshoreHex(newHex)) return false;
    if (nature === "tierra" && isOffshoreHex(newHex)) return false;
  }
  const [nLat, nLng] = cellToLatLng(newHex);
  for (const h of selectedHexes) {
    const [lat, lng] = cellToLatLng(h);
    if (haversineKm(nLat, nLng, lat, lng) <= MAX_SELECTION_GAP_KM) return true;
  }
  return false;
}
