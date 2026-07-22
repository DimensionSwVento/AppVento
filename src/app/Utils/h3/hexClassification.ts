import { cellToLatLng, cellToParent, getResolution } from "h3-js";
import { LAND_POLYGON_RINGS, SEA_BBOXES, type LngLat } from "./h3Resolution";
import {
  BANNED_HEXES,
  MAX_SELECTION_GAP_KM,
  MIN_SELECTION_H3_RES,
  SHOW_PLACEHOLDER_EXCLUDED,
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
 * `true` si el hex es una zona EXCLUIDA / prohibida (inviable) → gris sólido y
 * no seleccionable. Fuente real: `BANNED_HEXES` (doc maestro, a resolución
 * `MIN_SELECTION_H3_RES`; un hex más fino hereda el veto de su ancestro). Hoy
 * vacío, así que — mientras `SHOW_PLACEHOLDER_EXCLUDED` — se usa un placeholder
 * determinista por zona res-5 para que las zonas grises sean visibles. Ver
 * `Utils/projectData.ts`.
 */
export function isHexBanned(h: string): boolean {
  // 1) Datos reales (cuando existan).
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
  const [nLat, nLng] = cellToLatLng(newHex);
  for (const h of selectedHexes) {
    const [lat, lng] = cellToLatLng(h);
    if (haversineKm(nLat, nLng, lat, lng) <= MAX_SELECTION_GAP_KM) return true;
  }
  return false;
}
