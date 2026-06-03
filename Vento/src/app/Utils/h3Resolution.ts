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

// El archipiélago de San Andrés, Providencia y Santa Catalina YA está cubierto
// por los polígonos IGAC + las 12 millas náuticas oficiales (unión Nominatim).
// Se deja el export como alias vacío para no romper imports existentes hasta
// que se hayan limpiado todos los consumidores.
export const ARCHIPELAGO_POLYGON: LngLat[] = [];

// Conjunto completo usado por Map.tsx y por el filtro del indice H3.
export const COLOMBIA_POLYGONS: LngLat[][] = [...COLOMBIA_IGAC_POLYGONS];

// Aproximación de la línea de costa real (sólo tierra firme, sin la
// expansión de ~22 km hacia el mar que tiene COLOMBIA_POLYGON). Se usa
// únicamente para clasificar hexes como `onshore` / `offshore` desde
// `Utils/hexClassification.ts`; NO se usa para renderizado.
//
// Cuando llegue el polígono IGAC tierra-firme oficial, reemplazar estos
// vértices manteniendo el mismo nombre.
export const COLOMBIA_LAND_POLYGON: LngLat[] = [
  // Costa Caribe (oeste → este)
  [-77.2, 8.7],   // Cabo Tiburón (frontera Panamá)
  [-76.5, 9.4],
  [-75.8, 9.8],
  [-75.5, 10.4], // Cartagena
  [-74.8, 10.9], // Barranquilla
  [-74.2, 11.2], // Santa Marta
  [-73.5, 11.2],
  [-72.9, 11.5], // Riohacha
  [-71.7, 12.4], // Punta Gallinas (norte continental)
  [-71.1, 11.0], // SE Guajira
  // Frontera Venezuela (norte → sur)
  [-72.0, 9.5],
  [-72.4, 8.5],
  [-72.5, 7.5], // Cúcuta
  [-72.0, 6.5],
  [-71.0, 6.5],
  [-70.0, 6.0],
  [-69.0, 6.0],
  [-67.5, 6.2],
  // Frontera Venezuela/Brasil (sur)
  [-67.0, 1.5],
  [-67.5, 0.7],
  // Frontera Brasil
  [-69.5, -0.5],
  [-70.0, -4.2], // Leticia
  // Frontera Perú/Ecuador (vuelta al oeste)
  [-71.5, -2.5],
  [-73.0, -1.0],
  [-75.0, 0.0],
  [-77.0, 0.6],
  // Costa Pacífico (sur → norte)
  [-78.8, 1.5], // Tumaco
  [-79.0, 2.0],
  [-78.3, 3.5], // Buenaventura
  [-77.7, 5.5],
  [-77.4, 6.5], // Bahía Solano
  [-77.2, 7.5],
  [-77.2, 8.7], // cierre del anillo en Cabo Tiburón
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
