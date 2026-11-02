import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEffect, type ReactNode } from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { latLngToCell } from "h3-js";
import Report from "@/app/Components/report/Report";
import {
  AprincipalProvider,
  useAprincipal,
} from "@/app/Utils/contexts/AccionPrincipalContext";
import { ToastProvider } from "@/app/Components/ui/Toast";
import { HistorialProvider } from "@/app/Utils/historial/HistorialContext";
import {
  VariablesProvider,
  useVariables,
} from "@/app/Utils/contexts/VariablesContext";
import { REGULATORY_NORMS } from "@/app/Utils/report/regulatoryNorms";
import { EconomicProvider } from "@/app/Utils/contexts/EconomicContext";
import { RegulatoryProvider } from "@/app/Utils/contexts/RegulatoryContext";

// El PDF se genera capturando el DOM con html2canvas-pro + jsPDF; se mockean
// ambos para no depender de canvas real en jsdom.
const { html2canvasMock, saveMock } = vi.hoisted(() => ({
  html2canvasMock: vi.fn(),
  saveMock: vi.fn(),
}));

vi.mock("html2canvas-pro", () => ({
  default: html2canvasMock,
}));

vi.mock("jspdf", () => ({
  // function (no arrow) para que `new jsPDF()` sea construible.
  // PDF nativo (e6cf8ba y fases 2–4: c75f581, ca122d3): el export además usa
  // metadatos (setProperties), navegación por páginas (getNumberOfPages/setPage),
  // capa de texto (setFontSize/text) y bookmarks (outline.add).
  default: vi.fn(function () {
    let pages = 1;
    return {
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
      addImage: vi.fn(),
      addPage: vi.fn(() => {
        pages += 1;
      }),
      getNumberOfPages: vi.fn(() => pages),
      setPage: vi.fn(),
      setProperties: vi.fn(),
      setFontSize: vi.fn(),
      text: vi.fn(),
      outline: { add: vi.fn() },
      save: saveMock,
    };
  }),
}));

// svg2pdf.js (charts → vector sobre el jsPDF) no puede pintar sobre el mock.
vi.mock("svg2pdf.js", () => ({
  svg2pdf: vi.fn(() => Promise.resolve()),
}));

// useIsAdmin() → useSession(): se mockea para no requerir SessionProvider.
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

// El informe usa varios contextos (Aprincipal, Variables, Economic, Regulatory,
// Toast, Historial). Sin ellos, useEconomic/useRegulatory lanzan.
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <HistorialProvider>
        <VariablesProvider>
          <EconomicProvider>
            <RegulatoryProvider>
              <AprincipalProvider>{children}</AprincipalProvider>
            </RegulatoryProvider>
          </EconomicProvider>
        </VariablesProvider>
      </HistorialProvider>
    </ToastProvider>
  );
}

// Activa variables (p. ej. normas `norma:<id>`) como si se prendieran en Dimensiones.
function VariablesSeeder({ ids }: { ids: string[] }) {
  const { toggleVariable } = useVariables();
  useEffect(() => {
    for (const id of ids) toggleVariable(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function Seeder({ hexes }: { hexes: string[] }) {
  const { setSelectedHexes } = useAprincipal();
  useEffect(() => {
    setSelectedHexes(new Set(hexes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe("Report (US06) — pantalla de informe (hojas A4)", () => {
  beforeEach(() => {
    html2canvasMock.mockReset();
    saveMock.mockReset();
    html2canvasMock.mockResolvedValue({
      width: 800,
      height: 2400,
      toDataURL: () => "data:image/jpeg;base64,AAA",
    });
    // El export loguea un warn best-effort por hoja (p. ej. capa de texto: jsdom
    // no implementa Range#getBoundingClientRect) → se silencia para no saturar.
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza el inline: título, las 3 dimensiones puntuables y las acciones", () => {
    render(
      <Wrapper>
        <Report />
      </Wrapper>,
    );
    expect(
      screen.getByRole("heading", { name: /Idoneidad eólica/i }),
    ).toBeInTheDocument();
    // Las 3 dimensiones PUNTUABLES aparecen en las barras del resumen inline.
    // La económica y la regulatoria son INFORMATIVAS (no puntúan) → no van aquí.
    expect(screen.getAllByText("Ambiental").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Técnica").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Social").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("button", { name: /Previsualizar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Descargar PDF/i }),
    ).toBeInTheDocument();
  });

  // 161cc1a/2c0579d (+ chunking f4f7038/764b2fe): la hoja regulatoria solo entra
  // al informe si hay al menos una NORMA ACTIVA (prendida en Dimensiones) — sin
  // normas activas no se agrega (antes salía el semáforo con 0s).
  it("muestra la dimensión regulatoria (informativa) en el informe completo cuando hay normas activas", { timeout: 15_000 }, async () => {
    render(
      <Wrapper>
        <VariablesSeeder ids={[`norma:${REGULATORY_NORMS[0].id}`]} />
        <Report />
      </Wrapper>,
    );
    // Previsualizar abre el ReportBuilder (pantalla completa) con las hojas.
    fireEvent.click(screen.getByRole("button", { name: /Previsualizar/i }));
    // "Dimensión regulatoria" aparece en el índice y en la hoja → varias.
    expect(
      (await screen.findAllByText(/Dimensión regulatoria/i)).length,
    ).toBeGreaterThanOrEqual(1);
    // Deja claro que es informativa y no puntúa.
    expect(screen.getAllByText(/no puntúa/i).length).toBeGreaterThanOrEqual(1);
    // Y lista la norma activa.
    expect(
      screen.getAllByText(REGULATORY_NORMS[0].nombre).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("NO agrega la hoja regulatoria si no hay ninguna norma activa", { timeout: 15_000 }, async () => {
    render(
      <Wrapper>
        <Report />
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Previsualizar/i }));
    // El builder abre (hay hojas), pero sin la regulatoria.
    expect(
      (await screen.findAllByRole("button", { name: /Descargar PDF/i })).length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/Dimensión regulatoria/i)).not.toBeInTheDocument();
  });

  it("muestra 0 km² cuando no hay selección", () => {
    render(
      <Wrapper>
        <Report />
      </Wrapper>,
    );
    expect(screen.getAllByText(/0\s*km²/).length).toBeGreaterThanOrEqual(1);
  });

  it("muestra la región derivada cuando hay selección (La Guajira)", () => {
    const hex = latLngToCell(11.5, -72.5, 7);
    render(
      <Wrapper>
        <Seeder hexes={[hex]} />
        <Report />
      </Wrapper>,
    );
    expect(screen.getAllByText(/La Guajira/).length).toBeGreaterThanOrEqual(1);
  });

  it("captura el DOM y descarga el PDF al hacer click en 'Descargar PDF'", async () => {
    render(
      <Wrapper>
        <Report />
      </Wrapper>,
    );
    // El inline "Descargar PDF" abre el builder; el del builder descarga.
    fireEvent.click(screen.getByRole("button", { name: /Descargar PDF/i }));
    const botones = screen.getAllByRole("button", { name: /Descargar PDF/i });
    await act(async () => {
      fireEvent.click(botones[botones.length - 1]);
    });
    // El export recorre todas las hojas (raster + vector + capa de texto) → más
    // lento que el antiguo raster único.
    await waitFor(
      () => {
        expect(html2canvasMock).toHaveBeenCalled();
        expect(saveMock).toHaveBeenCalledTimes(1);
      },
      { timeout: 20_000 },
    );
    const [filename] = saveMock.mock.calls[0];
    expect(filename).toMatch(/^informe-vento-\d+\.pdf$/);
  }, 30_000);

  it("muestra mensaje de error si la generación del PDF falla", async () => {
    // 06705a4: un fallo de raster de UNA hoja ya no aborta (se omite la hoja, sin
    // fallback a html2canvas). Un fallo del documento sí aborta → se simula en save.
    saveMock.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    render(
      <Wrapper>
        <Report />
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Descargar PDF/i }));
    const botones = screen.getAllByRole("button", { name: /Descargar PDF/i });
    await act(async () => {
      fireEvent.click(botones[botones.length - 1]);
    });
    // Espera barata (mock) a que el export llegue a save; luego consulta el DOM
    // una vez (findBy* re-consultaría el DOM grande del builder en cada mutación).
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1), {
      timeout: 20_000,
    });
    await waitFor(() =>
      expect(
        screen.getAllByText(/No se pudo generar el PDF: boom/i).length,
      ).toBeGreaterThanOrEqual(1),
    );
  }, 30_000);
});
