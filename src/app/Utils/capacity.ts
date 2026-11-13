/** Rango técnico permitido para la capacidad nominal del proyecto. */
export const MIN_CAPACITY_MW = 0.01;
export const MAX_CAPACITY_MW = 999.99;

export function isCapacityWithinRange(value: number | null): value is number {
  return (
    value !== null &&
    Number.isFinite(value) &&
    value >= MIN_CAPACITY_MW &&
    value <= MAX_CAPACITY_MW
  );
}
