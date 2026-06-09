import { cellToLatLng } from "h3-js";
import { LAND_POLYGON_RINGS, SEA_BBOXES, type LngLat } from "./h3Resolution";

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
 * `true` si un hex nuevo es compatible con los ya seleccionados — es decir,
 * todos los hexes del set comparten tipo (`onshore` u `offshore`).
 * Permite la primera selección sin restricción.
 */
export function canAddHexToSelection(
  newHex: string,
  selectedHexes: Set<string>,
): boolean {
  if (selectedHexes.size === 0) return true;
  const existing = dominantHexType(selectedHexes);
  if (!existing) return true;
  return hexType(newHex) === existing;
}
