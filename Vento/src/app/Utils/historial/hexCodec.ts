import { compactCells } from "h3-js";

/**
 * Compacta un conjunto de hexágonos H3 para GUARDAR el informe (mismo formato
 * `string[]`, menos elementos). `compactCells` reemplaza cada grupo de 7 hijos
 * por su celda padre → **geométricamente idéntico** (la unión cubre la misma
 * área), pero mucho más liviano en selecciones contiguas grandes.
 *
 * Se aplica en el guardado (frontend), así el payload sale igual de liviano a
 * localStorage y al backend. Al restaurar se usa tal cual: la app recalcula todo
 * desde la geometría, así que no hace falta descompactar.
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
