import { describe, it, expect } from "vitest";
import { latLngToCell, polygonToCells } from "h3-js";
import {
  COLOMBIA_IGAC_METADATA,
  COLOMBIA_IGAC_POLYGONS,
  COLOMBIA_POLYGON,
  COLOMBIA_POLYGONS,
  MAX_BOUNDS,
  isPointInColombia,
} from "./h3Resolution";

function cellsForPolygons(resolution: number): Set<string> {
  const cells = new Set<string>();
  for (const polygon of COLOMBIA_POLYGONS) {
    for (const cell of polygonToCells(polygon, resolution, true)) {
      cells.add(cell);
    }
  }
  return cells;
}

describe("h3Resolution - cartografia oficial IGAC (US-FB2-02)", () => {
  it("COLOMBIA_POLYGON viene del artefacto IGAC y cierra sobre si mismo", () => {
    expect(COLOMBIA_IGAC_METADATA.source).toContain("IGAC");
    expect(COLOMBIA_POLYGON[0]).toEqual(
      COLOMBIA_POLYGON[COLOMBIA_POLYGON.length - 1],
    );
    expect(COLOMBIA_POLYGON.length).toBeGreaterThan(500);
  });

  it("COLOMBIA_POLYGONS expone sólo los polígonos IGAC (el archipiélago ya está cubierto por las 12 millas náuticas)", () => {
    expect(COLOMBIA_IGAC_POLYGONS.length).toBeGreaterThanOrEqual(1);
    expect(COLOMBIA_POLYGONS).toContain(COLOMBIA_POLYGON);
    expect(COLOMBIA_POLYGONS.length).toBe(COLOMBIA_IGAC_POLYGONS.length);
  });

  it("IGAC incluye San Andres y Providencia (via 12 millas náuticas del territorio marítimo)", () => {
    expect(isPointInColombia(12.58, -81.7)).toBe(true);
    expect(isPointInColombia(13.35, -81.37)).toBe(true);
  });

  it("MAX_BOUNDS cubre continente, costas y archipielago", () => {
    const [west, south, east, north] = MAX_BOUNDS;
    expect(west).toBeLessThanOrEqual(-82);
    expect(south).toBeLessThanOrEqual(-4.3);
    expect(east).toBeGreaterThanOrEqual(-66.85689);
    expect(north).toBeGreaterThanOrEqual(13.5);
  });

  it("isPointInColombia usa la cartografia compartida para continente, archipielago y oceanos fuera del alcance", () => {
    expect(isPointInColombia(4.711, -74.0721)).toBe(true); // Bogota
    expect(isPointInColombia(10.9639, -74.7964)).toBe(true); // costa Caribe
    expect(isPointInColombia(3.8906, -77.0700)).toBe(true); // costa Pacifica
    expect(isPointInColombia(12.58, -81.7)).toBe(true); // San Andres
    expect(isPointInColombia(0, -85)).toBe(false);
    expect(isPointInColombia(15, -74)).toBe(false);
  });

  // cellsForPolygons(5) tarda ~4s en frío y >20s bajo instrumentación de
  // cobertura V8 — el timeout default de 5s lo hacía flaky.
  it("polygonToCells produce celdas en zonas de control: Caribe, Pacifico, frontera y archipielago", { timeout: 60_000 }, () => {
    const cells = cellsForPolygons(5);
    const controls = [
      { name: "Caribe", lat: 10.9639, lng: -74.7964 },
      { name: "Pacifico", lat: 3.8906, lng: -77.0700 },
      { name: "frontera oriental", lat: 4.711, lng: -69.414 },
      { name: "frontera sur", lat: -4.203, lng: -69.94 },
      { name: "archipielago", lat: 12.58, lng: -81.7 },
    ];

    for (const control of controls) {
      expect(cells.has(latLngToCell(control.lat, control.lng, 5)), control.name).toBe(true);
    }
  });
});
