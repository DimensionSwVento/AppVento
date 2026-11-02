import { describe, it, expect } from "vitest";
import { gridDisk, latLngToCell } from "h3-js";

import { tileToBBox, zoomToH3Res, pointInRing, isInColombia } from "@/app/Utils/h3/mapGeo";
import { isPointInColombia, COLOMBIA_POLYGONS } from "@/app/Utils/h3/h3Resolution";
import { calcAreaKm2 } from "@/app/Utils/report/areaCalc";
import { getCentroid } from "@/app/Utils/report/reportData";
import { generalScore, dimensionScore } from "@/app/Utils/report/heatmapPalette";
import { compactHexes, uncompactHexes } from "@/app/Utils/historial/hexCodec";

// Processing — CRS consistency between the map's Web-Mercator tiles (EPSG:3857
// slippy-map scheme), geographic coordinates (EPSG:4326, [lng, lat] as in GeoJSON)
// and the H3 grid; and reproducibility of the spatial computations.

/** Independent reference: OSM slippy-map formulas (lng/lat → tile x/y). */
function lngLatToTile(lng: number, lat: number, z: number): [number, number] {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return [x, y];
}
const MERCATOR_MAX_LAT = 85.0511287798066;

describe("CRS consistency — Web-Mercator tiles ↔ geographic bbox", () => {
  it("z0 covers the whole Web-Mercator world", () => {
    const [w, s, e, n] = tileToBBox(0, 0, 0);
    expect(w).toBe(-180);
    expect(e).toBe(180);
    expect(n).toBeCloseTo(MERCATOR_MAX_LAT, 9);
    expect(s).toBeCloseTo(-MERCATOR_MAX_LAT, 9);
  });

  it("z1 quadrants split at the Greenwich meridian and the Equator (tile y grows southwards)", () => {
    expect(tileToBBox(1, 0, 0)).toEqual([-180, 0, 0, expect.closeTo(MERCATOR_MAX_LAT, 9)]);
    const [w, s, e, n] = tileToBBox(1, 1, 1);
    expect([w, e, n]).toEqual([0, 180, 0]);
    expect(s).toBeCloseTo(-MERCATOR_MAX_LAT, 9);
  });

  it.each([
    ["Bogotá", 4.711, -74.0721],
    ["Riohacha", 11.5444, -72.9072],
    ["Leticia", -4.2153, -69.9406],
    ["San Andrés", 12.5847, -81.7006],
  ])("round trip lng/lat → tile → bbox contains %s at every zoom used by the map", (_n, lat, lng) => {
    for (let z = 3; z <= 14; z++) {
      const [x, y] = lngLatToTile(lng, lat, z);
      const [w, s, e, n] = tileToBBox(z, x, y);
      expect(lng).toBeGreaterThanOrEqual(w);
      expect(lng).toBeLessThan(e);
      expect(lat).toBeGreaterThanOrEqual(s);
      expect(lat).toBeLessThan(n);
    }
  });

  it("neighbouring tiles share their edges exactly (no gaps or overlaps between tiles)", () => {
    const z = 9;
    const [x, y] = lngLatToTile(-74.07, 4.71, z);
    const here = tileToBBox(z, x, y);
    const east = tileToBBox(z, x + 1, y);
    const south = tileToBBox(z, x, y + 1);
    expect(east[0]).toBe(here[2]);
    expect(south[3]).toBe(here[1]);
  });

  it("the 4 children of a tile partition its bbox", () => {
    const [w, s, e, n] = tileToBBox(6, 18, 31);
    const tl = tileToBBox(7, 36, 62);
    const br = tileToBBox(7, 37, 63);
    expect(tl[0]).toBe(w);
    expect(tl[3]).toBeCloseTo(n, 12);
    expect(br[2]).toBe(e);
    expect(br[1]).toBeCloseTo(s, 12);
    expect(tl[2]).toBe(br[0]);
    expect(tl[1]).toBeCloseTo(br[3], 12);
  });

  it("zoom → H3 resolution is monotonic and stays within the supported range (3..8)", () => {
    let prev = -1;
    for (let z = 0; z <= 20; z += 0.5) {
      const r = zoomToH3Res(z);
      expect(r).toBeGreaterThanOrEqual(prev);
      expect(r).toBeGreaterThanOrEqual(3);
      expect(r).toBeLessThanOrEqual(8);
      prev = r;
    }
    expect(zoomToH3Res(12)).toBe(8);
    expect(zoomToH3Res(10)).toBe(7);
  });
});

describe("CRS consistency — axis order and territory predicates", () => {
  it("pointInRing reads rings as GeoJSON [lng, lat] (a lat/lng swap is rejected)", () => {
    const ring: [number, number][] = [
      [-75, 4],
      [-73, 4],
      [-73, 6],
      [-75, 6],
    ];
    expect(pointInRing(5, -74, ring)).toBe(true);
    expect(pointInRing(-74, 5, ring)).toBe(false);
  });

  it("the two 'inside Colombia' predicates used by the map and by the selection agree on a 0.25° grid", () => {
    const disagreements: [number, number][] = [];
    for (let lat = -4.25; lat <= 13.5; lat += 0.25) {
      for (let lng = -82; lng <= -66.75; lng += 0.25) {
        if (isInColombia(lat, lng) !== isPointInColombia(lat, lng)) disagreements.push([lat, lng]);
      }
    }
    expect(disagreements).toEqual([]);
  });

  it("H3 cells indexed from a Colombian lat/lng have their centre inside the territory polygons", () => {
    const h = latLngToCell(4.711, -74.0721, 8);
    const c = getCentroid(new Set([h]))!;
    expect(COLOMBIA_POLYGONS.some((p) => pointInRing(c.lat, c.lng, p as [number, number][]))).toBe(true);
    expect(Math.abs(c.lat - 4.711)).toBeLessThan(0.01);
    expect(Math.abs(c.lng + 74.0721)).toBeLessThan(0.01);
  });
});

describe("Reproducibility of spatial computations", () => {
  const cells = gridDisk(latLngToCell(11.5, -72.5, 7), 4);
  const shuffled = [...cells].reverse();
  const rotated = [...cells.slice(17), ...cells.slice(0, 17)];

  it("area does not depend on the order in which hexagons were selected", () => {
    const a = calcAreaKm2(new Set(cells));
    expect(calcAreaKm2(new Set(shuffled))).toBeCloseTo(a, 9);
    expect(calcAreaKm2(new Set(rotated))).toBeCloseTo(a, 9);
  });

  it("centroid does not depend on selection order", () => {
    const c = getCentroid(new Set(cells))!;
    const c2 = getCentroid(new Set(shuffled))!;
    expect(c2.lat).toBeCloseTo(c.lat, 9);
    expect(c2.lng).toBeCloseTo(c.lng, 9);
  });

  it("suitability scores are deterministic and order-independent for the same area", () => {
    const g = generalScore(new Set(cells));
    expect(generalScore(new Set(cells))).toBe(g);
    expect(generalScore(new Set(shuffled))).toBe(g);
    for (const dim of ["ambiental", "tecnica", "social"]) {
      const d = dimensionScore(dim, new Set(cells));
      expect(dimensionScore(dim, new Set(rotated))).toBe(d);
    }
  });

  it("storing the selection (compact) is deterministic and its decoding is order-independent", () => {
    const c1 = compactHexes(cells);
    const c2 = compactHexes(shuffled);
    expect(new Set(c2)).toEqual(new Set(c1));
    expect(new Set(uncompactHexes(c2))).toEqual(new Set(cells));
  });
});
