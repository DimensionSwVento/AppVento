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

/**
 * Valor TEMPLATE (0–1) REGIONAL para la escala de color sin backend: campo suave de
 * BAJA frecuencia en lat/lng → celdas vecinas comparten valor ⇒ al colorear por
 * cuantiles se forman REGIONES (como el choropleth de mapasocial), no los corredores
 * finos del viento (`windValueForHex`, alta frecuencia). Determinista por posición.
 */
export function regionalTemplateValue(lat: number, lng: number): number {
  const a = Math.sin((lat - 4) * 0.33) + Math.cos((lng + 74) * 0.28);
  const b = Math.sin((lat + lng) * 0.16);
  const v = (a + b + 3) / 6; // ~0..1
  return Math.max(0, Math.min(1, v));
}

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
 * Rampa de `bands` colores del `baseHex`, ASCENDENTE y con ALTO CONTRASTE: de un
 * tinte CLARO (banda baja) pasando por el color pleno (banda media) a una sombra
 * OSCURA (banda alta). Span claro→pleno→oscuro para que las bandas se diferencien
 * bien (antes solo claro→pleno, se veían muy parecidas).
 */
export function rampForColor(
  baseHex: string,
  bands: number = DEFAULT_QUANTILE_BANDS,
): [number, number, number][] {
  const [br, bg, bb] = hexToRgb(baseHex);
  const n = Math.max(1, bands);
  // L va de +0.62 (claro, mezcla con blanco) a -0.46 (oscuro, mezcla con negro).
  const Lmax = 0.62;
  const Lmin = -0.46;
  const mix = (ch: number, L: number) =>
    L >= 0 ? Math.round(ch + (255 - ch) * L) : Math.round(ch * (1 + L));
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const L = n === 1 ? 0 : Lmax + (Lmin - Lmax) * (i / (n - 1));
    out.push([mix(br, L), mix(bg, L), mix(bb, L)]);
  }
  return out;
}

/**
 * Color de BORDE que contrasta con un relleno `[r,g,b]`: oscuro sobre rellenos
 * claros, claro sobre rellenos oscuros (luminancia relativa). Para separar las
 * áreas del choropleth (líneas entre bandas), como pidió el cliente.
 */
export function contrastBorder(
  rgb: [number, number, number],
): [number, number, number] {
  const [r, g, b] = rgb;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; // 0..1
  if (lum > 0.55) {
    // relleno claro → borde oscuro (mezcla hacia negro)
    return [Math.round(r * 0.45), Math.round(g * 0.45), Math.round(b * 0.45)];
  }
  // relleno oscuro → borde claro (mezcla hacia blanco)
  return [
    Math.round(r + (255 - r) * 0.55),
    Math.round(g + (255 - g) * 0.55),
    Math.round(b + (255 - b) * 0.55),
  ];
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
