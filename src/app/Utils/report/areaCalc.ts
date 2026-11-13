import { cellArea } from "h3-js";

/**
 * Suma el área en km² de cada hexágono H3 del set.
 * Devuelve 0 si el set está vacío.
 */
export function calcAreaKm2(hexes: Set<string>): number {
  let total = 0;
  for (const h of hexes) total += cellArea(h, "km2");
  return total;
}
