import { describe, expect, it } from "vitest";
import {
  isCapacityWithinRange,
  MAX_CAPACITY_MW,
  MIN_CAPACITY_MW,
} from "./capacity";

describe("capacity", () => {
  it("acepta los límites mínimo y máximo", () => {
    expect(isCapacityWithinRange(MIN_CAPACITY_MW)).toBe(true);
    expect(isCapacityWithinRange(MAX_CAPACITY_MW)).toBe(true);
  });

  it.each([null, 0, -0.01, 1_000, Number.NaN, Number.POSITIVE_INFINITY])(
    "rechaza capacidades fuera del rango: %s",
    (value) => {
      expect(isCapacityWithinRange(value)).toBe(false);
    },
  );
});
