import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_DERIVATION_CONFIG,
  deriveProjectMetrics,
} from "./projectDerivations";

describe("deriveProjectMetrics", () => {
  it("deriva aerogeneradores, energía anual y área desde la capacidad", () => {
    expect(deriveProjectMetrics(30, "M")).toEqual({
      turbineCount: 10,
      estimatedAnnualEnergyMWh: 91_980,
      requiredAreaKm2: 6,
    });
  });

  it("redondea hacia arriba cuando la capacidad no completa otra turbina", () => {
    expect(deriveProjectMetrics(10.1, "L").turbineCount).toBe(3);
  });

  it("usa la potencia nominal correspondiente a cada categoría", () => {
    expect(deriveProjectMetrics(10, "S").turbineCount).toBe(5);
    expect(deriveProjectMetrics(10, "M").turbineCount).toBe(4);
    expect(deriveProjectMetrics(10, "L").turbineCount).toBe(2);
  });

  it("permite sustituir la configuración cuando llegue la fórmula definitiva", () => {
    const result = deriveProjectMetrics(20, "M", {
      ...DEFAULT_PROJECT_DERIVATION_CONFIG,
      capacityFactor: 0.5,
      powerDensityMWPerKm2: 4,
      turbineRatedPowerMW: { S: 1, M: 4, L: 8 },
    });

    expect(result).toEqual({
      turbineCount: 5,
      estimatedAnnualEnergyMWh: 87_600,
      requiredAreaKm2: 5,
    });
  });

  it("rechaza capacidades y configuraciones inválidas", () => {
    expect(() => deriveProjectMetrics(0, "M")).toThrow(RangeError);
    expect(() =>
      deriveProjectMetrics(10, "M", {
        ...DEFAULT_PROJECT_DERIVATION_CONFIG,
        capacityFactor: 1.1,
      }),
    ).toThrow(RangeError);
  });
});
