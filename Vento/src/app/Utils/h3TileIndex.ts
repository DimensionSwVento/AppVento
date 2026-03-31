/**
 * Índice espacial de hexágonos H3 organizado por tiles z/x/y.
 * Se construye una vez al parsear el parquet y permite servir
 * solo los hexágonos visibles en cada tile request.
 */
import { cellToLatLng, cellToParent } from "h3-js";
import type { H3HexagonData } from "./parseH3Parquet";

// datos mínimos por hexágono para el tile (sin variables para reducir payload)
export interface TileHex {
  h: string;   // h3_index
  s: number;   // score_general
  t: string;   // tipo_celda
  la: number;  // lat
  ln: number;  // lng
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

// datos pre-indexados con lat/lng
interface IndexedHex extends H3HexagonData {
  lat: number;
  lng: number;
}

// singleton del índice — se construye una vez
let indexedData: IndexedHex[] | null = null;
// cache de agrupaciones por resolución
const resolutionCache = new Map<number, IndexedHex[]>();

/**
 * Inicializa el índice con los datos del parquet.
 * Se llama una vez tras parsear.
 */
export function initTileIndex(hexagons: H3HexagonData[]): void {
  indexedData = hexagons.map((h) => {
    const [lat, lng] = cellToLatLng(h.h3_index);
    return { ...h, lat, lng };
  });
  resolutionCache.clear();
  // pre-computar res 8 (datos originales)
  resolutionCache.set(8, indexedData);
}

/**
 * Obtiene hexágonos agrupados a la resolución correspondiente al zoom.
 * Cachea por resolución.
 */
function getAtResolution(targetRes: number): IndexedHex[] {
  if (!indexedData) return [];

  const cached = resolutionCache.get(targetRes);
  if (cached) return cached;

  // agrupar desde datos originales (res 8)
  const groups = new Map<string, { totalScore: number; count: number; tipo: string }>();
  for (const d of indexedData) {
    const parentHex = cellToParent(d.h3_index, targetRes);
    const existing = groups.get(parentHex);
    if (existing) {
      existing.totalScore += d.score_general;
      existing.count += 1;
    } else {
      groups.set(parentHex, { totalScore: d.score_general, count: 1, tipo: d.tipo_celda });
    }
  }

  const aggregated: IndexedHex[] = [];
  for (const [hex, g] of groups) {
    const [lat, lng] = cellToLatLng(hex);
    aggregated.push({
      h3_index: hex,
      score_general: g.totalScore / g.count,
      tipo_celda: g.tipo,
      variables: {},
      lat,
      lng,
    });
  }

  resolutionCache.set(targetRes, aggregated);
  return aggregated;
}

/**
 * Retorna los hexágonos que caen dentro de un tile z/x/y.
 * Agrupa a la resolución H3 correspondiente al zoom.
 */
export function getHexagonsForTile(z: number, x: number, y: number): TileHex[] {
  const targetRes = zoomToH3Res(z);
  const allAtRes = getAtResolution(targetRes);
  const [west, south, east, north] = tileToBBox(z, x, y);

  // margen del 10% para no cortar hexágonos en el borde
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
      result.push({
        h: h.h3_index,
        s: h.score_general,
        t: h.tipo_celda,
        la: h.lat,
        ln: h.lng,
      });
    }
  }
  return result;
}

export function isIndexReady(): boolean {
  return indexedData !== null;
}
