import { describe, it, expect, beforeAll } from "vitest";
import { latLngToCell, gridDisk, cellToParent, getResolution } from "h3-js";
import type { H3HexagonData } from "./parseH3Parquet";
import {
  initTileIndex,
  isIndexReady,
  getHexagonsForTile,
  getHexDetail,
  getVariableRange,
  getAvailableVariables,
  getGlobalCounts,
} from "./h3TileIndex";

/**
 * Test de integración con h3-js REAL (sin mocks): fixture pequeño de celdas
 * res 8 alrededor de Bogotá + una celda fuera de Colombia (París) que el
 * índice debe filtrar.
 */

// Web-mercator: tile que contiene un lat/lng a un zoom dado.
function tileForLatLng(lat: number, lng: number, z: number): { x: number; y: number } {
  const x = Math.floor(((lng + 180) / 360) * 2 ** z);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * 2 ** z,
  );
  return { x, y };
}

const BOGOTA = { lat: 4.65, lng: -74.1 };
const PARIS = { lat: 48.85, lng: 2.35 };

const bogotaCenter = latLngToCell(BOGOTA.lat, BOGOTA.lng, 8);
const bogotaCells = gridDisk(bogotaCenter, 2); // 19 celdas res 8
const parisCell = latLngToCell(PARIS.lat, PARIS.lng, 8);

const VAR_WIND = "001_velocidad_de_viento/mean";
const VAR_ROCK = "009_profundidad_roca/text";

function makeHex(h3Index: string, i: number): H3HexagonData {
  return {
    h3_index: h3Index,
    // score > 0 para usar el score original (no el placeholder).
    score_general: 0.4 + (i % 5) * 0.1, // 0.4 .. 0.8
    tipo_celda: "continental",
    variables: {
      [VAR_WIND]: 5 + i * 0.5,
      [VAR_ROCK]: "superficiales",
    },
  } as H3HexagonData;
}

beforeAll(() => {
  const hexagons = [
    ...bogotaCells.map((h, i) => makeHex(h, i)),
    makeHex(parisCell, 0),
  ];
  initTileIndex(hexagons, [VAR_WIND]);
});

describe("h3TileIndex — initTileIndex", () => {
  it("marca el índice como listo", () => {
    expect(isIndexReady()).toBe(true);
  });

  it("filtra los hexágonos fuera de Colombia", () => {
    expect(getHexDetail(parisCell)).toBeNull();
    expect(getHexDetail(bogotaCenter)).not.toBeNull();
  });

  it("calcula rangos min/max de variables numéricas", () => {
    const range = getVariableRange(VAR_WIND);
    expect(range).not.toBeNull();
    expect(range!.min).toBeCloseTo(5);
    expect(range!.max).toBeCloseTo(5 + (bogotaCells.length - 1) * 0.5);
  });

  it("expone las variables disponibles", () => {
    expect(getAvailableVariables()).toEqual([VAR_WIND]);
  });
});

describe("h3TileIndex — getHexDetail", () => {
  it("retorna el detalle completo de un hex de res 8", () => {
    const detail = getHexDetail(bogotaCenter)!;
    expect(detail.h3_index).toBe(bogotaCenter);
    expect(detail.tipo_celda).toBe("continental");
    expect(detail.score_general).toBeGreaterThan(0);
    expect(detail.variables[VAR_WIND]).toBeDefined();
  });

  it("retorna null para un hex desconocido", () => {
    const unknown = latLngToCell(10.4, -75.5, 8); // Cartagena — no está en el fixture
    expect(getHexDetail(unknown)).toBeNull();
  });
});

describe("h3TileIndex — getHexagonsForTile", () => {
  it("a zoom alto (res 8) retorna las celdas originales dentro del tile", () => {
    const { x, y } = tileForLatLng(BOGOTA.lat, BOGOTA.lng, 12);
    const tiles = getHexagonsForTile(12, x, y);
    expect(tiles.length).toBeGreaterThan(0);
    for (const t of tiles) {
      expect(getResolution(t.h)).toBe(8);
      expect(bogotaCells).toContain(t.h);
    }
  });

  it("a zoom bajo agrega las celdas a la resolución del zoom (parents)", () => {
    const { x, y } = tileForLatLng(BOGOTA.lat, BOGOTA.lng, 7);
    const tiles = getHexagonsForTile(7, x, y); // zoom 7 → res 5
    expect(tiles.length).toBeGreaterThan(0);
    const expectedParents = new Set(bogotaCells.map((h) => cellToParent(h, 5)));
    for (const t of tiles) {
      expect(getResolution(t.h)).toBe(5);
      expect(expectedParents.has(t.h)).toBe(true);
    }
    // La agregación promedia scores → sigue siendo un valor 0..1.
    expect(tiles[0].s).toBeGreaterThan(0);
    expect(tiles[0].s).toBeLessThanOrEqual(1);
  });

  it("incluye el valor de la variable filtrada cuando se pide", () => {
    const { x, y } = tileForLatLng(BOGOTA.lat, BOGOTA.lng, 12);
    const tiles = getHexagonsForTile(12, x, y, VAR_WIND);
    expect(tiles.length).toBeGreaterThan(0);
    for (const t of tiles) {
      expect(typeof t.v).toBe("number");
    }
  });

  it("un tile lejano (sin datos) retorna []", () => {
    const { x, y } = tileForLatLng(PARIS.lat, PARIS.lng, 12);
    expect(getHexagonsForTile(12, x, y)).toEqual([]);
  });
});

describe("h3TileIndex — getGlobalCounts", () => {
  it("cuenta el total de celdas a la resolución del zoom", () => {
    const counts = getGlobalCounts(12, []);
    expect(counts.total).toBe(bogotaCells.length);
    expect(counts.selected).toBe(0);
    // Todos los scores del fixture (0.4–0.8) superan el umbral 0.33.
    expect(counts.aboveThreshold).toBe(bogotaCells.length);
  });

  it("cuenta seleccionados con match directo de resolución", () => {
    const counts = getGlobalCounts(12, [bogotaCenter]);
    expect(counts.selected).toBe(1);
  });

  it("mapea seleccionados de mayor resolución a su parent", () => {
    // Un hijo res 9 del centro → debe contar a su parent res 8.
    const child = latLngToCell(BOGOTA.lat, BOGOTA.lng, 9);
    const counts = getGlobalCounts(12, [child]);
    expect(counts.selected).toBe(1);
  });
});
