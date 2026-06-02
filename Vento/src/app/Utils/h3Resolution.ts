// --- constantes del mapa ---

export const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const INITIAL_VIEW_STATE = {
  longitude: -73.5,
  latitude: 4.5,
  zoom: 6,
  pitch: 0,
  bearing: 0,
};

// Colombia + mares circundantes (San Andrés, Malpelo, Caribe, Pacífico)
// Bounds extendidos al norte para cubrir San Andrés + Providencia (hasta ~13.5°N)
export const MAX_BOUNDS: [number, number, number, number] = [-82, -4.3, -66.5, 13.5];

export const SNAPSHOT_KEY = "map-snapshot";

// Polígono simplificado de Colombia continental + mares territoriales [lng, lat]
// Usado tanto por el backend (filtro de hexágonos) como por el frontend (cuadrícula).
export const COLOMBIA_POLYGON: [number, number][] = [
  [-77.5, 8.6], [-77.4, 9.0], [-76.8, 9.6], [-76.0, 10.0], [-75.5, 11.2], [-74.8, 11.5],
  [-73.5, 12.8], [-72.0, 12.5], [-71.0, 12.0], [-71.3, 11.0], [-72.2, 7.6], [-72.4, 7.1],
  [-72.0, 6.8], [-67.5, 6.2], [-67.0, 4.0], [-67.8, 2.0], [-69.8, -0.5], [-70.0, -4.2],
  [-73.5, -1.5], [-75.2, -0.1], [-77.6, 0.8], [-78.8, 1.4], [-79.2, 2.0], [-78.5, 3.5],
  [-78.0, 4.2], [-77.8, 5.5], [-78.5, 6.5], [-77.5, 8.6],
];

// Archipiélago de San Andrés, Providencia y Santa Catalina + mares territoriales.
// Rectángulo amplio que cubre ambas islas y sus ZEE para permitir selección offshore.
// San Andrés ≈ [-81.75, 12.5], Providencia ≈ [-81.37, 13.35].
export const ARCHIPELAGO_POLYGON: [number, number][] = [
  [-82.0, 12.2], [-82.0, 13.5], [-81.2, 13.5], [-81.2, 12.2], [-82.0, 12.2],
];

// Lista de todos los polígonos del territorio colombiano usados por la cuadrícula.
// Permite que `polygonToCells` se llame por cada polígono y los resultados se merjeen.
export const COLOMBIA_POLYGONS: [number, number][][] = [
  COLOMBIA_POLYGON,
  ARCHIPELAGO_POLYGON,
];

// Aproximación de la línea de costa real (sólo tierra firme, sin la
// expansión de ~22 km hacia el mar que tiene COLOMBIA_POLYGON). Se usa
// únicamente para clasificar hexes como `onshore` / `offshore` desde
// `Utils/hexClassification.ts`; NO se usa para renderizado.
//
// Cuando llegue el polígono IGAC tierra-firme oficial, reemplazar estos
// vértices manteniendo el mismo nombre.
export const COLOMBIA_LAND_POLYGON: [number, number][] = [
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
