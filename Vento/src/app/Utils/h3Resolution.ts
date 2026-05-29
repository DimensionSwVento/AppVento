import igacBoundary from "./data/colombia-igac-boundary.json";

export type LngLat = [number, number];

type IgacBoundaryArtifact = {
  metadata: {
    source: string;
    sourceUrl: string;
    sourceQueryUrl: string;
    generatedAt: string;
    featureCount: number;
    polygonCount: number;
    bounds: [number, number, number, number];
  };
  polygons: LngLat[][];
};

const igacArtifact = igacBoundary as unknown as IgacBoundaryArtifact;

// --- constantes del mapa ---

export const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const INITIAL_VIEW_STATE = {
  longitude: -73.5,
  latitude: 4.5,
  zoom: 6,
  pitch: 0,
  bearing: 0,
};

// Colombia + mares circundantes. Mantiene cobertura oeste/norte para
// San Andres + Providencia y conserva el alcance offshore existente.
export const MAX_BOUNDS: [number, number, number, number] = [-82, -4.3, -66.5, 13.5];

export const SNAPSHOT_KEY = "map-snapshot";

export const COLOMBIA_IGAC_METADATA = igacArtifact.metadata;

// Poligonos oficiales IGAC de Colombia, disueltos desde departamentos.
// Formato GeoJSON compatible con h3-js: [lng, lat].
export const COLOMBIA_IGAC_POLYGONS: LngLat[][] = igacArtifact.polygons;

export const COLOMBIA_POLYGON: LngLat[] = COLOMBIA_IGAC_POLYGONS[0];

// Archipielago de San Andres, Providencia y Santa Catalina + mares territoriales.
// Rectangulo amplio que cubre ambas islas y su cobertura offshore existente.
// San Andres ~= [-81.75, 12.5], Providencia ~= [-81.37, 13.35].
export const ARCHIPELAGO_POLYGON: LngLat[] = [
  [-82.0, 12.2],
  [-82.0, 13.5],
  [-81.2, 13.5],
  [-81.2, 12.2],
  [-82.0, 12.2],
];

// Conjunto completo usado por Map.tsx y por el filtro del indice H3.
export const COLOMBIA_POLYGONS: LngLat[][] = [
  ...COLOMBIA_IGAC_POLYGONS,
  ARCHIPELAGO_POLYGON,
];

function pointInPolygon(lng: number, lat: number, polygon: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const crosses = (yi > lat) !== (yj > lat);
    if (crosses && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function isPointInColombia(lat: number, lng: number): boolean {
  const [west, south, east, north] = MAX_BOUNDS;
  if (lat < south || lat > north || lng < west || lng > east) return false;
  return COLOMBIA_POLYGONS.some((polygon) => pointInPolygon(lng, lat, polygon));
}
