import { describe, it, expect } from "vitest";
import { getRegionFromLatLng, COLOMBIA_DEPARTMENTS } from "./colombiaRegions";

describe("colombiaRegions — getRegionFromLatLng", () => {
  it("identifica La Guajira en (11.5, -72.5) — Riohacha aprox", () => {
    expect(getRegionFromLatLng(11.5, -72.5)).toBe("La Guajira");
  });

  it("identifica Antioquia en (6.25, -75.56) — Medellín", () => {
    expect(getRegionFromLatLng(6.25, -75.56)).toBe("Antioquia");
  });

  it("prioriza Bogotá D.C. sobre Cundinamarca aunque sus bboxes se solapan", () => {
    expect(getRegionFromLatLng(4.7, -74.1)).toBe("Bogotá D.C.");
  });

  it("identifica San Andrés y Providencia en (12.55, -81.72)", () => {
    expect(getRegionFromLatLng(12.55, -81.72)).toBe(
      "San Andrés y Providencia",
    );
  });

  it("retorna 'Sin región' para coordenadas fuera del territorio", () => {
    expect(getRegionFromLatLng(0, 0)).toBe("Sin región");
    expect(getRegionFromLatLng(40, -74)).toBe("Sin región");
  });

  it("incluye al menos los 32 departamentos + Bogotá D.C. + insular", () => {
    expect(COLOMBIA_DEPARTMENTS.length).toBeGreaterThanOrEqual(33);
  });
});
