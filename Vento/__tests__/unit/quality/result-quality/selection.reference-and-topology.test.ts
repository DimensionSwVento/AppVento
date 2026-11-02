import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import {
  cellToLatLng,
  cellToParent,
  getResolution,
  gridDisk,
  latLngToCell,
  compactCells,
} from "h3-js";

import { useMapSelection } from "@/app/Components/map/useMapSelection";
import { calcAreaKm2 } from "@/app/Utils/report/areaCalc";
import { getCentroid, formatCoordenadas } from "@/app/Utils/report/reportData";
import { compactHexes, uncompactHexes } from "@/app/Utils/historial/hexCodec";
import {
  areaRangeForCapacity,
  calcNumAerogeneradores,
  turbinePotenciaMW,
  AEROGENERADORES,
} from "@/app/Utils/projectData";

// Result quality — the numbers the prefeasibility report shows (selected area,
// centroid, number of turbines, expected area for a capacity) are validated
// against INDEPENDENT reference values computed by hand (closed-form spherical
// geometry and hand arithmetic), not against the library the product calls.
// Topological consistency of the polygon → H3 cells selection is checked too.

// Authalic Earth radius (km): the sphere with the same surface as WGS84; H3 uses
// a sphere of this size for its areas.
const R_KM = 6371.007180918475;
const DEG = Math.PI / 180;

/** Closed-form area of a lat/lng rectangle on the sphere (reference value). */
function sphericalBoxAreaKm2(w: number, s: number, e: number, n: number): number {
  return R_KM * R_KM * (e - w) * DEG * (Math.sin(n * DEG) - Math.sin(s * DEG));
}

type Ring = [number, number][];
const box = (w: number, s: number, e: number, n: number): Ring => [
  [w, s],
  [e, s],
  [e, n],
  [w, n],
];

/** Runs the product's polygon selection (US03-04) and returns the selected cells. */
function selectPolygonWithProduct(ring: Ring, zoom: number): string[] {
  let selected = new Set<string>();
  const setSelectedHexes = vi.fn((u: Set<string> | ((p: Set<string>) => Set<string>)) => {
    selected = typeof u === "function" ? u(selected) : u;
  });
  const { result } = renderHook(() => {
    const [viewState, setViewState] = useState({
      longitude: -74,
      latitude: 4.6,
      zoom,
      pitch: 0,
      bearing: 0,
    });
    return useMapSelection({
      canSelect: true,
      viewState: viewState as never,
      selectedHexes: selected,
      setViewState: setViewState as never,
      clampViewState: (v) => v,
      setSelectedHexes: setSelectedHexes as never,
    });
  });
  act(() => {
    result.current.selectPolygon(ring);
  });
  return [...selected];
}

// Reference areas in the Llanos (Meta): flat, continental, far from the borders.
const W = -73.0;
const S = 4.0;
const E = -72.8;
const N = 4.2;

describe("Result quality — validation against reference values", () => {
  it("selected area of a 0.2°×0.2° box matches the closed-form spherical area within 1.5 % (res 8)", () => {
    const cells = selectPolygonWithProduct(box(W, S, E, N), 12);
    const reference = sphericalBoxAreaKm2(W, S, E, N); // ≈ 493.3 km²
    expect(reference).toBeGreaterThan(493);
    expect(reference).toBeLessThan(493.6);
    const area = calcAreaKm2(new Set(cells));
    expect(Math.abs(area - reference) / reference).toBeLessThan(0.015);
  });

  it("selected area converges to the reference as resolution increases (res 7 vs res 8)", () => {
    const reference = sphericalBoxAreaKm2(W, S, E, N);
    const err7 = Math.abs(calcAreaKm2(new Set(selectPolygonWithProduct(box(W, S, E, N), 10))) - reference);
    const err8 = Math.abs(calcAreaKm2(new Set(selectPolygonWithProduct(box(W, S, E, N), 12))) - reference);
    expect(err7 / reference).toBeLessThan(0.05);
    expect(err8).toBeLessThanOrEqual(err7);
  });

  it("area is additive: two adjacent boxes add up to the box that contains both", () => {
    const left = calcAreaKm2(new Set(selectPolygonWithProduct(box(W, S, -72.9, N), 12)));
    const right = calcAreaKm2(new Set(selectPolygonWithProduct(box(-72.9, S, E, N), 12)));
    const whole = calcAreaKm2(new Set(selectPolygonWithProduct(box(W, S, E, N), 12)));
    expect(left + right).toBeCloseTo(whole, 6);
  });

  it("centroid of a symmetric selection (k-ring) is the centre cell's centre (±0.002°)", () => {
    const center = latLngToCell(4.1, -72.9, 7);
    const [clat, clng] = cellToLatLng(center);
    const c = getCentroid(new Set(gridDisk(center, 3)))!;
    expect(Math.abs(c.lat - clat)).toBeLessThan(0.002);
    expect(Math.abs(c.lng - clng)).toBeLessThan(0.002);
  });

  it("report coordinates are rendered with 4 decimals in es-CO format", () => {
    expect(formatCoordenadas({ lat: 4.60971, lng: -74.08175 })).toBe("4,6097, -74,0818");
  });

  it.each([
    // [area km², category, hand-computed floor(area / area per turbine)]
    [10, "L", 10], // 10 / 1.0
    [10, "M", 16], // 10 / 0.6 = 16.67
    [10, "S", 33], // 10 / 0.3 = 33.33
    [0.2, "L", 1], // below one turbine footprint → at least 1
    [0, "L", 0], // no area → no turbines
  ] as const)("number of turbines for %s km² of category %s is %s", (area, cat, expected) => {
    expect(calcNumAerogeneradores(area, cat)).toBe(expected);
  });

  it("number of turbines is 0 when no category is chosen", () => {
    expect(calcNumAerogeneradores(25, null)).toBe(0);
  });

  it.each([
    // [MW, category, turbines = ceil(MW / P), expected km² = turbines × area/turbine]
    [50, "L", 50, 50.0], // P = 1 MW (open range → min), 50 × 1.0
    [5, "M", 5, 3.0], // P = 1 MW (max), 5 × 0.6
    [0.5, "S", 5, 1.5], // P = 0.1 MW, 5 × 0.3
    [2.5, "M", 3, 1.8], // ceil(2.5) = 3, 3 × 0.6
  ] as const)(
    "expected area for %s MW with category %s: %s turbines → %s km² (band 0.6×–1.6×)",
    (mw, cat, turbines, esperada) => {
      const r = areaRangeForCapacity(mw, cat)!;
      expect(Math.ceil(mw / turbinePotenciaMW(AEROGENERADORES[cat]))).toBe(turbines);
      expect(r.esperada).toBeCloseTo(esperada, 9);
      expect(r.min).toBeCloseTo(esperada * 0.6, 9);
      expect(r.max).toBeCloseTo(esperada * 1.6, 9);
    },
  );

  it("expected area for an invalid capacity is not reported", () => {
    expect(areaRangeForCapacity(0, "L")).toBeNull();
    expect(areaRangeForCapacity(-3, "L")).toBeNull();
    expect(areaRangeForCapacity(Number.NaN, "L")).toBeNull();
  });
});

describe("Result quality — topological consistency of the polygon selection", () => {
  const cells = selectPolygonWithProduct(box(W, S, E, N), 12);
  const set = new Set(cells);

  it("produces a non-trivial set with no duplicates, all at the displayed resolution", () => {
    expect(cells.length).toBeGreaterThan(500);
    expect(set.size).toBe(cells.length);
    expect(new Set(cells.map(getResolution))).toEqual(new Set([8]));
  });

  it("every selected cell has its centre inside the drawn polygon (no spill-over)", () => {
    for (const h of cells) {
      const [lat, lng] = cellToLatLng(h);
      expect(lng).toBeGreaterThanOrEqual(W);
      expect(lng).toBeLessThanOrEqual(E);
      expect(lat).toBeGreaterThanOrEqual(S);
      expect(lat).toBeLessThanOrEqual(N);
    }
  });

  it("has no gaps: every neighbour whose centre lies inside the polygon is selected", () => {
    const missing: string[] = [];
    for (const h of cells) {
      for (const nb of gridDisk(h, 1)) {
        if (set.has(nb)) continue;
        const [lat, lng] = cellToLatLng(nb);
        if (lng > W && lng < E && lat > S && lat < N) missing.push(nb);
      }
    }
    expect(missing).toEqual([]);
  });

  it("is a single connected region (one component under H3 adjacency)", () => {
    const seen = new Set<string>([cells[0]]);
    const queue = [cells[0]];
    while (queue.length) {
      const h = queue.pop()!;
      for (const nb of gridDisk(h, 1)) {
        if (set.has(nb) && !seen.has(nb)) {
          seen.add(nb);
          queue.push(nb);
        }
      }
    }
    expect(seen.size).toBe(set.size);
  });

  it("adjacent polygons partition the cells: no overlap and no loss along the shared edge", () => {
    const left = new Set(selectPolygonWithProduct(box(W, S, -72.9, N), 12));
    const right = new Set(selectPolygonWithProduct(box(-72.9, S, E, N), 12));
    const overlap = [...left].filter((h) => right.has(h));
    expect(overlap).toEqual([]);
    expect(new Set([...left, ...right])).toEqual(set);
  });

  it("the stored (compacted) selection has no overlapping cells and decompacts losslessly", () => {
    const compact = compactHexes(cells);
    expect(compact.length).toBeLessThan(cells.length);
    // No compacted cell is an ancestor of another one (disjoint cover).
    const asSet = new Set(compact);
    for (const h of compact) {
      for (let r = getResolution(h) - 1; r >= 0; r--) {
        expect(asSet.has(cellToParent(h, r))).toBe(false);
      }
    }
    expect(compact).toEqual(compactCells(cells));
    expect(new Set(uncompactHexes(compact))).toEqual(set);
    expect(calcAreaKm2(new Set(compact))).toBeCloseTo(calcAreaKm2(set), 4);
  });

  it("mixed-resolution selections are stored as-is (safe fallback, nothing lost)", () => {
    const mixed = [latLngToCell(4.1, -72.9, 7), latLngToCell(4.15, -72.85, 8)];
    expect(compactHexes(mixed)).toEqual(mixed);
  });
});
