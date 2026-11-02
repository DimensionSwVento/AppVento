import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEffect, type ReactNode } from "react";
import { render, screen, fireEvent, waitFor, renderHook } from "@testing-library/react";
import { cellToChildren, gridDisk, latLngToCell, cellToParent, getResolution } from "h3-js";

import Report from "@/app/Components/report/Report";
import HistorialList from "@/app/Components/historial/HistorialList";
import { AprincipalProvider, useAprincipal } from "@/app/Utils/contexts/AccionPrincipalContext";
import { VariablesProvider, useVariables } from "@/app/Utils/contexts/VariablesContext";
import {
  CaracteristicasProvider,
  useCaracteristicas,
  type CaracteristicasState,
} from "@/app/Utils/contexts/CaracteristicasContext";
import { EconomicProvider } from "@/app/Utils/contexts/EconomicContext";
import { RegulatoryProvider } from "@/app/Utils/contexts/RegulatoryContext";
import { HistorialProvider } from "@/app/Utils/historial/HistorialContext";
import { ToastProvider } from "@/app/Components/ui/Toast";
import { isHexBanned } from "@/app/Utils/h3/hexClassification";
import { uncompactHexes } from "@/app/Utils/historial/hexCodec";
import { useAreaScores } from "@/app/Utils/report/useAreaScores";
import { calcAreaKm2 } from "@/app/Utils/report/areaCalc";
import { getRegion } from "@/app/Utils/report/reportData";
import {
  OPTIONAL_VARIABLES,
  VARIABLES,
  isHeatVariable,
} from "@/app/Utils/variables/variablesCatalog";
import type { InformeEntry } from "@/app/Utils/historial/types";
import type { ReportConfig } from "@/app/Utils/report/reportConfig";

// Traceability — a saved report must record the inputs of the decision (area,
// variables, project characteristics, report configuration), its outputs (scores,
// area, region) and when it was produced, so that opening it from the
// "Histórico de informes" reproduces exactly the same analysis.
//
// Template mode (no backend): the historial persists in localStorage via the real
// LocalStorageHistorialRepo; the PDF pipeline is mocked like in Report.test.tsx.

vi.mock("html2canvas-pro", () => ({ default: vi.fn() }));
vi.mock("jspdf", () => ({ default: vi.fn() }));
vi.mock("svg2pdf.js", () => ({ svg2pdf: vi.fn(() => Promise.resolve()) }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

const STORAGE_KEY = "vento_historial";
// An optional (informative) variable: off by default, so restoring it is observable.
// (Not a model variable — those are always active — and not a heat layer, which
// is mutually exclusive with the other heat layers.)
const OPTIONAL_ID = OPTIONAL_VARIABLES.find(
  (v) => !VARIABLES.some((m) => m.id === v.id) && !isHeatVariable(v.id),
)!.id;

// Selection fixture in La Guajira: the 7 res-7 children of a res-6 cell (a
// compactable block) plus a ring of neighbours, minus any template-excluded cell.
const PARENT = cellToParent(latLngToCell(11.5, -72.5, 7), 6);
const SELECTION = [
  ...new Set([...cellToChildren(PARENT, 7), ...gridDisk(cellToChildren(PARENT, 7)[0], 2)]),
].filter((h) => !isHexBanned(h));

const CARACTERISTICAS: CaracteristicasState = {
  tipoEmplazamiento: "onshore",
  tipoTecnologiaOffshore: null,
  capacidadMW: 48.5,
  numAerogeneradores: 12,
  categoriaAerogenerador: "L",
};

type Snapshot = {
  selectedHexes: Set<string>;
  activeVariables: Set<string>;
  caracteristicas: CaracteristicasState;
  accion: string | null;
  restoredReportConfig: ReportConfig | null;
};
const snap: { current: Snapshot | null } = { current: null };

function Probe() {
  const a = useAprincipal();
  const v = useVariables();
  const c = useCaracteristicas();
  // Publish the latest committed state after every render.
  useEffect(() => {
    snap.current = {
    selectedHexes: a.selectedHexes,
    activeVariables: v.activeVariables,
    caracteristicas: {
      tipoEmplazamiento: c.tipoEmplazamiento,
      tipoTecnologiaOffshore: c.tipoTecnologiaOffshore,
      capacidadMW: c.capacidadMW,
      numAerogeneradores: c.numAerogeneradores,
      categoriaAerogenerador: c.categoriaAerogenerador,
    },
    accion: a.accion,
    restoredReportConfig: a.restoredReportConfig,
    };
  });
  return null;
}

function Seed({
  hexes,
  caract,
  extraVars = [],
}: {
  hexes: string[];
  caract: CaracteristicasState;
  extraVars?: string[];
}) {
  const { setSelectedHexes } = useAprincipal();
  const c = useCaracteristicas();
  const { toggleVariable } = useVariables();
  useEffect(() => {
    setSelectedHexes(new Set(hexes));
    c.restore(caract);
    for (const id of extraVars) toggleVariable(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <HistorialProvider>
        <VariablesProvider>
          <EconomicProvider>
            <RegulatoryProvider>
              <CaracteristicasProvider>
                <AprincipalProvider>{children}</AprincipalProvider>
              </CaracteristicasProvider>
            </RegulatoryProvider>
          </EconomicProvider>
        </VariablesProvider>
      </HistorialProvider>
    </ToastProvider>
  );
}

function readStored(): InformeEntry[] {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
}

async function saveReportFromUi(): Promise<{ entry: InformeEntry; before: Snapshot }> {
  const view = render(
    <Providers>
      <Seed hexes={SELECTION} caract={CARACTERISTICAS} extraVars={[OPTIONAL_ID]} />
      <Probe />
      <Report />
    </Providers>,
  );
  await waitFor(() => expect(snap.current?.activeVariables.has(OPTIONAL_ID)).toBe(true));
  const button = await screen.findByRole("button", { name: /Guardar en histórico/i });
  fireEvent.click(button);
  await screen.findByRole("button", { name: /Guardado/i });
  const before = snap.current!;
  view.unmount();
  const stored = readStored();
  expect(stored).toHaveLength(1);
  return { entry: stored[0], before };
}

describe("Histórico de informes — decision record and historical reproducibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
    snap.current = null;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("fixture sanity: a non-trivial, single-resolution selection that is compactable", () => {
    expect(SELECTION.length).toBeGreaterThan(10);
    expect(new Set(SELECTION.map(getResolution))).toEqual(new Set([7]));
  });

  it("saving records the decision inputs, outputs and an ISO timestamp", async () => {
    const t0 = Date.now();
    const { entry, before } = await saveReportFromUi();

    // When.
    expect(entry.createdAt).toBe(new Date(entry.createdAt).toISOString());
    expect(new Date(entry.createdAt).getTime()).toBeGreaterThanOrEqual(t0 - 1000);
    expect(typeof entry.id).toBe("string");
    expect(entry.id.length).toBeGreaterThan(0);

    // Inputs of the decision.
    expect(new Set(uncompactHexes(entry.hexes))).toEqual(new Set(SELECTION));
    expect(new Set(entry.variables)).toEqual(before.activeVariables);
    expect(entry.variables).toContain(OPTIONAL_ID);
    expect(entry.variables.length).toBeGreaterThan(0);
    expect(entry.caracteristicas).toEqual(CARACTERISTICAS);
    expect(entry.reportConfig).toBeDefined();
    expect(typeof entry.reportConfig!.chartType).toBe("string");

    // Outputs of the decision, consistent with the inputs.
    expect(entry.areaKm2).toBeCloseTo(calcAreaKm2(new Set(SELECTION)), 9);
    expect(entry.region).toBe(getRegion(new Set(SELECTION)));
    expect(entry.region).toBe("La Guajira");
    expect(entry.nombre).toBe("Informe — La Guajira");
    expect(Number.isFinite(entry.scores.general)).toBe(true);
    expect(Object.keys(entry.scores.byDim).length).toBeGreaterThan(0);
  });

  it("the stored selection is compacted but geometrically identical (lossless)", async () => {
    const { entry } = await saveReportFromUi();
    expect(entry.hexes.length).toBeLessThan(SELECTION.length);
    expect(entry.hexes).toContain(PARENT);
    const restored = uncompactHexes(entry.hexes);
    expect(restored).toHaveLength(SELECTION.length);
    expect(new Set(restored)).toEqual(new Set(SELECTION));
    expect(calcAreaKm2(new Set(restored))).toBeCloseTo(entry.areaKm2, 9);
  });

  it("re-running the analysis on the stored inputs reproduces the stored scores", async () => {
    const { entry } = await saveReportFromUi();
    const { result } = renderHook(() =>
      useAreaScores(new Set(uncompactHexes(entry.hexes))),
    );
    expect(result.current.general).toBeCloseTo(entry.scores.general, 9);
    for (const [dim, v] of Object.entries(entry.scores.byDim)) {
      expect(result.current.byDim[dim]).toBeCloseTo(v, 9);
    }
  });

  it("opening the saved report ('Ver') restores selection, variables, characteristics and report config", async () => {
    const { entry } = await saveReportFromUi();

    // A new session with a different, unrelated state.
    const OTHER = [latLngToCell(4.6, -74.1, 7)];
    render(
      <Providers>
        <Seed
          hexes={OTHER}
          caract={{ ...CARACTERISTICAS, capacidadMW: 1, categoriaAerogenerador: "S" }}
        />
        <Probe />
        <HistorialList />
      </Providers>,
    );
    await waitFor(() => expect(snap.current?.selectedHexes).toEqual(new Set(OTHER)));
    // The new session does not have the optional variable the report used.
    expect(snap.current!.activeVariables.has(OPTIONAL_ID)).toBe(false);

    fireEvent.click(await screen.findByRole("button", { name: /Ver/i }));

    await waitFor(() => expect(snap.current!.accion).toBe("informe"));
    const s = snap.current!;
    expect(s.selectedHexes).toEqual(new Set(SELECTION));
    expect(s.activeVariables).toEqual(new Set(entry.variables));
    expect(s.caracteristicas).toEqual(CARACTERISTICAS);
    expect(s.restoredReportConfig).toEqual(entry.reportConfig);
  });

  it("the historial entry shows when it was produced, its area and score, and the data version", async () => {
    const entry: InformeEntry = {
      id: "inf-ver",
      createdAt: "2026-10-30T15:04:00.000Z",
      nombre: "Informe — Atlántico",
      hexes: [PARENT],
      variables: ["velocidad-viento"],
      caracteristicas: CARACTERISTICAS,
      scores: { general: 63.27, byDim: { tecnica: 70 } },
      region: "Atlántico",
      areaKm2: 36.13,
      masterVersion: "2026.10-r3",
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([entry]));
    render(
      <Providers>
        <HistorialList />
      </Providers>,
    );
    const item = (await screen.findByText("Informe — Atlántico")).closest("li")!;
    const fmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
    expect(item).toHaveTextContent(fmt.format(new Date(entry.createdAt)));
    expect(item).toHaveTextContent(/36,13\s*km²/);
    expect(item).toHaveTextContent("Score 63.3");
    expect(item).toHaveTextContent("Datos: master 2026.10-r3");
  });

  it("entries without a recorded data version do not invent one", async () => {
    const entry: InformeEntry = {
      id: "inf-old",
      createdAt: "2026-01-02T10:00:00.000Z",
      nombre: "Informe antiguo",
      hexes: [PARENT],
      variables: [],
      caracteristicas: CARACTERISTICAS,
      scores: { general: 50, byDim: {} },
      region: null,
      areaKm2: 36.13,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([entry]));
    render(
      <Providers>
        <HistorialList />
      </Providers>,
    );
    const item = (await screen.findByText("Informe antiguo")).closest("li")!;
    expect(item).not.toHaveTextContent(/Datos: master/);
  });

  it("history is ordered newest first so the audit trail reads chronologically", async () => {
    const mk = (id: string, createdAt: string): InformeEntry => ({
      id,
      createdAt,
      nombre: `Informe ${id}`,
      hexes: [PARENT],
      variables: [],
      caracteristicas: CARACTERISTICAS,
      scores: { general: 1, byDim: {} },
      region: null,
      areaKm2: 1,
    });
    const old = new Date(Date.now() - 40 * 86_400_000).toISOString();
    const mid = new Date(Date.now() - 45 * 86_400_000).toISOString();
    const recent = new Date(Date.now() - 31 * 86_400_000).toISOString();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([mk("B", old), mk("A", mid), mk("C", recent)]),
    );
    render(
      <Providers>
        <HistorialList />
      </Providers>,
    );
    await screen.findByText("Informe C");
    const names = screen.getAllByText(/^Informe [ABC]$/).map((n) => n.textContent);
    expect(names).toEqual(["Informe C", "Informe B", "Informe A"]);
  });
});
