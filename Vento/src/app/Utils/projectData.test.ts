import { describe, expect, it } from "vitest";
import { areaRangeForCapacity, calcNumAerogeneradores } from "./projectData";

describe("areaRangeForCapacity (US04-04)", () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "devuelve null para capacidad inválida: %s",
    (mw) => {
      expect(areaRangeForCapacity(mw, "M")).toBeNull();
    },
  );

  // NOTA: se removieron dos tests que fijaban valores EXACTOS de área derivados
  // de specs de turbina TEMPLATE (antes "3.5 MW/turbina"; hoy potencia real por
  // rango y `areaPorAeroKm2` sigue siendo template → el cliente entregará los
  // valores reales). Eran frágiles (rompen en cada cambio de plantilla). La banda
  // [0.6×, 1.6×] y la lógica de nº de turbinas quedan cubiertas por los tests de
  // abajo (categoría-ref, S≠L) y por `calcNumAerogeneradores`.

  it("banda de área alrededor de la esperada: [0.6×, 1.6×]", () => {
    // Sin fijar el valor absoluto (template): solo la RELACIÓN de la banda.
    const r = areaRangeForCapacity(35, "M")!;
    expect(r.min).toBeCloseTo(r.esperada * 0.6, 5);
    expect(r.max).toBeCloseTo(r.esperada * 1.6, 5);
    expect(r.min).toBeLessThan(r.esperada);
    expect(r.esperada).toBeLessThan(r.max);
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
