import { describe, it, expect } from "vitest";
import { latLngToCell, cellToParent, getResolution } from "h3-js";
import {
  HEATMAP_RES,
  aggregateScore,
  colorForScore,
  expandToRes8,
  scoreFor,
} from "./heatmap";

describe("heatmap — expandToRes8", () => {
  it("devuelve array vacío si no hay hexes", () => {
    expect(expandToRes8(new Set())).toEqual([]);
    expect(expandToRes8([])).toEqual([]);
  });

  it("un hex en res < 8 se expande a sus hijos res 8", () => {
    const parent = latLngToCell(4.7, -74, 5); // res 5
    const children = expandToRes8(new Set([parent]));
    expect(children.length).toBeGreaterThan(1);
    for (const c of children) expect(getResolution(c)).toBe(HEATMAP_RES);
  });

  it("un hex que ya está en res 8 se preserva tal cual", () => {
    const hex = latLngToCell(4.7, -74, 8);
    expect(expandToRes8(new Set([hex]))).toEqual([hex]);
  });

  it("hex en res > 8 (más fina) se preserva tal cual", () => {
    const hex = latLngToCell(4.7, -74, 10);
    expect(expandToRes8(new Set([hex]))).toEqual([hex]);
  });

  it("no produce duplicados aunque dos hexes compartan algún hijo", () => {
    const a = latLngToCell(4.7, -74, 7);
    const b = cellToParent(a, 6);
    const out = expandToRes8(new Set([a, b]));
    expect(out.length).toBe(new Set(out).size);
  });
});

describe("heatmap — scoreFor (placeholder casi-uniforme)", () => {
  it("retorna un score determinista en [0.6, 0.8)", () => {
    const hex = latLngToCell(4.7, -74, 8);
    const s = scoreFor("viento-100m", hex);
    expect(s).toBeGreaterThanOrEqual(0.6);
    expect(s).toBeLessThan(0.8);
    expect(scoreFor("viento-100m", hex)).toBe(s);
  });

  it("es independiente de la variable (mismo hex → mismo score)", () => {
    const hex = latLngToCell(4.7, -74, 8);
    expect(scoreFor("viento-100m", hex)).toBe(scoreFor("cigarrillos-ilegales", hex));
  });

  it("distintos hexes dan ligera variación (textura del heatmap)", () => {
    const h1 = latLngToCell(4.7, -74, 8);
    const h2 = latLngToCell(6.25, -75.56, 8);
    // No tienen por qué ser distintos siempre por el módulo, pero el rango es tight
    const s1 = scoreFor("v", h1);
    const s2 = scoreFor("v", h2);
    expect(Math.abs(s1 - s2)).toBeLessThan(0.2);
  });
});

describe("heatmap — aggregateScore (penalizantes solo restan)", () => {
  const hex = latLngToCell(4.7, -74, 8);

  it("retorna 0 si no hay variables activas", () => {
    expect(aggregateScore(new Set(), hex)).toBe(0);
  });

  it("solo aditivas → score igual al score de la variable (1 var, weighted average)", () => {
    const s = aggregateScore(new Set(["viento-100m"]), hex);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
    // Con una sola variable aditiva, el WLC normalizado = scoreFor(id, hex)
    expect(s).toBeCloseTo(scoreFor("viento-100m", hex), 6);
  });

  it("solo penalizadoras → resultado 0 (no hay base aditiva, todo frío)", () => {
    const s = aggregateScore(new Set(["cigarrillos-ilegales"]), hex);
    expect(s).toBe(0);
  });

  it("añadir una penalizadora baja el agregado vs sola la aditiva", () => {
    const soloAditiva = aggregateScore(new Set(["viento-100m"]), hex);
    const conPenalizadora = aggregateScore(
      new Set(["viento-100m", "cigarrillos-ilegales"]),
      hex,
    );
    expect(conPenalizadora).toBeLessThanOrEqual(soloAditiva);
  });

  it("penalizadora con score alto restable hasta 0 (clamp inferior)", () => {
    // Hex donde la penalizadora resulta más alta que la aditiva
    // (es determinista; testeamos que el clamp inferior funcione si pasa)
    for (let i = 0; i < 50; i++) {
      const h = latLngToCell(4.7 + i * 0.01, -74 + i * 0.01, 8);
      const s = aggregateScore(new Set(["viento-100m", "cigarrillos-ilegales"]), h);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it("es determinista: misma entrada produce mismo resultado", () => {
    const a = aggregateScore(new Set(["viento-100m", "conflictividad"]), hex);
    const b = aggregateScore(new Set(["viento-100m", "conflictividad"]), hex);
    expect(a).toBe(b);
  });

  it("ignora variables que no tienen peso definido (weight = 0)", () => {
    const conInvalida = aggregateScore(
      new Set(["viento-100m", "no-existe"]),
      hex,
    );
    const solo = aggregateScore(new Set(["viento-100m"]), hex);
    expect(conInvalida).toBe(solo);
  });

  it("acepta array además de Set", () => {
    const s1 = aggregateScore(["viento-100m"], hex);
    const s2 = aggregateScore(new Set(["viento-100m"]), hex);
    expect(s1).toBe(s2);
  });

});

describe("heatmap — colorForScore", () => {
  it("score 0 devuelve el primer stop inferno (morado oscuro)", () => {
    const [r, g, b, a] = colorForScore(0, "inferno");
    expect([r, g, b]).toEqual([0, 0, 4]);
    expect(a).toBe(200);
  });

  it("score 1 devuelve el último stop inferno (crema/amarillo)", () => {
    const [r, g, b] = colorForScore(1, "inferno");
    expect([r, g, b]).toEqual([252, 255, 164]);
  });

  it("score intermedio interpola entre stops", () => {
    const mid = colorForScore(0.5, "inferno");
    expect(mid[0]).toBe(212);
    expect(mid[1]).toBe(72);
    expect(mid[2]).toBe(66);
  });

  it("viridis empieza en morado (R bajo, G bajo, B medio-bajo)", () => {
    const [r, g, b] = colorForScore(0, "viridis");
    expect([r, g, b]).toEqual([68, 1, 84]);
  });

  it("clampa scores fuera de rango sin crash", () => {
    expect(() => colorForScore(-1, "inferno")).not.toThrow();
    expect(() => colorForScore(2, "inferno")).not.toThrow();
  });
});
