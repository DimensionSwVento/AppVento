/**
 * Valores placeholder para el tooltip de "Valores del área" mientras no haya
 * datos reales (depende de US03-AC6: ingesta `.h3.parquet → JSON`).
 *
 * El valor es determinista por (variableId, hexSetSeed) para que no parpadee
 * entre renders, pero varíe entre variables y entre selecciones distintas.
 *
 * Cuando llegue la fuente real, este módulo se reemplaza por un fetch al
 * backend manteniendo la misma forma `valueForSelection(varId, hexes) → string`.
 */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Convierte un set de hexes en una seed estable. */
function hexSetSeed(hexes: Iterable<string>): string {
  const arr = Array.from(hexes).sort();
  return arr.join("|");
}

/**
 * Valor numérico placeholder por variable en el área seleccionada.
 * Devuelve un puntaje en escala 0–100 con un decimal (`"73.4"`).
 */
export function valueForSelection(
  variableId: string,
  hexes: Iterable<string>,
): string {
  const seed = hashString(variableId + "::" + hexSetSeed(hexes));
  const norm = seed / 0xffffffff; // 0..1
  const score = norm * 99 + 1; // 1..100
  return score.toFixed(1);
}

/**
 * Etiqueta cualitativa derivada del valor numérico (para el chip
 * "Alto"/"Medio"/"Bajo" del popover del sprint 3 — aquí ya disponible
 * para placeholders).
 */
export function qualitativeLabel(numericValue: string): "Alto" | "Medio" | "Bajo" {
  const n = parseFloat(numericValue);
  if (n >= 66.6) return "Alto";
  if (n >= 33.3) return "Medio";
  return "Bajo";
}

/** Puntaje placeholder de una dimensión (agregado de sus variables activas). */
export function dimensionScore(
  dimensionId: string,
  hexes: Iterable<string>,
): string {
  const seed = hashString("dim::" + dimensionId + "::" + hexSetSeed(hexes));
  const norm = seed / 0xffffffff;
  return (norm * 99 + 1).toFixed(1);
}

/** Puntaje general placeholder del área seleccionada. */
export function generalScore(hexes: Iterable<string>): string {
  const seed = hashString("general::" + hexSetSeed(hexes));
  const norm = seed / 0xffffffff;
  return (norm * 99 + 1).toFixed(1);
}
