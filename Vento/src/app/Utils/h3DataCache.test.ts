import { describe, it, expect, vi, beforeEach } from "vitest";
import type { H3DataSet } from "./parseH3Parquet";

// El cache es un singleton de módulo → re-importar para empezar limpio.
describe("h3DataCache", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("retorna null cuando no hay datos almacenados", async () => {
    const { getH3Data } = await import("./h3DataCache");
    expect(getH3Data()).toBeNull();
  });

  it("almacena y retorna el dataset", async () => {
    const { storeH3Data, getH3Data } = await import("./h3DataCache");
    const data = { hexagons: [], variableNames: [] } as unknown as H3DataSet;
    storeH3Data(data);
    expect(getH3Data()).toBe(data);
  });

  it("una segunda escritura reemplaza la anterior", async () => {
    const { storeH3Data, getH3Data } = await import("./h3DataCache");
    const a = { hexagons: [], variableNames: ["a"] } as unknown as H3DataSet;
    const b = { hexagons: [], variableNames: ["b"] } as unknown as H3DataSet;
    storeH3Data(a);
    storeH3Data(b);
    expect(getH3Data()).toBe(b);
  });
});
