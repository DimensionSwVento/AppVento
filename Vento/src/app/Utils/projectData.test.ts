import { describe, expect, it } from "vitest";
import { areaRangeForCapacity, calcNumAerogeneradores } from "./projectData";

describe("areaRangeForCapacity (US04-04)", () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "devuelve null para capacidad inválida: %s",
    (mw) => {
      expect(areaRangeForCapacity(mw, "M")).toBeNull();
    },
  );

  it("deriva el rango de la densidad de la categoría (M: 3.5 MW/turbina, 0.6 km²)", () => {
    // 35 MW / 3.5 = 10 turbinas → esperada = 6.0 km²; banda [0.6×, 1.6×].
    const r = areaRangeForCapacity(35, "M");
    expect(r).not.toBeNull();
    expect(r!.esperada).toBeCloseTo(6.0, 5);
    expect(r!.min).toBeCloseTo(3.6, 5);
    expect(r!.max).toBeCloseTo(9.6, 5);
    expect(r!.min).toBeLessThan(r!.esperada);
    expect(r!.esperada).toBeLessThan(r!.max);
  });

  it("redondea hacia arriba el nº de turbinas necesarias", () => {
    // 4 MW / 3.5 = 1.14 → ceil = 2 turbinas → esperada = 1.2 km².
    const r = areaRangeForCapacity(4, "M");
    expect(r!.esperada).toBeCloseTo(1.2, 5);
  });

  it("usa la categoría M como referencia si no hay categoría", () => {
    expect(areaRangeForCapacity(35, null)).toEqual(areaRangeForCapacity(35, "M"));
  });

  it("categorías distintas producen rangos distintos (S más denso que L)", () => {
    const s = areaRangeForCapacity(12, "S")!;
    const l = areaRangeForCapacity(12, "L")!;
    expect(s.esperada).not.toBeCloseTo(l.esperada, 5);
  });
});

describe("calcNumAerogeneradores", () => {
  it("es 0 sin categoría o sin área", () => {
    expect(calcNumAerogeneradores(0, "M")).toBe(0);
    expect(calcNumAerogeneradores(10, null)).toBe(0);
  });
  it("es al menos 1 con área y categoría válidas", () => {
    expect(calcNumAerogeneradores(0.1, "M")).toBe(1);
  });
});
