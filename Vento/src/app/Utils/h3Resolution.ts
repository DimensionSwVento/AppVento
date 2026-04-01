// --- constantes del mapa ---

export const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const INITIAL_VIEW_STATE = {
  longitude: -73.5,
  latitude: 4.5,
  zoom: 6,
  pitch: 0,
  bearing: 0,
};

// Colombia + vecinos (Panamá, Ecuador, Venezuela, parte de Brasil/Perú)
export const MAX_BOUNDS: [number, number, number, number] = [-82, -5, -66, 14];

export const SNAPSHOT_KEY = "map-snapshot";
