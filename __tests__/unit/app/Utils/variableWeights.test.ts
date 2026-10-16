import { describe, it, expect } from "vitest";
import { VARIABLE_WEIGHTS, weightFor } from "@/app/Utils/variables/variableWeights";
import {
  VARIABLES,
  isScorableDimension,
  variablesByDimension,
} from "@/app/Utils/variables/variablesCatalog";

describe("variableWeights — estructura", () => {
  it("toda variable de una dimensión PUNTUABLE tiene un peso definido", () => {
    for (const v of VARIABLES) {
      if (!isScorableDimension(v.dimension)) continue;
      expect(weightFor(v.id)).not.toBe(0);
    }
  });

  // US-FB3-05 / feedback item 11: "Regulatoria" queda fuera del cálculo WLC.
  // Hoy además está VACÍA (el cliente la dejó como "Falta"); si en el futuro
  // se pueblan variables regulatorias, ninguna debe aportar al WLC (peso 0).
  it("las variables de 'regulatoria' NO aportan al WLC (peso 0)", () => {
    const regulatorias = variablesByDimension("regulatoria");
    for (const v of regulatorias) {
      expect(weightFor(v.id)).toBe(0);
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

  it("'wpd' tiene peso positivo (aditivo)", () => {
    expect(weightFor("wpd")).toBeGreaterThan(0);
  });
});

describe("variableWeights — weightFor", () => {
  it("retorna el peso asignado a una variable conocida", () => {
    expect(weightFor("wpd")).toBe(VARIABLE_WEIGHTS["wpd"]);
  });

  it("retorna 0 para variables que no están en el mapa", () => {
    expect(weightFor("variable-inexistente")).toBe(0);
  });
});
