/**
 * Índice espacial de hexágonos H3 organizado por tiles z/x/y.
 * Almacena todas las variables para soportar AC2 (filtrado) y AC3 (popup).
 */
import { cellToLatLng, cellToParent } from "h3-js";
import type { H3HexagonData } from "./parseH3Parquet";

// tile response compacto — datos base + variable filtrada opcional
export interface TileHex {
  h: string;   // h3_index
  s: number;   // score_general
  t: string;   // tipo_celda
  la: number;  // lat
  ln: number;  // lng
  v?: number | null;  // valor de variable filtrada (AC2)
}

// detalle completo de un hexágono (AC3 popup)
export interface HexDetail {
  h3_index: string;
  score_general: number;
  tipo_celda: string;
  lat: number;
  lng: number;
  variables: Record<string, string | number | null>;
}

// mapeo zoom del mapa → resolución H3
function zoomToH3Res(z: number): number {
  if (z >= 10) return 7;
  if (z >= 8) return 6;
  if (z >= 7) return 5;
  if (z >= 6) return 4;
  if (z >= 5) return 3;
  return 2;
}

// convertir tile z/x/y a bounding box [west, south, east, north]
function tileToBBox(z: number, x: number, y: number): [number, number, number, number] {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  const n2 = Math.PI - (2 * Math.PI * (y + 1)) / Math.pow(2, z);
  const west = (x / Math.pow(2, z)) * 360 - 180;
  const east = ((x + 1) / Math.pow(2, z)) * 360 - 180;
  const north = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  const south = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n2) - Math.exp(-n2)));
  return [west, south, east, north];
}

// datos pre-indexados con lat/lng + variables completas
interface IndexedHex {
  h3_index: string;
  score_general: number;
  tipo_celda: string;
  lat: number;
  lng: number;
  variables: Record<string, string | number | null>;
}

// --- Score Temporal de Viabilidad (PLACEHOLDER) ---
// Se reemplazará por el modelo multicriterio AHP real del equipo de análisis.
// Pesos aproximados, NO validados. Variables insuficientes (faltan Ambiental, Regulatoria, Macroeconómica).

const ROCK_SCORES: Record<string, number> = {
  "muy superficiales": 1.0,
  "superficiales": 0.75,
  "moderadamente profundas": 0.5,
  "profundas": 0.25,
  "muy profundas": 0.1,
};

function getNumericVal(variables: Record<string, string | number | null>, prefix: string): number | null {
  for (const [k, v] of Object.entries(variables)) {
    if (k.startsWith(prefix)) {
      if (typeof v === "number") return v;
      if (typeof v === "string") { const n = parseFloat(v); if (!isNaN(n)) return n; }
    }
  }
  return null;
}

function getStringVal(variables: Record<string, string | number | null>, prefix: string): string | null {
  for (const [k, v] of Object.entries(variables)) {
    if (k.startsWith(prefix) && typeof v === "string") return v;
  }
  return null;
}

function calcTempViability(variables: Record<string, string | number | null>): number {
  // Velocidad de viento (0.35) — positiva, floor 3 m/s, cap 12 m/s
  const wind = getNumericVal(variables, "001_velocidad_de_viento");
  const windNorm = wind !== null ? Math.max(0, Math.min(1, (wind - 3) / 9)) : 0.5;

  // Densidad energética eólica (0.30) — positiva, cap 600 W/m²
  const density = getNumericVal(variables, "004_densidad_energ");
  const densityNorm = density !== null ? Math.max(0, Math.min(1, density / 600)) : 0.5;

  // Profundidad de roca (0.10) — categórica, superficial = mejor
  const rock = getStringVal(variables, "009_profundidad_roca");
  const rockNorm = rock ? (ROCK_SCORES[rock.toLowerCase()] ?? 0.5) : 0.5;

  // Reserva campesina (0.15) — invertida, null = sin restricción = 1.0
  const reserve = getNumericVal(variables, "soc_022_sr");
  const reserveNorm = reserve === null ? 1.0 : 0.2;

  // Cigarrillos ilegales (0.10) — invertida, alto = mala gobernanza
  const cig = getNumericVal(variables, "soc_025_er");
  const cigNorm = cig !== null ? 1 - Math.max(0, Math.min(1, cig / 100)) : 0.5;

  return windNorm * 0.35 + densityNorm * 0.30 + rockNorm * 0.10 + reserveNorm * 0.15 + cigNorm * 0.10;
}

// singleton del índice
let indexedData: IndexedHex[] | null = null;
// lookup por h3_index para detalle rápido (AC3)
let hexLookup: Map<string, IndexedHex> | null = null;
// cache de agrupaciones por resolución
const resolutionCache = new Map<number, IndexedHex[]>();
// rangos min/max por variable numérica (para normalización AC2)
let variableRanges: Map<string, { min: number; max: number }> | null = null;
// nombres de variables disponibles
let availableVariables: string[] = [];

/**
 * Inicializa el índice con los datos del parquet.
 */
export function initTileIndex(hexagons: H3HexagonData[], variableNames: string[]): void {
  availableVariables = variableNames;

  indexedData = hexagons.map((h, i) => {
    const [lat, lng] = cellToLatLng(h.h3_index);
    // si no hay score_general del parquet, calcular temporal
    const score = h.score_general > 0 ? h.score_general : calcTempViability(h.variables);
    // debug: log primer hexágono
    if (i === 0) console.log("[TILE_INDEX] primer hex score:", score, "original:", h.score_general, "vars keys:", Object.keys(h.variables).length);
    return { h3_index: h.h3_index, score_general: score, tipo_celda: h.tipo_celda, lat, lng, variables: h.variables };
  });

  // lookup para detalle O(1)
  hexLookup = new Map();
  for (const h of indexedData) {
    hexLookup.set(h.h3_index, h);
  }

  // calcular rangos min/max para variables numéricas
  variableRanges = new Map();
  for (const varName of variableNames) {
    let min = Infinity;
    let max = -Infinity;
    for (const h of indexedData) {
      const val = h.variables[varName];
      if (typeof val === "number") {
        if (val < min) min = val;
        if (val > max) max = val;
      } else if (typeof val === "string") {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          if (num < min) min = num;
          if (num > max) max = num;
        }
      }
    }
    if (min !== Infinity) {
      variableRanges.set(varName, { min, max });
    }
  }

  resolutionCache.clear();
  resolutionCache.set(8, indexedData);
}

/**
 * Agrupación por resolución — promedia score y variables numéricas.
 */
function getAtResolution(targetRes: number): IndexedHex[] {
  if (!indexedData) return [];

  const cached = resolutionCache.get(targetRes);
  if (cached) return cached;

  const groups = new Map<string, {
    totalScore: number;
    count: number;
    tipo: string;
    varTotals: Record<string, { sum: number; count: number }>;
    varTexts: Record<string, string>;
  }>();

  for (const d of indexedData) {
    const parentHex = cellToParent(d.h3_index, targetRes);
    const existing = groups.get(parentHex);
    if (existing) {
      existing.totalScore += d.score_general;
      existing.count += 1;
      // promediar variables numéricas
      for (const [k, v] of Object.entries(d.variables)) {
        const num = typeof v === "number" ? v : (typeof v === "string" ? parseFloat(v) : NaN);
        if (!isNaN(num)) {
          if (!existing.varTotals[k]) existing.varTotals[k] = { sum: 0, count: 0 };
          existing.varTotals[k].sum += num;
          existing.varTotals[k].count += 1;
        }
      }
    } else {
      const varTotals: Record<string, { sum: number; count: number }> = {};
      const varTexts: Record<string, string> = {};
      for (const [k, v] of Object.entries(d.variables)) {
        const num = typeof v === "number" ? v : (typeof v === "string" ? parseFloat(v) : NaN);
        if (!isNaN(num)) {
          varTotals[k] = { sum: num, count: 1 };
        } else if (typeof v === "string") {
          varTexts[k] = v;
        }
      }
      groups.set(parentHex, { totalScore: d.score_general, count: 1, tipo: d.tipo_celda, varTotals, varTexts });
    }
  }

  const aggregated: IndexedHex[] = [];
  for (const [hex, g] of groups) {
    const [lat, lng] = cellToLatLng(hex);
    const variables: Record<string, string | number | null> = {};
    for (const [k, vt] of Object.entries(g.varTotals)) {
      variables[k] = vt.sum / vt.count;
    }
    for (const [k, vt] of Object.entries(g.varTexts)) {
      variables[k] = vt;
    }
    aggregated.push({
      h3_index: hex,
      score_general: g.totalScore / g.count,
      tipo_celda: g.tipo,
      lat, lng, variables,
    });
  }

  resolutionCache.set(targetRes, aggregated);
  return aggregated;
}

/**
 * Retorna hexágonos para un tile, opcionalmente con una variable específica.
 */
export function getHexagonsForTile(z: number, x: number, y: number, varName?: string): TileHex[] {
  const targetRes = zoomToH3Res(z);
  const allAtRes = getAtResolution(targetRes);
  const [west, south, east, north] = tileToBBox(z, x, y);

  const latMargin = (north - south) * 0.1;
  const lngMargin = (east - west) * 0.1;

  const result: TileHex[] = [];
  for (const h of allAtRes) {
    if (
      h.lat >= south - latMargin &&
      h.lat <= north + latMargin &&
      h.lng >= west - lngMargin &&
      h.lng <= east + lngMargin
    ) {
      const tile: TileHex = {
        h: h.h3_index,
        s: h.score_general,
        t: h.tipo_celda,
        la: h.lat,
        ln: h.lng,
      };
      // incluir variable filtrada si se pidió
      if (varName && h.variables[varName] !== undefined) {
        const val = h.variables[varName];
        tile.v = typeof val === "number" ? val : (typeof val === "string" ? parseFloat(val) || null : null);
      }
      result.push(tile);
    }
  }
  return result;
}

/**
 * Retorna detalle completo de un hexágono por h3_index (AC3 popup).
 */
export function getHexDetail(h3Index: string): HexDetail | null {
  if (!hexLookup) return null;
  const h = hexLookup.get(h3Index);
  if (!h) return null;
  return {
    h3_index: h.h3_index,
    score_general: h.score_general,
    tipo_celda: h.tipo_celda,
    lat: h.lat,
    lng: h.lng,
    variables: h.variables,
  };
}

/**
 * Retorna rangos min/max de una variable (para normalización de color).
 */
export function getVariableRange(varName: string): { min: number; max: number } | null {
  return variableRanges?.get(varName) ?? null;
}

/**
 * Retorna lista de variables disponibles.
 */
export function getAvailableVariables(): string[] {
  return availableVariables;
}

/**
 * Conteos globales de una resolución (todos los hexágonos, no solo visibles).
 * Para el panel LayerInfo.
 */
export function getGlobalCounts(
  zoom: number,
  selectedHexes: string[],
  varName?: string
): { total: number; selected: number; aboveThreshold: number } {
  const targetRes = zoomToH3Res(zoom);
  const allAtRes = getAtResolution(targetRes);
  const selectedSet = new Set(selectedHexes);

  let selected = 0;
  let aboveThreshold = 0;

  const range = varName ? variableRanges?.get(varName) : null;

  for (const h of allAtRes) {
    // contar seleccionados (directos o por parentesco)
    if (selectedSet.has(h.h3_index)) selected++;

    // contar sobre umbral
    if (varName && range) {
      const val = h.variables[varName];
      const num = typeof val === "number" ? val : (typeof val === "string" ? parseFloat(val) : NaN);
      if (!isNaN(num)) {
        const ratio = (num - range.min) / (range.max - range.min);
        if (ratio > 0.33) aboveThreshold++;
      }
    } else {
      // sin variable: usar score_general
      if (h.score_general > 0.33) aboveThreshold++;
    }
  }

  return { total: allAtRes.length, selected, aboveThreshold };
}

export function isIndexReady(): boolean {
  return indexedData !== null;
}
