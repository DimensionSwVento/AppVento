/**
 * ════════════════════════════════════════════════════════════════════════
 *  CAPAS INFORMATIVAS EN EL MAPA (variables con "mostrar en mapa")
 * ════════════════════════════════════════════════════════════════════════
 * Cada variable marcada como "mostrar en mapa" en el Excel del cliente se pinta
 * según su TIPO de representación:
 *   - `point` → círculo con símbolo (infraestructura: nodos, puertos, vías).
 *   - `zone`  → área coloreada (polígonos): áreas protegidas, resguardos.
 *   - `heat`  → mapa de calor / campo continuo (velocidad y densidad de viento).
 * La leyenda (abajo del área km²) actúa como interruptor por capa.
 *
 * ⚠️ TEMPLATE: coordenadas y valores INVENTADOS (aún no llega la geometría real).
 * Las zonas se aproximan con un parche de hexágonos H3 alrededor de cada punto y
 * el heat con un degradado radial (viridis). Cuando llegue el dato real,
 * reemplazar `points` (idealmente por fetch de polígonos/valores por hex).
 */
import { latLngToCell } from "h3-js";
import { viridis } from "../report/heatmapPalette";

export interface MapSymbolPoint {
  lng: number;
  lat: number;
  nombre: string;
}

export type MapSymbolKind = "point" | "zone" | "heat";

export interface MapSymbol {
  /** id de la variable en el catálogo (slug). Clave única + toggle. */
  variableId: string;
  label: string;
  /** Texto de la leyenda que INTERPRETA el símbolo. */
  descripcion: string;
  /** Tipo de representación en el mapa. */
  kind: MapSymbolKind;
  /** Color base (swatch de leyenda + relleno de zona). */
  color: string;
  /** Icono (data-URI SVG) para la leyenda. */
  icon: string;
  /** Puntos: marcadores (`point`), centros de zona (`zone`) o focos (`heat`). */
  points: MapSymbolPoint[];
}

/** Construye un data-URI SVG: círculo relleno + un glifo blanco interno. */
function circleIcon(fill: string, glyphPath: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">` +
    `<circle cx="24" cy="24" r="19" fill="${fill}" stroke="#ffffff" stroke-width="3"/>` +
    `<path d="${glyphPath}" fill="#ffffff"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Glifos (48×48). Inventados/simples — el significado real lo da la leyenda.
const GLYPH = {
  bolt: "M27 12 L15 27 h7 l-2 9 12 -17 h-7 z", // energía / infraestructura
  pin: "M24 12 a8 8 0 0 0 -8 8 c0 6 8 16 8 16 s8 -10 8 -16 a8 8 0 0 0 -8 -8 z", // ubicación
  leaf: "M33 15 C21 15 15 23 15 33 C25 33 33 25 33 15 Z", // biótico / vegetación
  drop: "M24 12 C24 12 33 24 33 30 a9 9 0 0 1 -18 0 C15 24 24 12 24 12 Z", // agua / marino
  wind: "M13 20 h16 a4 4 0 1 0 -4 -4 M13 27 h22 a4 4 0 1 1 -4 4", // viento
};

/** "#rrggbb" → [r,g,b]. */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Hash determinista de un índice H3 (para variar tamaños/bordes de zona). */
function hashCell(h: string): number {
  let acc = 0;
  for (let i = 0; i < h.length; i++) acc = (acc * 31 + h.charCodeAt(i)) | 0;
  return Math.abs(acc);
}

const P = (lng: number, lat: number, nombre: string): MapSymbolPoint => ({ lng, lat, nombre });

export const MAP_SYMBOLS: MapSymbol[] = [
  // ─── Técnica · Infraestructura y red (PUNTOS) ────────────────────────────
  {
    variableId: "nodos-conexion", kind: "point", color: "#165170",
    label: "Nodos de conexión (SIN)",
    descripcion: "Punto de conexión a la red eléctrica nacional.",
    icon: circleIcon("#165170", GLYPH.bolt),
    points: [
      P(-74.08, 4.65, "Bogotá"), P(-75.57, 6.24, "Medellín"), P(-76.52, 3.44, "Cali"),
      P(-74.8, 10.96, "Barranquilla"), P(-72.55, 11.05, "La Guajira"),
    ],
  },
  {
    variableId: "distancia-portuaria", kind: "point", color: "#0891b2",
    label: "Infraestructura portuaria",
    descripcion: "Grandes centros portuarios (referencia de distancia).",
    icon: circleIcon("#0891b2", GLYPH.pin),
    points: [
      P(-75.51, 10.39, "Cartagena"), P(-77.02, 3.88, "Buenaventura"),
      P(-74.2, 11.24, "Santa Marta"), P(-74.8, 10.99, "Barranquilla"),
    ],
  },
  {
    variableId: "distancia-vial", kind: "point", color: "#d97706",
    label: "Infraestructura vial",
    descripcion: "Vías terrestres principales (referencia de distancia).",
    icon: circleIcon("#d97706", GLYPH.pin),
    points: [
      P(-74.1, 4.6, "Corredor Bogotá"), P(-75.6, 6.25, "Corredor Medellín"),
      P(-73.12, 7.12, "Corredor Bucaramanga"),
    ],
  },
  // ─── Ambiental · Áreas protegidas (ZONAS coloreadas) ──────────────────────
  {
    variableId: "reproduccion-aves", kind: "zone", color: "#16a34a",
    label: "Zonas de reproducción de aves",
    descripcion: "Sitios de reproducción de aves (área).",
    icon: circleIcon("#16a34a", GLYPH.leaf),
    points: [P(-71.3, 4.1, "Llanos"), P(-74.3, 9.5, "Bajo Magdalena"), P(-70.5, -1.0, "Amazonía")],
  },
  {
    variableId: "biodiversidad", kind: "zone", color: "#059669",
    label: "Áreas clave para la biodiversidad",
    descripcion: "Zonas legalmente designadas para la conservación (área).",
    icon: circleIcon("#059669", GLYPH.leaf),
    points: [P(-76.6, 5.8, "Chocó"), P(-70.0, -1.2, "Amazonas"), P(-73.7, 10.8, "Sierra Nevada")],
  },
  {
    variableId: "humedales-ramsar", kind: "zone", color: "#2563eb",
    label: "Humedales RAMSAR",
    descripcion: "Humedales designados bajo la convención RAMSAR (área).",
    icon: circleIcon("#2563eb", GLYPH.drop),
    points: [P(-74.4, 10.8, "Ciénaga Grande"), P(-72.9, 5.55, "Laguna de Tota"), P(-67.5, 3.7, "Estrella Fluvial")],
  },
  {
    variableId: "mares-coralinos", kind: "zone", color: "#e11d48",
    label: "Áreas coralinas",
    descripcion: "Áreas con presencia de arrecifes coralinos (área).",
    icon: circleIcon("#e11d48", GLYPH.drop),
    points: [P(-75.75, 10.17, "Islas del Rosario"), P(-81.7, 12.58, "San Andrés"), P(-81.37, 13.35, "Providencia")],
  },
  {
    variableId: "playas-tortugas", kind: "zone", color: "#0d9488",
    label: "Playas de anidación de tortugas",
    descripcion: "Sitios de anidación de tortugas marinas (área).",
    icon: circleIcon("#0d9488", GLYPH.drop),
    points: [P(-71.3, 12.2, "Alta Guajira"), P(-77.4, 6.0, "Pacífico Chocó"), P(-74.03, 11.32, "Tayrona")],
  },
  // ─── Social · Sensibilidad territorial (ZONA coloreada) ───────────────────
  {
    variableId: "resguardos-indigenas", kind: "zone", color: "#7c3aed",
    label: "Resguardos indígenas",
    descripcion: "Territorios de resguardo indígena (área; posible consulta previa).",
    icon: circleIcon("#7c3aed", GLYPH.pin),
    points: [P(-72.3, 11.4, "Guajira"), P(-70.2, -1.5, "Amazonas"), P(-76.6, 2.6, "Cauca"), P(-70.2, 1.2, "Vaupés")],
  },
  // ─── Técnica · Recurso eólico (MAPA DE CALOR) ─────────────────────────────
  {
    variableId: "velocidad-viento", kind: "heat", color: "#0ea5e9",
    label: "Velocidad del viento",
    descripcion: "Velocidad media del viento (mapa de calor; más cálido = mayor).",
    icon: circleIcon("#0ea5e9", GLYPH.wind),
    points: [P(-72.0, 11.8, "Alta Guajira"), P(-72.9, 10.5, "Ranchería"), P(-74.9, 10.9, "Costa Atlántico")],
  },
  {
    variableId: "densidad-viento", kind: "heat", color: "#6366f1",
    label: "Densidad de viento",
    descripcion: "Densidad del viento (mapa de calor; más cálido = mayor).",
    icon: circleIcon("#6366f1", GLYPH.wind),
    points: [P(-71.6, 12.0, "Punta Gallinas"), P(-73.2, 10.8, "Cesar norte")],
  },
];

export interface SymbolPolygon {
  polygon: [number, number][];
  color: [number, number, number, number];
}

export interface SymbolPath {
  path: [number, number][];
  color: [number, number, number, number];
}

const DEG = Math.PI / 180;

/** Pseudo-aleatorio determinista en [0,1) a partir de una semilla + índice. */
function rnd(seed: number, i: number): number {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Semilla estable a partir de un punto (para que la forma no cambie por frame). */
function seedOf(p: MapSymbolPoint): number {
  return hashCell(latLngToCell(p.lat, p.lng, 7));
}

/**
 * Anillo ORGÁNICO (blob irregular) alrededor de un punto: radio variable por
 * vértice → contorno natural, no un círculo. `kx` corrige el aspecto lng/lat.
 */
function blobRing(
  lng: number,
  lat: number,
  rDeg: number,
  seed: number,
): [number, number][] {
  const N = 16;
  const kx = 1 / Math.cos(lat * DEG);
  const ring: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * 2 * Math.PI;
    const w = 0.5 + 0.5 * rnd(seed, i); // radio 0.5..1.0 del máximo
    const r = rDeg * w;
    ring.push([lng + r * kx * Math.cos(a), lat + r * Math.sin(a)]);
  }
  ring.push(ring[0]);
  return ring;
}

/**
 * Nube de VIENTO (mapa de calor por área): blobs orgánicos ANIDADOS de radio
 * decreciente, coloreados con viridis de fuera (frío) hacia dentro (cálido). El
 * solape natural intensifica el centro → se ve como una nube/área de calor, no
 * una esfera ni un corredor. Devuelve los anillos del más grande al más chico
 * (se dibujan en ese orden → el cálido queda encima).
 */
function heatCloud(
  lng: number,
  lat: number,
  seed: number,
  ramp: (t: number) => [number, number, number],
): SymbolPolygon[] {
  const rMax = 0.3; // ~30 km de radio exterior
  const rings = [
    { s: 1.0, t: 0.18 },
    { s: 0.74, t: 0.42 },
    { s: 0.5, t: 0.66 },
    { s: 0.28, t: 0.9 },
  ];
  return rings.map((ring, i) => {
    const [r, g, b] = ramp(ring.t);
    return {
      polygon: blobRing(lng, lat, rMax * ring.s, seed + i * 17),
      color: [r, g, b, 85] as [number, number, number, number],
    };
  });
}

/** Rampa cálido→frío por variable de viento: velocidad = viridis; densidad =
 *  intensidad mono-tono (claro→color base) para distinguirlas visualmente. */
function windRamp(s: MapSymbol): (t: number) => [number, number, number] {
  if (s.variableId === "densidad-viento") {
    const [br, bg, bb] = hexToRgb(s.color);
    return (t) => {
      const m = 0.2 + 0.8 * t; // 0.2..1 → claro (poco denso) a intenso (denso)
      return [
        Math.round(255 - (255 - br) * m),
        Math.round(255 - (255 - bg) * m),
        Math.round(255 - (255 - bb) * m),
      ];
    };
  }
  return viridis;
}

/**
 * Polígonos (deck.gl) — polígonos REALES en el mapa (no celdas H3). `zone` →
 * blob orgánico coloreado; `heat` → corredor de viento con gradiente viridis.
 */
export function symbolPolygons(s: MapSymbol): SymbolPolygon[] {
  const out: SymbolPolygon[] = [];
  if (s.kind === "zone") {
    const [r, g, b] = hexToRgb(s.color);
    for (const p of s.points) {
      const seed = seedOf(p);
      const rDeg = 0.12 + (seed % 5) * 0.035; // ~13..28 km, variable por zona
      out.push({ polygon: blobRing(p.lng, p.lat, rDeg, seed), color: [r, g, b, 90] });
    }
  } else if (s.kind === "heat") {
    const ramp = windRamp(s);
    for (const p of s.points) out.push(...heatCloud(p.lng, p.lat, seedOf(p), ramp));
  }
  return out;
}

/**
 * Líneas de RED — SOLO para "nodos de conexión": conecta sus puntos con una
 * polilínea → transmite la red eléctrica interconectada (SIN). El resto de
 * capas de puntos (puertos, vías) NO se conectan (no forman una red).
 */
export function symbolPaths(s: MapSymbol): SymbolPath[] {
  if (s.variableId !== "nodos-conexion" || s.points.length < 2) return [];
  const [r, g, b] = hexToRgb(s.color);
  return [{ path: s.points.map((p) => [p.lng, p.lat]), color: [r, g, b, 170] }];
}
