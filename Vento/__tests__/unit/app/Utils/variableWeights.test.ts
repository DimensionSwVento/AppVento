import { describe, it, expect } from "vitest";
import { VARIABLE_WEIGHTS, weightFor } from "@/app/Utils/variables/variableWeights";
import { VARIABLES } from "@/app/Utils/variables/variablesCatalog";

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

  it("'grupos-beligerantes' tiene peso negativo (penaliza)", () => {
    expect(weightFor("grupos-beligerantes")).toBeLessThan(0);
  });

  it("'viento-velocidad' tiene peso positivo (aditivo)", () => {
    expect(weightFor("viento-velocidad")).toBeGreaterThan(0);
  });
});

describe("variableWeights — weightFor", () => {
  it("retorna el peso asignado a una variable conocida", () => {
    expect(weightFor("viento-velocidad")).toBe(
      VARIABLE_WEIGHTS["viento-velocidad"],
    );
  });

  it("retorna 0 para variables que no están en el mapa", () => {
    expect(weightFor("variable-inexistente")).toBe(0);
  });
});
