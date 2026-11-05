import { compactCells, uncompactCells, getResolution } from "h3-js";

/**
 * Compacta un conjunto de hexágonos H3 para GUARDAR el informe (mismo formato
 * `string[]`, menos elementos). `compactCells` reemplaza cada grupo de 7 hijos
 * por su celda padre → **geométricamente idéntico** (la unión cubre la misma
 * área), pero mucho más liviano en selecciones contiguas grandes.
 *
 * Se aplica en el guardado (frontend), así el payload sale igual de liviano a
 * localStorage y al backend. Al RESTAURAR hay que `uncompactHexes` de vuelta a la
 * resolución original (ver abajo).
 *
 * `compactCells` exige celdas de la MISMA resolución; si la selección mezcla
 * resoluciones (p.ej. res 7 + res 8), lanza → se guarda cruda sin compactar.
 */
export function compactHexes(hexes: string[]): string[] {
  if (hexes.length <= 1) return hexes;
  try {
    return compactCells(hexes);
  } catch {
    return hexes; // resoluciones mixtas → sin compactar (fallback seguro)
  }
}

/**
 * DESCOMPACTA lo guardado por `compactHexes` → vuelve a la selección original
 * (celdas a la resolución más fina del set compactado = la resolución con la que
 * se seleccionó el área). Imprescindible al restaurar un informe del histórico
 * en MODO BACKEND: `/tiles/area` espera las celdas de la selección (que el back
 * expande a res 8); si se le pasan los padres compactados (res más gruesa) el
 * área no casa y el informe/tooltip salen vacíos. En modo template es inocuo
 * (geométricamente idéntico). Fallback seguro: si algo falla, devuelve tal cual.
 */
export function uncompactHexes(hexes: string[]): string[] {
  if (hexes.length === 0) return hexes;
  try {
    const res = Math.max(...hexes.map((h) => getResolution(h)));
    return uncompactCells(hexes, res);
  } catch {
    return hexes;
  }
}
