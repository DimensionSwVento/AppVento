import type { CategoriaAerogenerador } from "./CaracteristicasContext";

export type TurbineCategory = Exclude<CategoriaAerogenerador, null>;

export interface ProjectDerivationConfig {
  hoursPerYear: number;
  capacityFactor: number;
  powerDensityMWPerKm2: number;
  turbineRatedPowerMW: Record<TurbineCategory, number>;
}

/**
 * Parámetros temporales y centralizados mientras Samuel entrega la fórmula
 * definitiva. Mantenerlos fuera de la UI evita repartir reglas de negocio entre
 * componentes y permite reemplazarlos sin cambiar consumidores.
 */
export const DEFAULT_PROJECT_DERIVATION_CONFIG: ProjectDerivationConfig = {
  hoursPerYear: 8_760,
  capacityFactor: 0.35,
  powerDensityMWPerKm2: 5,
  turbineRatedPowerMW: {
    S: 2,
    M: 3,
    L: 5,
  },
};

export interface DerivedProjectMetrics {
  turbineCount: number;
  estimatedAnnualEnergyMWh: number;
  requiredAreaKm2: number;
}

export function deriveProjectMetrics(
  capacityMW: number,
  category: TurbineCategory,
  config: ProjectDerivationConfig = DEFAULT_PROJECT_DERIVATION_CONFIG,
): DerivedProjectMetrics {
  assertPositiveFinite(capacityMW, "capacityMW");
  assertPositiveFinite(config.hoursPerYear, "hoursPerYear");
  assertPositiveFinite(config.powerDensityMWPerKm2, "powerDensityMWPerKm2");

  if (
    !Number.isFinite(config.capacityFactor) ||
    config.capacityFactor <= 0 ||
    config.capacityFactor > 1
  ) {
    throw new RangeError("capacityFactor debe estar en el rango (0, 1].");
  }

  const turbineRatedPowerMW = config.turbineRatedPowerMW[category];
  assertPositiveFinite(turbineRatedPowerMW, `turbineRatedPowerMW.${category}`);

  return {
    turbineCount: Math.ceil(capacityMW / turbineRatedPowerMW),
    estimatedAnnualEnergyMWh:
      capacityMW * config.hoursPerYear * config.capacityFactor,
    requiredAreaKm2: capacityMW / config.powerDensityMWPerKm2,
  };
}

function assertPositiveFinite(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${field} debe ser un número finito mayor que cero.`);
  }
}
