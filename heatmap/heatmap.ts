import { cellToChildren, getResolution } from "h3-js";
import { weightFor } from "../Utils/variableWeights";

/** Resolución H3 a la que se pinta el heatmap (la más fina del rango soportado). */
export const HEATMAP_RES = 8;

/**
 * Expande cada hex de la selección a sus hijos a resolución HEATMAP_RES.
 * Los hexes que ya están en HEATMAP_RES se devuelven tal cual.
 * Los hexes en resolución superior (más fina, p. ej. 9-15) se incluyen tal cual.
 *
 * El resultado es la lista de celdas que se pintan en el heatmap, evitando
 * promediar el score sobre el hex padre y mostrándolo a granularidad fina.
 */
export function expandToRes8(hexes: Set<string> | string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const source = hexes instanceof Set ? hexes : new Set(hexes);
  for (const h of source) {
    const res = getResolution(h);
    if (res >= HEATMAP_RES) {
      if (!seen.has(h)) {
        seen.add(h);
        out.push(h);
      }
      continue;
    }
    const children = cellToChildren(h, HEATMAP_RES);
    for (const c of children) {
      if (!seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
  }
  return out;
}

/** FNV-1a hash → entero 32-bit no negativo. */
function fnv1a(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Score determinista por (variableId, hex), placeholder hasta que el modelo
 * multicriterio entregue scores reales.
 *
 * Por ahora produce valores **casi uniformes** (~0.6-0.8) para que el efecto
 * de activar/desactivar variables sea observable de forma limpia:
 * - Activar sólo aditivas → color cálido uniforme
 * - Añadir penalizadoras → desplazamiento uniforme hacia morado/frío
 * - Sin scores aleatorios distrayendo la lectura
 *
 * Cuando llegue el modelo real, reemplazar el cuerpo de esta función con la
 * lectura de los scores por (variable, hex). La firma se mantiene.
 */
export function scoreFor(_variableId: string, hex: string): number {
  // Variación pequeña por hex para que el heatmap muestre la malla con textura.
  // Misma magnitud independiente de la variable: la diferencia visual al alternar
  // variables viene del peso signado, no del score.
  const variation = (fnv1a(hex) % 200) / 1000; // [0, 0.2)
  return 0.6 + variation; // [0.6, 0.8)
}

function clamp01(n: number): number {
  return Math.min(Math.max(n, 0), 1);
}

/**
 * Combina los scores de las variables activas usando los pesos signados
 * de `variableWeights.ts`:
 * - Las variables ADITIVAS (peso positivo) construyen el promedio ponderado base.
 * - Las variables PENALIZADORAS (peso negativo) **sólo restan** de ese promedio
 *   — no se mezclan en el numerador del promedio aditivo.
 *
 *   base    = Σ ( wᵢ · scoreᵢ ) / Σ wᵢ        para wᵢ > 0     ∈ [0, 1]
 *   penalty = Σ (|wᵢ|· scoreᵢ ) / Σ |wᵢ|      para wᵢ < 0     ∈ [0, 1]
 *   final   = clamp(base - penalty, 0, 1)
 *
 * Comportamiento esperado:
 * - Solo aditivas → promedio aditivo (clásico).
 * - Solo penalizadoras → 0 (todo frío, no hay base que penalizar).
 * - Mezcla → ejemplo "cigarrillos ilegales" enfría hexes que serían cálidos
 *   por viento, porque resta directamente del base aditivo.
 */
function aggregateWLC(ids: Set<string>, hex: string): number {
  let addNum = 0;
  let addDen = 0;
  let penNum = 0;
  let penDen = 0;
  for (const id of ids) {
    const w = weightFor(id);
    if (w === 0) continue;
    const s = scoreFor(id, hex);
    if (w > 0) {
      addNum += w * s;
      addDen += w;
    } else {
      const abs = -w;
      penNum += abs * s;
      penDen += abs;
    }
  }
  const base = addDen > 0 ? addNum / addDen : 0;
  const penalty = penDen > 0 ? penNum / penDen : 0;
  return clamp01(base - penalty);
}

/**
 * Combina los scores de las variables activas para un hex en [0, 1].
 * Delega en `aggregateWLC` — semántica documentada arriba.
 */
export function aggregateScore(
  activeVariables: Set<string> | string[],
  hex: string,
): number {
  const ids = activeVariables instanceof Set ? activeVariables : new Set(activeVariables);
  if (ids.size === 0) return 0;
  return aggregateWLC(ids, hex);
}

/** Paleta GIS Inferno (stops normalizados 0..1). */
export const INFERNO_STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [0, 0, 4]],
  [0.25, [101, 21, 110]],
  [0.5, [212, 72, 66]],
  [0.75, [250, 193, 39]],
  [1.0, [252, 255, 164]],
];

/** Paleta GIS Viridis (perceptualmente uniforme, morado→amarillo). */
export const VIRIDIS_STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [68, 1, 84]],
  [0.25, [59, 82, 139]],
  [0.5, [33, 145, 140]],
  [0.75, [94, 201, 98]],
  [1.0, [253, 231, 37]],
];

export type Palette = "inferno" | "viridis";

const STOPS: Record<Palette, Array<[number, [number, number, number]]>> = {
  inferno: INFERNO_STOPS,
  viridis: VIRIDIS_STOPS,
};

/**
 * Interpola color RGB para un score [0..1] usando la paleta indicada.
 * Devuelve un tuple [r, g, b, a] compatible con DeckGL.
 */
export function colorForScore(
  score: number,
  palette: Palette = "inferno",
  alpha = 200,
): [number, number, number, number] {
  const stops = STOPS[palette];
  const s = Math.min(Math.max(score, 0), 0.99999);
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (s >= t0 && s <= t1) {
      const t = (s - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t),
        alpha,
      ];
    }
  }
  const last = stops[stops.length - 1][1];
  return [last[0], last[1], last[2], alpha];
}
