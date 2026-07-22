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
  economica: 350, // rojo-magenta
  socioeconomica: 30, // naranja
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

/** Util pequeño para consumir desde tests y componentes que quieren listar todas. */
export function allDimensionHues(): Record<DimensionId, number> {
  return { ...DIMENSION_HUES };
}
