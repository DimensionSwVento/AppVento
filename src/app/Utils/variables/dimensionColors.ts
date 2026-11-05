import {
  getVariableById,
  variablesByDimension,
  type DimensionId,
} from "./variablesCatalog";

/**
 * Color base (hue) por dimensión. Las variables de una dimensión usan el mismo
 * `hue` pero distinta `lightness` para que se reconozca la familia a simple vista.
 *
 * Cuando llegue la paleta definitiva del cliente, basta con ajustar `DIMENSION_HUES`
 * y los rangos de saturación/luminosidad — el cálculo por variable se reordena solo.
 */
const DIMENSION_HUES: Record<DimensionId, number> = {
  ambiental: 145, // verde
  tecnica: 210, // azul
  social: 30, // naranja
  macroeconomica: 350, // rojo-magenta
  regulatoria: 280, // morado
};

const SATURATION = 60; // %
const L_BASE = 42; // % primera variable de la dimensión (más oscura)
const L_STEP = 7; // % incremento por variable subsecuente
const L_MAX = 72; // % cap superior

/** Color base HSL de una dimensión (variante intermedia, sin variable concreta). */
export function dimensionBaseColor(dim: DimensionId): string {
  return `hsl(${DIMENSION_HUES[dim]}, ${SATURATION}%, ${L_BASE + 10}%)`;
}

/**
 * Color HSL de una variable concreta. Comparte hue con su dimensión y varía
 * en luminosidad según su orden dentro de la dimensión, de forma determinista.
 *
 * Si la variable no existe en el catálogo devuelve un gris neutro.
 */
export function colorForVariable(variableId: string): string {
  const v = getVariableById(variableId);
  if (!v) return "hsl(0, 0%, 60%)";
  const h = DIMENSION_HUES[v.dimension];
  const idx = variablesByDimension(v.dimension).findIndex(
    (x) => x.id === variableId,
  );
  const l = Math.min(L_BASE + idx * L_STEP, L_MAX);
  return `hsl(${h}, ${SATURATION}%, ${l}%)`;
}

/** HSL (`hsl(h, s%, l%)`) → HEX `#rrggbb`. El mapa (deck.gl) y los data-URI de
 *  icono trabajan en hex/rgb; `colorForVariable` devuelve HSL, así que había que
 *  convertir (antes se pasaba el string HSL a un parser HEX → color roto). */
export function hslToHex(hsl: string): string {
  const m = hsl.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);
  if (!m) return hsl.startsWith("#") ? hsl : "#888888";
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const to2 = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/** Hash FNV-1a del id → hue pseudo-aleatorio determinista. */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Color de una variable en HEX, DISTINTO por variable (no solo por dimensión):
 *  hue determinista por hash del id, repartido por el círculo cromático, con
 *  saturación/luminosidad fijas (colores vivos, ni negros ni lavados). Es el
 *  FALLBACK de `mapComponent` cuando la variable no define un `color` propio. */
export function colorHexForVariable(variableId: string): string {
  const hue = hashStr(variableId) % 360;
  return hslToHex(`hsl(${hue}, 65%, 48%)`);
}

/** Util pequeño para consumir desde tests y componentes que quieren listar todas. */
export function allDimensionHues(): Record<DimensionId, number> {
  return { ...DIMENSION_HUES };
}
