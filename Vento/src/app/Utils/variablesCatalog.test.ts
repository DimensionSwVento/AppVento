import { describe, it, expect } from "vitest";
import {
  DIMENSIONS,
  VARIABLES,
  getVariableById,
  variablesByDimension,
} from "./variablesCatalog";

describe("variablesCatalog — estructura", () => {
  it("expone las 5 dimensiones del spec del cliente", () => {
    expect(DIMENSIONS).toHaveLength(5);
    expect(DIMENSIONS.map((d) => d.id).sort()).toEqual(
      [
        "ambiental",
        "macroeconomica",
        "regulatoria",
        "socioeconomica",
        "tecnica",
      ].sort(),
    );
  });

  it("cada variable tiene id único", () => {
    const ids = VARIABLES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("toda variable pertenece a una de las 5 dimensiones declaradas", () => {
    const validDims = new Set(DIMENSIONS.map((d) => d.id));
    for (const v of VARIABLES) {
      expect(validDims.has(v.dimension)).toBe(true);
    }
  });
});

describe("variablesCatalog — helpers", () => {
  it("variablesByDimension('ambiental') retorna sólo variables ambientales", () => {
    const vars = variablesByDimension("ambiental");
    expect(vars.length).toBeGreaterThan(0);
    for (const v of vars) expect(v.dimension).toBe("ambiental");
  });

  it("getVariableById retorna la variable buscada", () => {
    const v = VARIABLES[0];
    expect(getVariableById(v.id)).toEqual(v);
  });

  it("getVariableById retorna undefined si no existe", () => {
    expect(getVariableById("no-existe")).toBeUndefined();
  });
});
