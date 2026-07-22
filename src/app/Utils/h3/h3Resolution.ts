import igacBoundary from "../data/colombia-igac-boundary.json";

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

// El archipiélago de San Andrés, Providencia y Santa Catalina ya está cubierto
// por los polígonos IGAC + las 12 millas náuticas oficiales (unión Nominatim);
// no requiere un polígono aparte.

// Conjunto completo usado por Map.tsx y por el filtro del indice H3.
export const COLOMBIA_POLYGONS: LngLat[][] = [...COLOMBIA_IGAC_POLYGONS];

// Aproximación de la línea de costa real (sólo tierra firme, sin la
// expansión de ~22 km hacia el mar que tiene COLOMBIA_POLYGON). Se usa
// únicamente para clasificar hexes como `onshore` / `offshore` desde
// `Utils/hexClassification.ts`; NO se usa para renderizado.
//
/**
 * Bounding boxes de zonas marítimas conocidas de Colombia.
 *
 * Enfoque pragmático para clasificar hexes como `offshore`: si el centroide
 * del hex cae dentro de cualquiera de estas bboxes → mar. Cualquier otro
 * hex dentro del territorio se considera `onshore`.
 *
 * Más simple y predecible que un polígono complejo de costa. Acepta
 * imprecisión en las islas del archipiélago (San Andrés/Providencia son
 * tan pequeñas que pierden contra el agua circundante en la bbox).
 */
export const SEA_BBOXES: readonly {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}[] = [
  // Mar Caribe — al norte del continente (excluye La Guajira: la peninsula
  // continental termina ~12.4° lat al norte, lng -71.7 en Punta Gallinas).
  { name: "Caribe norte", minLat: 12.5, maxLat: 16, minLng: -78, maxLng: -71 },
  // Mar Caribe occidental — golfo de Urabá / norte Antioquia.
  {
    name: "Caribe oeste",
    minLat: 9,
    maxLat: 12.5,
    minLng: -78,
    maxLng: -75.8,
  },
  // Mar Caribe oriental — al este de La Guajira.
  {
    name: "Caribe este",
    minLat: 11.5,
    maxLat: 13,
    minLng: -72,
    maxLng: -70.5,
  },
  // Pacífico — al oeste del continente.
  { name: "Pacifico", minLat: 1, maxLat: 8.5, minLng: -83, maxLng: -77.7 },
  // Aguas del archipiélago San Andrés / Providencia. Las islas se rescatan
  // explícitamente con `LAND_BBOXES` (abajo) — gana tierra si el centroide
  // del hex cae sobre la isla, aunque también esté dentro de esta bbox.
  {
    name: "Archipielago aguas",
    minLat: 12,
    maxLat: 13.7,
    minLng: -82.2,
    maxLng: -81.2,
  },
];

/**
 * Polígonos fieles al contorno de las islas del archipiélago
 * (San Andrés, Providencia, Santa Catalina). Cada polígono es un anillo
 * cerrado de coordenadas `[lng, lat]`.
 *
 * Onshore vs offshore = "¿necesita emplazamiento marítimo?". Las islas son
 * tierra firme, no mar. Se usan polígonos (no bboxes rectangulares)
 * porque la línea de costa es curva y los rectángulos atrapaban hexes
 * en el agua o dejaban escapar hexes en la isla.
 *
 * Si el centroide del hex cae dentro de cualquier polígono → `onshore`.
 */
export const LAND_POLYGONS: readonly { name: string; polygon: LngLat[] }[] = [
  {
    name: "San Andres",
    polygon: [
      // Contorno fiel a la línea de costa de San Andrés (~12 km eje N-S,
      // ~3 km ancho máx). 30 vértices con detalle en bahías y la cola SW
      // que llega a South End.
      [-81.7061, 12.5906],
      [-81.7113, 12.5887],
      [-81.7014, 12.5867],
      [-81.7011, 12.5850],
      [-81.6980, 12.5816],
      [-81.6980, 12.5721],
      [-81.6980, 12.5651],
      [-81.6980, 12.5543],
      [-81.6980, 12.5132],
      [-81.7001, 12.5012],
      [-81.7017, 12.4998],
      [-81.7084, 12.5042],
      [-81.7105, 12.5043],
      [-81.7181, 12.4917],
      [-81.7207, 12.4898],
      [-81.7250, 12.4915],
      [-81.7294, 12.4988],
      [-81.7300, 12.5041],
      [-81.7244, 12.5117],
      [-81.7263, 12.5182],
      [-81.7255, 12.5236],
      [-81.7277, 12.5302],
      [-81.7365, 12.5347],
      [-81.7315, 12.5494],
      [-81.7361, 12.5562],
      [-81.7344, 12.5598],
      [-81.7259, 12.5668],
      [-81.7264, 12.5753],
      [-81.7252, 12.5782],
      [-81.7113, 12.5888],
      [-81.7061, 12.5906],
    ],
  },
  {
    name: "Providencia",
    polygon: [
      // Providencia + Santa Catalina. ~7 km de largo. Recorrido horario
      // desde el extremo norte de Santa Catalina, bajando por costa este
      // (Manchineel Bay), rodeando el sur y subiendo por costa oeste
      // (South West Bay).
      [-81.380, 13.395],
      [-81.372, 13.392],
      [-81.367, 13.386],
      [-81.365, 13.378],
      [-81.362, 13.370],
      [-81.360, 13.360],
      [-81.362, 13.348],
      [-81.368, 13.336],
      [-81.378, 13.325],
      [-81.388, 13.330],
      [-81.395, 13.342],
      [-81.398, 13.355],
      [-81.395, 13.368],
      [-81.390, 13.378],
      [-81.388, 13.385],
      [-81.385, 13.390],
      [-81.382, 13.393],
      [-81.380, 13.395],
    ],
  },
];

/** Solo los polígonos (sin nombre) para consumidores que necesiten iterar geometría. */
export const LAND_POLYGON_RINGS: LngLat[][] = LAND_POLYGONS.map((p) => p.polygon);

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
