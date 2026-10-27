import { describe, it, expect, vi, beforeEach } from "vitest";
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
import { VariablesProvider } from "@/app/Utils/contexts/VariablesContext";
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
  default: vi.fn(function () {
    return {
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
      addImage: vi.fn(),
      addPage: vi.fn(),
      save: saveMock,
    };
  }),
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

  it("muestra la dimensión regulatoria (informativa) en el informe completo", async () => {
    render(
      <Wrapper>
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
    await waitFor(() => {
      expect(html2canvasMock).toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalledTimes(1);
    });
    const [filename] = saveMock.mock.calls[0];
    expect(filename).toMatch(/^informe-vento-\d+\.pdf$/);
  });

  it("muestra mensaje de error si la generación del PDF falla", async () => {
    html2canvasMock.mockRejectedValueOnce(new Error("boom"));
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
    const errores = await screen.findAllByText(/No se pudo generar el PDF/i);
    expect(errores.length).toBeGreaterThanOrEqual(1);
  });
});
