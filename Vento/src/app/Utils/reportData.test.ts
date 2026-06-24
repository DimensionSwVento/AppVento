import { describe, it, expect } from "vitest";
import { latLngToCell } from "h3-js";
import {
  formatCoordenadas,
  formatReportTimestamp,
  getCentroid,
  getRegion,
} from "./reportData";

describe("reportData — getCentroid", () => {
  it("retorna null cuando no hay hexágonos seleccionados", () => {
    expect(getCentroid(new Set())).toBeNull();
  });

  it("para un hex retorna su lat/lng (cellToLatLng)", () => {
    const hex = latLngToCell(11.5, -72.5, 7);
    const c = getCentroid(new Set([hex]));
    expect(c).not.toBeNull();
    expect(c!.lat).toBeCloseTo(11.5, 1);
    expect(c!.lng).toBeCloseTo(-72.5, 1);
  });

  it("para N hexes retorna el promedio simple de lat/lng", () => {
    const a = latLngToCell(11.5, -72.5, 7);
    const b = latLngToCell(6.25, -75.56, 7);
    const c = getCentroid(new Set([a, b]));
    expect(c).not.toBeNull();
    expect(c!.lat).toBeCloseTo((11.5 + 6.25) / 2, 1);
    expect(c!.lng).toBeCloseTo((-72.5 + -75.56) / 2, 1);
  });
});

describe("reportData — getRegion", () => {
  it("retorna null sin selección", () => {
    expect(getRegion(new Set())).toBeNull();
  });

  it("retorna 'La Guajira' para hex en Riohacha aprox", () => {
    const hex = latLngToCell(11.5, -72.5, 7);
    expect(getRegion(new Set([hex]))).toBe("La Guajira");
  });

  it("retorna 'Antioquia' para hex en Medellín aprox", () => {
    const hex = latLngToCell(6.25, -75.56, 7);
    expect(getRegion(new Set([hex]))).toBe("Antioquia");
  });
});

describe("reportData — formatCoordenadas", () => {
  it("formatea lat/lng con 4 decimales y locale es-CO", () => {
    expect(formatCoordenadas({ lat: 4.711, lng: -74.0721 })).toBe(
      "4,7110, -74,0721",
    );
  });
});

describe("reportData — formatReportTimestamp", () => {
  it("formatea como DD/MM/YY – HH:MM am/pm", () => {
    const d = new Date(2025, 9, 27, 9, 45);
    expect(formatReportTimestamp(d)).toBe("27/10/25 – 09:45 am");
  });

  it("usa 12 horas (pm) en la tarde", () => {
    const d = new Date(2025, 9, 27, 15, 5);
    expect(formatReportTimestamp(d)).toBe("27/10/25 – 03:05 pm");
  });

  it("medianoche es 12 am", () => {
    const d = new Date(2025, 0, 1, 0, 0);
    expect(formatReportTimestamp(d)).toBe("01/01/25 – 12:00 am");
  });

  it("mediodía es 12 pm", () => {
    const d = new Date(2025, 0, 1, 12, 0);
    expect(formatReportTimestamp(d)).toBe("01/01/25 – 12:00 pm");
  });
});
