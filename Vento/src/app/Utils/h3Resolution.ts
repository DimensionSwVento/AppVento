import { cellToParent, cellToLatLng } from "h3-js";

// --- constantes del mapa ---

export const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export const INITIAL_VIEW_STATE = {
  longitude: -73.5,
  latitude: 4.5,
  zoom: 6,
  pitch: 0,
  bearing: 0,
};

export const MAX_BOUNDS: [number, number, number, number] = [-95, -60, -30, 15];

export const SNAPSHOT_KEY = "map-snapshot";

// --- tipos ---

export interface HexData {
  h3_index: string;
  score_general: number;
  tipo_celda: string;
  variables: Record<string, number>;
}

export interface IndexedHex extends HexData {
  lat: number;
  lng: number;
}

// --- cache lazy de resoluciones ---

// almacena niveles ya computados — persiste entre renders mientras el ref viva
export type ResolutionCache = Map<number, IndexedHex[]>;

export function createResolutionCache(): ResolutionCache {
  return new Map();
}

/**
 * Obtiene los hexágonos para una resolución específica.
 * Si ya está en cache, retorna inmediatamente.
 * Si no, computa solo ese nivel, lo cachea y retorna.
 */
// TODO: quitar console.log antes de push de rama
export function getResolutionLevel(
  data: HexData[],
  cache: ResolutionCache,
  targetRes: number
): IndexedHex[] {
  const cached = cache.get(targetRes);
  if (cached) {
    console.log(`[MAP] getResolutionLevel: res ${targetRes} desde cache (${cached.length} hex)`);
    return cached;
  }

  console.log(`[MAP] getResolutionLevel: computando res ${targetRes} desde ${data.length} hexágonos...`);

  // res 8 = datos originales con lat/lng
  if (targetRes === 8) {
    const indexed: IndexedHex[] = data.map((d) => {
      const [lat, lng] = cellToLatLng(d.h3_index);
      return { ...d, lat, lng };
    });
    cache.set(8, indexed);
    console.log(`[MAP] getResolutionLevel: res 8 listo (${indexed.length} hex)`);
    return indexed;
  }

  // agrupar a resolución padre promediando scores
  const groups = new Map<string, { totalScore: number; count: number; tipo: string }>();
  for (const d of data) {
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

  cache.set(targetRes, aggregated);
  console.log(`[MAP] getResolutionLevel: res ${targetRes} listo (${aggregated.length} hex)`);
  return aggregated;
}

// --- viewport ---

export function filterByViewport(hexes: IndexedHex[], vs: { latitude: number; longitude: number; zoom: number }): IndexedHex[] {
  const latRange = 180 / Math.pow(2, vs.zoom);
  const lngRange = 360 / Math.pow(2, vs.zoom);
  const margin = 0.3;
  const minLat = vs.latitude - latRange * (1 + margin);
  const maxLat = vs.latitude + latRange * (1 + margin);
  const minLng = vs.longitude - lngRange * (1 + margin);
  const maxLng = vs.longitude + lngRange * (1 + margin);
  return hexes.filter((h) => h.lat >= minLat && h.lat <= maxLat && h.lng >= minLng && h.lng <= maxLng);
}

export function zoomToH3Res(zoom: number): number {
  if (zoom >= 10) return 7;
  if (zoom >= 8) return 6;
  if (zoom >= 7) return 5;
  if (zoom >= 6) return 4;
  if (zoom >= 5) return 3;
  return 2;
}

// --- fetch ---

// TODO: quitar console.log antes de push de rama
export async function fetchHexData(signal: AbortSignal): Promise<HexData[]> {
  console.log("[MAP] fetchHexData: iniciando fetch a /api/hexagons");
  const res = await fetch("/api/hexagons", { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  console.log("[MAP] fetchHexData: response OK, parseando JSON...");
  const data = await res.json();
  console.log("[MAP] fetchHexData: datos recibidos, hexágonos:", data.hexagons?.length ?? 0);
  return data.hexagons ?? [];
}
