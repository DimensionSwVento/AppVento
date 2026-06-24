import { describe, it, expect } from "vitest";
import { latLngToCell, cellArea } from "h3-js";
import { calcAreaKm2 } from "./areaCalc";

describe("areaCalc — calcAreaKm2 (US03-P2 AC1)", () => {
  it("devuelve 0 cuando no hay hexágonos seleccionados", () => {
    expect(calcAreaKm2(new Set())).toBe(0);
  });

  it("para un único hexágono devuelve el área de ese hex (h3-js cellArea)", () => {
    const hex = latLngToCell(4.7, -74.07, 7);
    const expected = cellArea(hex, "km2");
    expect(calcAreaKm2(new Set([hex]))).toBeCloseTo(expected, 6);
  });

  it("para N hexágonos devuelve la suma de áreas individuales", () => {
    const hexes = [
      latLngToCell(4.7, -74.07, 7),
      latLngToCell(6.25, -75.56, 7),
      latLngToCell(10.4, -75.5, 7),
    ];
    const expected = hexes.reduce((sum, h) => sum + cellArea(h, "km2"), 0);
    expect(calcAreaKm2(new Set(hexes))).toBeCloseTo(expected, 6);
  });

  it("ignora duplicados (un Set no los admite)", () => {
    const hex = latLngToCell(4.7, -74.07, 7);
    const expected = cellArea(hex, "km2");
    expect(calcAreaKm2(new Set([hex, hex, hex]))).toBeCloseTo(expected, 6);
  });
});
