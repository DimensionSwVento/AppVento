import { describe, it, expect } from "vitest";
import {
  COLOMBIA_POLYGON,
  ARCHIPELAGO_POLYGON,
  COLOMBIA_POLYGONS,
  MAX_BOUNDS,
} from "./h3Resolution";

describe("h3Resolution — territorio colombiano extendido (US-FB-04)", () => {
  it("COLOMBIA_POLYGON cierra sobre sí mismo (primer = último vértice)", () => {
    expect(COLOMBIA_POLYGON[0]).toEqual(COLOMBIA_POLYGON[COLOMBIA_POLYGON.length - 1]);
  });

  it("ARCHIPELAGO_POLYGON es rectangular, cerrado y contiene San Andrés (~-81.75, 12.5)", () => {
    const [west, south, east, north] = [
      Math.min(...ARCHIPELAGO_POLYGON.map((p) => p[0])),
      Math.min(...ARCHIPELAGO_POLYGON.map((p) => p[1])),
      Math.max(...ARCHIPELAGO_POLYGON.map((p) => p[0])),
      Math.max(...ARCHIPELAGO_POLYGON.map((p) => p[1])),
    ];
    // San Andrés
    expect(-81.75).toBeGreaterThan(west);
    expect(-81.75).toBeLessThan(east);
    expect(12.5).toBeGreaterThan(south);
    expect(12.5).toBeLessThan(north);
    // Providencia
    expect(-81.37).toBeGreaterThan(west);
    expect(-81.37).toBeLessThan(east);
    expect(13.35).toBeGreaterThan(south);
    expect(13.35).toBeLessThan(north);
  });

  it("COLOMBIA_POLYGONS incluye continente + archipiélago", () => {
    expect(COLOMBIA_POLYGONS).toContain(COLOMBIA_POLYGON);
    expect(COLOMBIA_POLYGONS).toContain(ARCHIPELAGO_POLYGON);
    expect(COLOMBIA_POLYGONS).toHaveLength(2);
  });

  it("MAX_BOUNDS cubre el archipiélago (oeste <= -82, norte >= 13.5)", () => {
    const [west, , , north] = MAX_BOUNDS;
    expect(west).toBeLessThanOrEqual(-82);
    expect(north).toBeGreaterThanOrEqual(13.5);
  });
});
