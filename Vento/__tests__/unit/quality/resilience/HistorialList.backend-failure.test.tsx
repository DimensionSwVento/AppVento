import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Resilience of the "Histórico de informes" against a failing backend. In backend
// mode the historial goes through the BFF (`/api/historico`); faults are injected
// at that HTTP boundary (502 from the BFF when FastAPI is unreachable, 503, network
// error) and recovery is driven through the UI's own "Reintentar" button.
vi.mock("@/app/Utils/projectData", async (orig) => ({
  ...(await orig<typeof import("@/app/Utils/projectData")>()),
  USE_BACKEND: true,
}));

import HistorialList from "@/app/Components/historial/HistorialList";
import { HistorialProvider } from "@/app/Utils/historial/HistorialContext";
import { ToastProvider } from "@/app/Components/ui/Toast";
import type { InformeEntry } from "@/app/Utils/historial/types";

const ENTRY: InformeEntry = {
  id: "inf-1",
  createdAt: new Date().toISOString(),
  nombre: "Informe — La Guajira",
  hexes: ["874a8c4a1ffffff"],
  variables: ["velocidad-viento"],
  caracteristicas: {
    tipoEmplazamiento: "onshore",
    tipoTecnologiaOffshore: null,
    capacidadMW: 50,
    numAerogeneradores: 10,
    categoriaAerogenerador: "L",
  },
  scores: { general: 71.4, byDim: {} },
  region: "La Guajira",
  areaKm2: 5.16,
};

type Outcome = Response | Error;

function scriptHistorico(outcomes: Outcome[]) {
  let i = 0;
  const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
    if (String(url) !== "/api/historico") return new Response("{}", { status: 404 });
    const o = outcomes[Math.min(i, outcomes.length - 1)];
    i += 1;
    if (o instanceof Error) throw o;
    return o.clone();
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const bffUnreachable = () =>
  new Response(JSON.stringify({ error: "backend_unreachable" }), { status: 502 });
const okList = (list: InformeEntry[]) =>
  new Response(JSON.stringify(list), { status: 200, headers: { "Content-Type": "application/json" } });

function renderHistorial() {
  return render(
    <ToastProvider>
      <HistorialProvider>
        <HistorialList />
      </HistorialProvider>
    </ToastProvider>,
  );
}

describe("Histórico de informes — backend failure and recovery", () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it.each<[string, () => Outcome]>([
    ["BFF 502 backend_unreachable", bffUnreachable],
    ["503 service unavailable", () => new Response("", { status: 503 })],
    ["network error", () => new TypeError("Failed to fetch")],
  ])("%s → explicit error state with retry, never a silent empty list", async (_l, fault) => {
    scriptHistorico([fault()]);
    renderHistorial();
    expect(await screen.findByText("No se pudo cargar el histórico")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reintentar/i })).toBeEnabled();
    // The failure must NOT be presented as "no reports yet".
    expect(screen.queryByText(/Aún no has generado análisis/i)).toBeNull();
  });

  it("the HTTP status of the failure is surfaced to the user", async () => {
    scriptHistorico([bffUnreachable()]);
    renderHistorial();
    expect(await screen.findByText(/\(502\)/)).toBeInTheDocument();
  });

  it("recovery: Reintentar re-queries the backend and shows the persisted reports once it is back", async () => {
    const fetchMock = scriptHistorico([bffUnreachable(), bffUnreachable(), okList([ENTRY])]);
    renderHistorial();
    const retry = await screen.findByRole("button", { name: /Reintentar/i });
    const callsBeforeRetry = fetchMock.mock.calls.length;
    fireEvent.click(retry);
    expect(await screen.findByText("Informe — La Guajira")).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
    expect(screen.queryByText("No se pudo cargar el histórico")).toBeNull();
  });

  it("recovery to an empty but healthy backend shows the empty state (not the error)", async () => {
    scriptHistorico([bffUnreachable(), bffUnreachable(), okList([])]);
    renderHistorial();
    fireEvent.click(await screen.findByRole("button", { name: /Reintentar/i }));
    expect(await screen.findByText(/Aún no has generado análisis/i)).toBeInTheDocument();
  });

  it("a backend that fails again after a retry keeps the error state (no crash, no stale data)", async () => {
    scriptHistorico([bffUnreachable()]);
    renderHistorial();
    fireEvent.click(await screen.findByRole("button", { name: /Reintentar/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Reintentar/i })).toBeEnabled(),
    );
    expect(screen.getByText("No se pudo cargar el histórico")).toBeInTheDocument();
  });
});
