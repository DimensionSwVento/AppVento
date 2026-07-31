import { describe, it, expect } from "vitest";
import {
  allDimensionHues,
  colorForVariable,
  dimensionBaseColor,
} from "@/app/Utils/variables/dimensionColors";
import { variablesByDimension, DIMENSIONS } from "@/app/Utils/variables/variablesCatalog";

const HSL = /^hsl\((\d+),\s*(\d+)%,\s*(\d+(?:\.\d+)?)%\)$/;

function parseHSL(s: string) {
  const m = s.match(HSL);
  if (!m) throw new Error(`No es HSL: ${s}`);
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

describe("dimensionColors", () => {
  it("toda dimensión tiene un hue distinto al resto", () => {
    const hues = Object.values(allDimensionHues());
    expect(new Set(hues).size).toBe(hues.length);
  });

  it("dimensionBaseColor devuelve un HSL parseable", () => {
    for (const d of DIMENSIONS) {
      const c = dimensionBaseColor(d.id);
      expect(c).toMatch(HSL);
    }
  });

  it("colorForVariable comparte hue con el resto de su dimensión", () => {
    for (const d of DIMENSIONS) {
      const vars = variablesByDimension(d.id);
      if (vars.length < 2) continue;
      const c1 = parseHSL(colorForVariable(vars[0].id));
      const c2 = parseHSL(colorForVariable(vars[1].id));
      expect(c1.h).toBe(c2.h);
    }
  });

  it("colorForVariable usa luminosidad creciente por orden dentro de la dimensión", () => {
    for (const d of DIMENSIONS) {
      const vars = variablesByDimension(d.id);
      if (vars.length < 2) continue;
      const l1 = parseHSL(colorForVariable(vars[0].id)).l;
      const l2 = parseHSL(colorForVariable(vars[1].id)).l;
      expect(l2).toBeGreaterThan(l1);
    }
  });

  it("variables de dimensiones distintas tienen hues distintos", () => {
    const ambiental = variablesByDimension("ambiental")[0];
    const tecnica = variablesByDimension("tecnica")[0];
    const h1 = parseHSL(colorForVariable(ambiental.id)).h;
    const h2 = parseHSL(colorForVariable(tecnica.id)).h;
    expect(h1).not.toBe(h2);
  });

  it("colorForVariable con id desconocido devuelve un gris HSL", () => {
    const c = parseHSL(colorForVariable("no-existe"));
    expect(c.s).toBe(0); // grises no tienen saturación
  });
});
