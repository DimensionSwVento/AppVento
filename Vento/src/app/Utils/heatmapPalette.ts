/**
 * Paleta Viridis (perceptualmente uniforme, default GIS) + cálculo de puntaje
 * placeholder por (dimensión, hex) mientras no hay datos reales (US03-AC6).
 *
 * Una sola paleta — el toggle Inferno/Viridis (US06-HEAT-AC2) queda fuera
 * por decisión del cliente. Si se quiere reactivar, añadir un segundo array
 * y un selector externo.
 */

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
