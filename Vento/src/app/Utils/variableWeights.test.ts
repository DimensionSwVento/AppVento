import { describe, it, expect } from "vitest";
import { VARIABLE_WEIGHTS, weightFor } from "./variableWeights";
import { VARIABLES } from "./variablesCatalog";

describe("variableWeights — estructura", () => {
  it("toda variable del catálogo tiene un peso definido", () => {
    for (const v of VARIABLES) {
      expect(weightFor(v.id)).not.toBe(0);
    }
  });

  it("pesos son números finitos", () => {
    for (const w of Object.values(VARIABLE_WEIGHTS)) {
      expect(Number.isFinite(w)).toBe(true);
    }
  });

  it("'cigarrillos-ilegales' tiene peso negativo (penaliza)", () => {
    expect(weightFor("cigarrillos-ilegales")).toBeLessThan(0);
  });

  it("'viento-100m' tiene peso positivo (aditivo)", () => {
    expect(weightFor("viento-100m")).toBeGreaterThan(0);
  });
});

describe("variableWeights — weightFor", () => {
  it("retorna el peso asignado a una variable conocida", () => {
    expect(weightFor("viento-100m")).toBe(VARIABLE_WEIGHTS["viento-100m"]);
  });

  it("retorna 0 para variables que no están en el mapa", () => {
    expect(weightFor("variable-inexistente")).toBe(0);
  });
});
