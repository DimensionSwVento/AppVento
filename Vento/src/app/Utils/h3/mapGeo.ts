import { COLOMBIA_POLYGONS } from "./h3Resolution";

/** Mapeo zoom → resolución H3 (mismo criterio que h3TileIndex) para que la
 *  cuadrícula coincida visualmente. */
export function zoomToH3Res(zoom: number): number {
  if (zoom >= 12) return 8;
  if (zoom >= 10) return 7;
  if (zoom >= 8) return 6;
  if (zoom >= 7) return 5;
  if (zoom >= 6) return 4;
  return 3;
}

/** Convierte un tile z/x/y a bounding box `[west, south, east, north]`. */
export function tileToBBox(
  z: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  const n2 = Math.PI - (2 * Math.PI * (y + 1)) / Math.pow(2, z);
  const west = (x / Math.pow(2, z)) * 360 - 180;
  const east = ((x + 1) / Math.pow(2, z)) * 360 - 180;
  const north = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  const south = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n2) - Math.exp(-n2)));
  return [west, south, east, north];
}

/**
 * Ray-casting point-in-polygon. `ring` viene en formato `[lng, lat][]`
 * (igual que GeoJSON y `COLOMBIA_POLYGONS`). Costo: O(N) por vértices del ring.
 */
export function pointInRing(
  lat: number,
  lng: number,
  ring: [number, number][],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Filosofía "sólo lo visible": en vez de pre-computar las ~840k cells de
 * Colombia para res 8 (cache global), cada tile valida por sí mismo cada cell
 * de su bbox contra los polígonos del territorio. Sin estado global, sin
 * pre-warm, costo amortizado por tile. Ver ADR-014.
 */
export function isInColombia(lat: number, lng: number): boolean {
  for (const polygon of COLOMBIA_POLYGONS) {
    if (pointInRing(lat, lng, polygon as [number, number][])) return true;
  }
  return false;
}
