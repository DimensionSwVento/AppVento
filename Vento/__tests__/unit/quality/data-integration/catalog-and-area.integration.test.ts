import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { cellToChildren, latLngToCell } from "h3-js";

// Data integration — the frontend integrates several backend sources into one
// view: the variable catalog (two endpoints: model and informative variables,
// with metadata and weights) and the per-hexagon area data (`/api/tiles/area`,
// with dimension scores keyed by category code and variable values keyed by master
// code). These tests check that the integration is semantically consistent:
// the same code means the same variable/dimension everywhere.
vi.mock("@/app/Utils/projectData", async (orig) => ({
  ...(await orig<typeof import("@/app/Utils/projectData")>()),
  USE_BACKEND: true,
  USE_PLACEHOLDER_FALLBACK: false,
}));

import {
  DIMENSIONS,
  OPTIONAL_VARIABLES,
  SCORABLE_DIMENSION_IDS,
  VARIABLES,
  getVariableById,
  type Variable,
} from "@/app/Utils/variables/variablesCatalog";
import { hydrateCatalog, type AdminVariable } from "@/app/Utils/admin/catalogApi";
import { weightFor } from "@/app/Utils/variables/variableWeights";
import {
  areaInfoForCell,
  areaVariableAverage,
  backendScore,
  backendVarCode,
  hexVariableValue,
  type AreaHexInfo,
  type AreaHexMap,
} from "@/app/Utils/report/useAreaHexData";
import { useAreaScores } from "@/app/Utils/report/useAreaScores";

// Static snapshot taken BEFORE any hydration mutates the catalog in place.
const STATIC_CATALOG: Variable[] = [...VARIABLES, ...OPTIONAL_VARIABLES].map((v) => ({ ...v }));

/** Category prefix of a master code → frontend dimension (the master's own convention). */
const PREFIX_TO_DIMENSION: Record<string, string> = {
  AMB: "ambiental",
  TEC: "tecnica",
  SOC: "social",
  SOE: "social",
  ECO: "macroeconomica",
};

describe("Semantic consistency of codes across catalog and backend data", () => {
  it("every master code prefix in the catalog agrees with the variable's dimension", () => {
    const wrong = STATIC_CATALOG.filter((v) => v.masterId !== "NA")
      .map((v) => ({ id: v.id, masterId: v.masterId, dimension: v.dimension }))
      .filter((v) => PREFIX_TO_DIMENSION[v.masterId.split("-")[0]] !== v.dimension);
    expect(wrong).toEqual([]);
  });

  it("master codes follow the master's format (PREFIX-NNN[-SUFFIX]) or are explicitly unassigned", () => {
    const bad = STATIC_CATALOG.map((v) => v.masterId).filter(
      (m) => m !== "NA" && !/^(AMB|TEC|SOC|SOE|ECO)-\d{3}(-[A-Z]{1,3})?$/.test(m),
    );
    expect(bad).toEqual([]);
  });

  it("a master code shared by several catalog entries never spans different dimensions", () => {
    const byCode = new Map<string, Variable[]>();
    for (const v of STATIC_CATALOG) {
      if (v.masterId === "NA") continue;
      byCode.set(v.masterId, [...(byCode.get(v.masterId) ?? []), v]);
    }
    const conflicts = [...byCode.entries()]
      .filter(([, vs]) => vs.length > 1)
      .filter(([, vs]) => new Set(vs.map((v) => v.dimension)).size > 1);
    expect(conflicts).toEqual([]);
  });

  it.each(SCORABLE_DIMENSION_IDS.map((d) => [d] as const))(
    "the backend category score for every master prefix of dimension %s is read into that dimension",
    (dim) => {
      const prefixes = new Set(
        STATIC_CATALOG.filter((v) => v.dimension === dim && v.masterId !== "NA").map(
          (v) => v.masterId.split("-")[0],
        ),
      );
      expect(prefixes.size).toBeGreaterThan(0);
      for (const p of prefixes) {
        const info: AreaHexInfo = { score_general: 0.5, scores: { [p]: 0.37 } };
        expect(backendScore(info, dim)).toBe(0.37);
      }
    },
  );

  it.each([
    ["TEC-004-T", "TEC_004"],
    ["AMB-005-A", "AMB_005"],
    ["SOC-001-SE", "SOC_001"],
    ["SOE-001", "SOE_001"],
    ["TEC-016", "TEC_016"],
  ])("catalog master code %s maps to backend variable code %s", (masterId, code) => {
    expect(backendVarCode(masterId)).toBe(code);
  });

  it.each(["AMB_012_A", "AMB-012-A", "amb012a", "AMB 012 A"])(
    "the value keyed %s in the backend row is read for catalog code AMB-012-A",
    (key) => {
      const info: AreaHexInfo = { score_general: 0, scores: {}, variables: { [key]: 42 } };
      expect(hexVariableValue(info, "AMB-012-A")).toBe(42);
    },
  );

  it("sub-variables split by the model (code_svNNN) are averaged into the catalog variable", () => {
    const info: AreaHexInfo = {
      score_general: 0,
      scores: {},
      variables: { TEC_004_sv001: 6, TEC_004_sv002: 8, TEC_005_sv001: 100 },
    };
    expect(hexVariableValue(info, "TEC-004-T")).toBe(7);
  });

  it("an unassigned code (NA) never picks up a backend value", () => {
    const info: AreaHexInfo = { score_general: 0, scores: {}, variables: { NA: 1 } };
    expect(hexVariableValue(info, "NA")).toBeUndefined();
  });
});

describe("Multi-source integration: per-hexagon area data → report values", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const parent = latLngToCell(11.5, -72.5, 7);
  const [h1, h2, h3] = cellToChildren(parent, 8);

  const rows: (AreaHexInfo & { h3_index: string })[] = [
    { h3_index: h1, score_general: 0.6, scores: { TEC: 0.8, AMB: 0.5, SOE: 0.4 }, variables: { TEC_004_sv001: 7 } },
    { h3_index: h2, score_general: 0.7, scores: { TEC: 0.6, AMB: 0.7, SOC: 0.6 }, variables: { TEC_004_sv001: 9 } },
    { h3_index: h3, score_general: 0.8, scores: { TEC: 0.7, XYZ: 0.99 }, variables: {} },
  ];

  it("dimension scores combine every row, with SOE and SOC both feeding 'social' and unknown categories ignored", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const { result } = renderHook(() => useAreaScores(new Set([parent])));
    await waitFor(() => expect(result.current.general).toBeGreaterThan(0));

    expect(fetchMock).toHaveBeenCalledWith("/api/tiles/area", expect.objectContaining({ method: "POST" }));
    // Hand-computed means ×100.
    expect(result.current.general).toBeCloseTo(70, 9); // (0.6+0.7+0.8)/3
    expect(result.current.byDim.tecnica).toBeCloseTo(70, 9); // (0.8+0.6+0.7)/3
    expect(result.current.byDim.ambiental).toBeCloseTo(60, 9); // (0.5+0.7)/2
    expect(result.current.byDim.social).toBeCloseTo(50, 9); // (0.4 SOE + 0.6 SOC)/2
    expect(Object.keys(result.current.byDim).sort()).toEqual(["ambiental", "social", "tecnica"]);
  });

  it("a variable's area average uses every backend row, even when the selection is coarser (res 7 → res 8)", () => {
    const m: AreaHexMap = new Map(rows.map((r) => [r.h3_index, r]));
    // Only 2 of 3 rows carry the variable → average over those.
    expect(areaVariableAverage(m, new Set([parent]), "TEC-004-T")).toBe(8);
    expect(areaVariableAverage(m, new Set([parent]), "AMB-005-A")).toBeNull();
  });

  it("a coarser map cell aggregates the res-8 rows under it (hover tooltip consistency)", () => {
    const m: AreaHexMap = new Map(rows.map((r) => [r.h3_index, r]));
    const agg = areaInfoForCell(m, parent)!;
    expect(agg.score_general).toBeCloseTo(0.7, 9);
    expect(agg.scores.TEC).toBeCloseTo(0.7, 9);
    expect(agg.scores.AMB).toBeCloseTo(0.6, 9);
    expect(agg.variables!.TEC_004_sv001).toBeCloseTo(8, 9);
    expect(areaInfoForCell(m, latLngToCell(4.6, -74.1, 7))).toBeUndefined();
  });
});

describe("Multi-source integration: catalog hydration from the backend", () => {
  const originalFetch = globalThis.fetch;

  const model = (over: Partial<AdminVariable>): AdminVariable => ({
    id: "x",
    label: "X",
    dimension: "tecnica",
    dimensionLabel: "Técnica",
    tipo: "modelo",
    enabled: true,
    enMapa: true,
    enMenu: false,
    excluyente: false,
    fuente: "",
    unidad: "",
    rango: "",
    descripcion: "",
    datasetVersion: "",
    datasetUpdatedAt: "",
    ...over,
  });

  const MODELO: AdminVariable[] = [
    model({
      id: "velocidad-viento",
      label: "Velocidad del viento (BD)",
      masterId: "TEC-004-T",
      descripcion: "Velocidad media anual a 100 m.",
      fuente: "IDEAM",
      licencia: "CC BY 4.0",
      url: "https://www.ideam.gov.co/",
      emplazamiento: "both",
      polaridad: 1,
      peso: 0.25,
    }),
    model({
      id: "batimetria",
      label: "Batimetría (BD)",
      dimension: "tecnica",
      masterId: "TEC-020-T",
      emplazamiento: "offshore",
      polaridad: -1,
      peso: 0.1,
    }),
    model({
      id: "nueva-variable-bd",
      label: "Variable nueva subida en la máster",
      dimension: "ambiental",
      masterId: "AMB-099-A",
      emplazamiento: "onshore",
      polaridad: 1,
      peso: 0.05,
    }),
  ];
  const INFORMATIVA: AdminVariable[] = [
    model({
      id: "especies-endemicas",
      label: "Especies endémicas (BD)",
      dimension: "ambiental",
      tipo: "informativa",
      enMenu: true,
      masterId: "AMB-005-A",
      fuente: "Instituto Humboldt",
      licencia: "Uso libre",
      url: "https://www.gbif.org/",
    }),
  ];

  function serveCatalog(modelo: AdminVariable[], informativa: AdminVariable[]) {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u === "/api/admin/catalog/variables?tipo=modelo") return Response.json(modelo);
      if (u === "/api/admin/catalog/variables?tipo=informativa") return Response.json(informativa);
      return new Response("{}", { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  beforeEach(() => {
    // Restore the static template before each case (the catalog is mutated in place).
    VARIABLES.length = 0;
    VARIABLES.push(...STATIC_CATALOG.filter((v) => !v.noCalculo).map((v) => ({ ...v })));
    OPTIONAL_VARIABLES.length = 0;
    OPTIONAL_VARIABLES.push(...STATIC_CATALOG.filter((v) => v.noCalculo).map((v) => ({ ...v })));
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("merges both sources (model + informative endpoints) into the live catalog", async () => {
    const fetchMock = serveCatalog(MODELO, INFORMATIVA);
    await hydrateCatalog();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(VARIABLES.map((v) => v.id)).toEqual(["velocidad-viento", "batimetria", "nueva-variable-bd"]);
    expect(OPTIONAL_VARIABLES.map((v) => v.id)).toEqual(["especies-endemicas"]);
    expect(getVariableById("nueva-variable-bd")?.label).toBe("Variable nueva subida en la máster");
    expect(getVariableById("especies-endemicas")?.noCalculo).toBe(true);
    expect(getVariableById("velocidad-viento")?.noCalculo).toBe(false);
  });

  it("keeps identity and metadata coherent: master code, dimension, source, licence and link come from the DB", async () => {
    serveCatalog(MODELO, INFORMATIVA);
    await hydrateCatalog();
    const v = getVariableById("velocidad-viento")!;
    expect(v).toMatchObject({
      masterId: "TEC-004-T",
      dimension: "tecnica",
      label: "Velocidad del viento (BD)",
      description: "Velocidad media anual a 100 m.",
      fuente: "IDEAM",
      licencia: "CC BY 4.0",
      url: "https://www.ideam.gov.co/",
    });
    expect(DIMENSIONS.some((d) => d.id === v.dimension)).toBe(true);
  });

  it("translates the DB emplacement vocabulary (onshore/offshore/both) into the map's land/sea filter", async () => {
    serveCatalog(MODELO, INFORMATIVA);
    await hydrateCatalog();
    expect(getVariableById("batimetria")?.aplicaEn).toBe("mar");
    expect(getVariableById("nueva-variable-bd")?.aplicaEn).toBe("tierra");
    expect(getVariableById("velocidad-viento")?.aplicaEn).toBe(
      STATIC_CATALOG.find((s) => s.id === "velocidad-viento")?.aplicaEn,
    );
  });

  it("keeps UI-only attributes (icon, required) from the static catalog for known ids, with a safe icon for new ones", async () => {
    serveCatalog(MODELO, INFORMATIVA);
    await hydrateCatalog();
    const stat = STATIC_CATALOG.find((s) => s.id === "velocidad-viento")!;
    expect(getVariableById("velocidad-viento")?.iconKey).toBe(stat.iconKey);
    expect(getVariableById("velocidad-viento")?.required ?? false).toBe(stat.required ?? false);
    expect(getVariableById("nueva-variable-bd")?.iconKey).toBe("lucide:Info");
  });

  it("applies the DB weights as polarity × weight for the multicriteria model", async () => {
    serveCatalog(MODELO, INFORMATIVA);
    await hydrateCatalog();
    expect(weightFor("velocidad-viento")).toBeCloseTo(0.25, 12);
    expect(weightFor("batimetria")).toBeCloseTo(-0.1, 12);
    expect(weightFor("nueva-variable-bd")).toBeCloseTo(0.05, 12);
  });

  it("an empty DB does not wipe the catalog (the app never goes blank)", async () => {
    const before = VARIABLES.map((v) => v.id);
    serveCatalog([], []);
    await hydrateCatalog();
    expect(VARIABLES.map((v) => v.id)).toEqual(before);
    expect(VARIABLES.length).toBeGreaterThan(0);
  });

  it("a failing source rejects the hydration instead of mixing template and real data", async () => {
    const before = VARIABLES.map((v) => v.id);
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes("tipo=modelo")
        ? Response.json(MODELO)
        : new Response(JSON.stringify({ error: "backend_unreachable" }), { status: 502 }),
    ) as unknown as typeof fetch;
    await expect(hydrateCatalog()).rejects.toThrow("backend_unreachable");
    expect(VARIABLES.map((v) => v.id)).toEqual(before);
  });
});
