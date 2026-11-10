import { polygonToCells, latLngToCell } from "h3-js";
import { COLOMBIA_POLYGONS } from "./h3Resolution";

/** Mapeo zoom → resolución H3 (mismo criterio que h3TileIndex) para que la
 *  cuadrícula coincida visualmente. Se usa para el RENDER local (grid por tile,
 *  selección) — cada tile ya acota su propio costo por tamaño en píxeles. */
export function zoomToH3Res(zoom: number): number {
  if (zoom >= 12) return 8;
  if (zoom >= 10) return 7;
  if (zoom >= 8) return 6;
  if (zoom >= 7) return 5;
  if (zoom >= 6) return 4;
  return 3;
}

// ── Presupuesto de hexágonos en pantalla (N) ──────────────────────────────────
// Densidad medida de celdas H3 res8 en Colombia (~16.700 hex/grado², ver
// benchmark-carga-h3). Cada resolución tiene ~7 veces menos celdas que la
// siguiente (razón de hijos de H3), así que la densidad escala geométricamente.
const H3_RES8_DENSITY_PER_DEG2 = 16_700;
const H3_CHILDREN_RATIO = 7;

function h3DensityAtRes(res: number): number {
  return H3_RES8_DENSITY_PER_DEG2 / Math.pow(H3_CHILDREN_RATIO, 8 - res);
}

/**
 * Resolución H3 MÁS FINA tal que el número estimado de hexágonos dentro de
 * `bbox` no supere `targetCount` (N). Reemplaza la tabla fija zoom→res para las
 * consultas de DATOS al backend (`/tiles/variable`, `/tiles/variables-bulk`):
 * antes el área leída por request dependía solo del zoom, no de cuántos
 * hexágonos realmente caían en pantalla — un bbox grande en una resolución fina
 * podía escanear cientos de miles de filas (causa de la caída a ~10 peticiones
 * concurrentes en variables-bulk, ver benchmark-carga-h3).
 *
 * Con esta función, el mapa SIEMPRE pide ~N hexágonos por petición, sin
 * importar el zoom: si el viewport es grande, se pide una resolución más baja
 * (hexágonos más grandes, ya resumidos); si es pequeño, una más alta (detalle).
 * N se calibra por máquina con `tools/loadtest.py` (ver Manual del Sistema).
 */
// ── BBox snapping (Fase B1) ────────────────────────────────────────────────
// Antes, el `viewBox` enviado a `/tiles/variables-bulk` era el bbox CRUDO del
// viewport: mover el mapa unos píxeles cambia el 4º-5º decimal de
// west/south/east/north → distinta clave de caché (`bboxKey`) → refetch
// completo, aunque el usuario casi no se haya movido. Al redondear HACIA
// AFUERA a una grilla fija de `step` grados (floor en el borde inferior, ceil
// en el superior — nunca encoge el área real visible), paneos cortos dentro de
// la misma celda de grilla producen el MISMO bbox exacto → 100% cache-hit en
// el store del cliente (`_layerStore`) sin red, y sin perder nada del viewport
// (la celda de grilla siempre contiene al viewport real).
const BBOX_SNAP_STEP_DEG = 0.15;

export function snapBboxOutward(
  bbox: { west: number; south: number; east: number; north: number },
  step: number = BBOX_SNAP_STEP_DEG,
): { west: number; south: number; east: number; north: number } {
  return {
    west: Math.floor(bbox.west / step) * step,
    south: Math.floor(bbox.south / step) * step,
    east: Math.ceil(bbox.east / step) * step,
    north: Math.ceil(bbox.north / step) * step,
  };
}

export function resForHexBudget(
  bbox: { west: number; south: number; east: number; north: number } | null | undefined,
  targetCount: number = 2000,
): number {
  if (!bbox) return 4; // sin viewport aún (primer render): arranca conservador
  const areaDeg2 = Math.max(0, bbox.east - bbox.west) * Math.max(0, bbox.north - bbox.south);
  if (areaDeg2 <= 0) return 8;
  for (let res = 8; res >= 1; res--) {
    if (areaDeg2 * h3DensityAtRes(res) <= targetCount) return res;
  }
  return 1;
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
 * Filosofía "sólo lo visible" (ADR-014): nada de precomputar las ~840k celdas
 * de Colombia en res8 (cache global pesada). Lo que SÍ se precomputa aquí es
 * ~3 órdenes de magnitud más chico: las celdas padre en RES 4 que cubren el
 * territorio (unos cientos, no cientos de miles) — eso no reintroduce el costo
 * de memoria que el ADR rechazó.
 *
 * Fase B3: antes, cada hex de cada tile hacía ray-casting (`pointInRing`) contra
 * los polígonos reales (5 anillos, ~30.000 vértices en total) — con cientos de
 * hex por tile y varios tiles visibles, esto repetía esa pasada miles de veces
 * por frame y congelaba el hilo principal al mover el mapa. Ahora: `cell =
 * latLngToCell(lat, lng, 4)` (O(1), geometría H3 sin búsqueda) + `Set.has` →
 * lookup O(1).
 *
 * Costo de la aproximación: el padre res4 de un hex (~1.700 km²) es mucho más
 * grande que el hex mismo, así que el filtro puede ACEPTAR algún hex a pocos
 * km fuera del polígono exacto, cerca del borde/costa. Nunca RECHAZA un hex que
 * sí está dentro (el padre de cualquier hijo interior siempre quedó incluido al
 * precomputar sobre el mismo polígono). `pointInRing` queda disponible para
 * validaciones exactas donde ese margen no sea aceptable.
 */
const COLOMBIA_RES4_COVER: ReadonlySet<string> = (() => {
  const set = new Set<string>();
  for (const polygon of COLOMBIA_POLYGONS) {
    for (const cell of polygonToCells(polygon as [number, number][], 4, true)) {
      set.add(cell);
    }
  }
  return set;
})();

export function isInColombia(lat: number, lng: number): boolean {
  return COLOMBIA_RES4_COVER.has(latLngToCell(lat, lng, 4));
}
