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
