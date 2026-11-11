/**
 * Escala de color ASCENDENTE por CUANTILES para variables informativas del mapa.
 *
 * Cliente (verbatim): "escala de color ascendente (de mas claro a mas fuerte)
 * dependiendo del % acorde a una division estrategica de cuartiles los datos …
 * panel lateral … con su respectiva escala de colores y rangos por cuantiles".
 *
 * Cada variable usa SU color base (el mismo de la leyenda/icono); las bandas van
 * de un tinte claro al color pleno. Los CORTES de cuantil (los valores que separan
 * las bandas) los calcula el backend por variable sobre TODA Colombia — aquí solo
 * se recibe el arreglo de cortes y se mapea un valor a su banda.
 *
 * Es el MISMO patrón de pintado que el `calor` del mapa (PolygonLayer + getFillColor
 * por hex): solo cambia la función de color (viridis → banda de cuantil). Ver
 * `useInformeHeatmapLayer`/`gridTileLayer`.
 */

/** Cortes de cuantil ASCENDENTES (N-1 cortes → N bandas). Ej. cuartiles → 3 cortes. */
export type QuantileCuts = readonly number[];

/** #bandas por defecto (el ejemplo del cliente mostraba 5 intervalos). */
export const DEFAULT_QUANTILE_BANDS = 5;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n =
    h.length === 3
      ? h.split("").map((c) => c + c).join("")
      : h.padEnd(6, "0").slice(0, 6);
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

/**
 * Banda (0 … cuts.length) en la que cae `value` según los cortes ascendentes.
 * value < cuts[0] → 0; value ≥ cuts[último] → cuts.length.
 */
export function quantileBandIndex(value: number, cuts: QuantileCuts): number {
  let i = 0;
  while (i < cuts.length && value >= cuts[i]) i++;
  return i;
}

/**
 * Rampa de `bands` colores del `baseHex`, de CLARO a PLENO (ascendente). La banda
 * más baja es un tinte claro (mezcla con blanco); la más alta, el color pleno.
 */
export function rampForColor(
  baseHex: string,
  bands: number = DEFAULT_QUANTILE_BANDS,
): [number, number, number][] {
  const [br, bg, bb] = hexToRgb(baseHex);
  const n = Math.max(1, bands);
  // t de 0.18 (claro) a 1 (pleno): evita el blanco puro en la banda más baja para
  // que igual se distinga del fondo (el ejemplo arranca en rosa claro, no blanco).
  const tMin = 0.18;
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : tMin + (1 - tMin) * (i / (n - 1));
    out.push([
      Math.round(255 + (br - 255) * t),
      Math.round(255 + (bg - 255) * t),
      Math.round(255 + (bb - 255) * t),
    ]);
  }
  return out;
}

/**
 * Color [r,g,b] para `value` según los cortes de cuantil y el color base de la
 * variable. Si no hay valor/cortes, devuelve null (→ el llamador pinta transparente,
 * igual que el calor con `[0,0,0,0]`).
 */
export function colorForQuantile(
  value: number | null | undefined,
  cuts: QuantileCuts,
  baseHex: string,
  bands: number = DEFAULT_QUANTILE_BANDS,
): [number, number, number] | null {
  if (value == null || !Number.isFinite(value)) return null;
  const ramp = rampForColor(baseHex, bands);
  // Con cuts.length = bands-1, el índice cae en 0..bands-1 (una banda por color).
  const idx = Math.min(quantileBandIndex(value, cuts), ramp.length - 1);
  return ramp[idx];
}

/**
 * Etiquetas de rango por banda para la LEYENDA ("Desde a hasta b"), a partir de los
 * cortes y el mínimo/máximo. `fmt` formatea el número (ej. `%`, metros…).
 */
export function quantileRangeLabels(
  cuts: QuantileCuts,
  vmin: number,
  vmax: number,
  fmt: (n: number) => string = (n) => n.toFixed(1),
): string[] {
  const edges = [vmin, ...cuts, vmax];
  const labels: string[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    labels.push(`Desde ${fmt(edges[i])} hasta ${fmt(edges[i + 1])}`);
  }
  return labels;
}
