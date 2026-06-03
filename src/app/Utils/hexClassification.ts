import { cellToLatLng } from "h3-js";
import { COLOMBIA_LAND_POLYGON } from "./h3Resolution";

/**
 * Clasificación `onshore` / `offshore` para hexes de Colombia.
 *
 * Lógica:
 *   - Si el hex cae dentro del archipiélago → `offshore` (mar territorial
 *     alrededor de San Andrés / Providencia; las propias islas también se
 *     marcan así para tratar el archipiélago como un único proyecto marino).
 *   - Si el hex cae dentro de `COLOMBIA_LAND_POLYGON` (tierra firme
 *     aproximada) → `onshore`.
 *   - Cualquier otro hex dentro del territorio (mar territorial Caribe o
 *     Pacífico) → `offshore`.
 *
 * `COLOMBIA_LAND_POLYGON` es una aproximación manual de la costa real (sin
 * la expansión de ~22 km de `COLOMBIA_POLYGON`). Cuando llegue el polígono
 * IGAC tierra-firme oficial se reemplaza ese constante y la lógica de aquí
 * no cambia.
 */
export type HexType = "onshore" | "offshore";

function pointInRing(
  lat: number,
  lng: number,
  ring: [number, number][],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Devuelve `onshore` / `offshore` para un hex H3 dado. */
export function hexType(h: string): HexType {
  const [lat, lng] = cellToLatLng(h);
  // Tierra firme: onshore.
  if (pointInRing(lat, lng, COLOMBIA_LAND_POLYGON)) return "onshore";
  // Resto del territorio (mar territorial Caribe / Pacífico + archipiélago
  // San Andrés/Providencia, ya cubiertos por IGAC + 12 millas): offshore.
  return "offshore";
}

/**
 * Lee el tipo dominante de un conjunto de hexes. `null` si no hay selección.
 * Si la selección está bien restringida por `toggleHex`, todos los hexes
 * comparten tipo y este helper devuelve ese tipo.
 */
export function dominantHexType(
  hexes: Iterable<string>,
): HexType | null {
  const it = hexes[Symbol.iterator]();
  const first = it.next();
  if (first.done) return null;
  return hexType(first.value);
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
