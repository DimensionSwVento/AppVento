/**
 * Paleta Viridis (perceptualmente uniforme, default GIS) + cálculo de puntaje
 * placeholder por (dimensión, hex) mientras no hay datos reales (US03-AC6).
 *
 * Una sola paleta — el toggle Inferno/Viridis (US06-HEAT-AC2) queda fuera
 * por decisión del cliente. Si se quiere reactivar, añadir un segundo array
 * y un selector externo.
 */

import { SCORABLE_DIMENSION_IDS } from "../variables/variablesCatalog";

/** 11 stops Viridis (matplotlib estándar). */
const VIRIDIS: [number, number, number][] = [
  [68, 1, 84],
  [72, 35, 116],
  [64, 67, 135],
  [52, 94, 141],
  [41, 120, 142],
  [32, 144, 140],
  [34, 167, 132],
  [68, 190, 112],
  [121, 209, 81],
  [189, 222, 38],
  [253, 231, 36],
];

/** Color RGB de Viridis para un valor `t` ∈ [0, 1]. */
export function viridis(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (VIRIDIS.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(VIRIDIS.length - 1, lo + 1);
  const f = idx - lo;
  const a = VIRIDIS[lo];
  const b = VIRIDIS[hi];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Puntaje placeholder en [0, 1] para un hex en una dimensión específica.
 * Determinista: el mismo (dim, hex) siempre devuelve el mismo valor.
 *
 * Reemplazar por fetch al backend cuando US03-AC6 esté listo, manteniendo
 * la misma firma `(dim, hex) → número 0..1`.
 */
export function dimensionHexScore(dim: string, hex: string): number {
  const seed = hashString(dim + "::" + hex);
  return seed / 0xffffffff;
}

/**
 * Promedio del puntaje placeholder de una dimensión sobre un conjunto de hexes.
 * Devuelve string en formato `XX.X` (escala 0–100) para uso directo en UI.
 * `0.0` si el set está vacío.
 */
export function dimensionScore(
  dim: string,
  hexes: Iterable<string>,
): string {
  let sum = 0;
  let n = 0;
  for (const h of hexes) {
    sum += dimensionHexScore(dim, h);
    n++;
  }
  if (n === 0) return "0.0";
  return ((sum / n) * 100).toFixed(1);
}

/**
 * Puntaje general placeholder del área seleccionada: promedio entre las
 * dimensiones PUNTUABLES (`SCORABLE_DIMENSION_IDS` — 4 dimensiones).
 * "Regulatoria" queda excluida del cálculo (US-FB3-05 / feedback item 11) y
 * pasa a ser información contextual. Devuelve string en formato `XX.X`.
 */
export function generalScore(hexes: Iterable<string>): string {
  const arr = Array.from(hexes);
  if (arr.length === 0) return "0.0";
  let sum = 0;
  for (const dim of SCORABLE_DIMENSION_IDS) {
    sum += parseFloat(dimensionScore(dim, arr));
  }
  return (sum / SCORABLE_DIMENSION_IDS.length).toFixed(1);
}
