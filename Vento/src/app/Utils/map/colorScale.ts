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

/** [r,g,b] 0–255 → [h(0–360), s(0–1), l(0–1)]. */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

/** [h(0–360), s(0–1), l(0–1)] → [r,g,b] 0–255. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
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
 * Rampa de `bands` colores ASCENDENTE con TONOS DISTINTOS (no sombras del base).
 *
 * Cliente: las bandas "ya no son una versión suave del principal, son una variante
 * — del verde un azul, del amarillo un naranja y rojo…, un color distinto bajando
 * por el círculo de color". Por eso NO variamos solo la luminosidad: GIRAMOS EL TONO
 * (hue) banda a banda, por el camino corto hacia el ROJO (0°) = "más fuerte", y
 * además oscurecemos un poco al subir. Así cada banda es un color nombrable distinto
 * (p. ej. verde → verde-amarillo → amarillo → naranja → rojo) y el tono base de la
 * variable sigue presente en las bandas bajas (su color de leyenda/icono).
 */
export function rampForColor(
  baseHex: string,
  bands: number = DEFAULT_QUANTILE_BANDS,
): [number, number, number][] {
  const [br, bg, bb] = hexToRgb(baseHex);
  const [h0, s0, l0] = rgbToHsl(br, bg, bb);
  const n = Math.max(1, bands);
  // Destino del giro: el rojo más cercano (0 o 360) por el camino corto → tonos
  // cálidos crecientes = intensidad. Sweep del 82% para llegar casi al rojo arriba.
  const target = h0 <= 180 ? 0 : 360;
  const sweep = 0.82;
  // Saturación alta y constante (colores vivos, bien diferenciables); luminosidad de
  // clara (banda baja) a media-oscura (banda alta) para mantener el "ascendente".
  const sat = Math.min(0.9, Math.max(0.6, s0 || 0.75));
  const Lhi = 0.66; // banda baja (clara)
  const Llo = 0.42; // banda alta (fuerte)
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const hue = h0 + (target - h0) * (t * sweep);
    const l = Lhi + (Llo - Lhi) * t;
    out.push(hslToRgb(hue, sat, l));
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
 * Borde SÓLIDO y MUY BRILLANTE para delimitar las áreas del choropleth (petición
 * cliente: "un color sólido muy brillante que muestre en contraste los límites").
 * Toma el tono del relleno y lo lleva a saturación máxima y luminosidad vívida
 * (tono puro) → una línea luminosa y nítida alrededor de cada área, bien distinta del
 * relleno semitransparente. A diferencia de `contrastBorder` (gris oscuro/claro
 * tenue), este resalta el límite.
 */
export function vividBorder(
  rgb: [number, number, number],
): [number, number, number] {
  const [h, , l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  // Saturación al máximo; luminosidad fijada a una banda brillante (0.5) salvo que el
  // tono ya fuera muy claro → la bajamos un pelín para que no se lave sobre el basemap.
  const light = l > 0.6 ? 0.48 : 0.52;
  return hslToRgb(h, 1, light);
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
