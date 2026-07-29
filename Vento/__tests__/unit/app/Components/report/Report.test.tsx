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

const { generateReportPdfMock } = vi.hoisted(() => ({
  generateReportPdfMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/Utils/report/pdfExport", () => ({
  generateReportPdf: generateReportPdfMock,
}));

// Report usa useToast() (US09) y useHistorial() (US07) → requieren sus providers.
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <HistorialProvider>
        <AprincipalProvider>{children}</AprincipalProvider>
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

describe("Report (US06-AC3) — pantalla de informe", () => {
  beforeEach(() => {
    generateReportPdfMock.mockClear();
  });

  it("renderiza el título, las 4 dimensiones puntuables y el bloque de resultado preliminar", () => {
    render(
      <Wrapper>
        <Report />
      </Wrapper>,
    );
    expect(screen.getByText("Informe Vento")).toBeInTheDocument();
    expect(screen.getByText("Descarga del informe")).toBeInTheDocument();
    // Las 4 dimensiones PUNTUABLES (excluido "General" — puntaje agregado — y
    // "Regulatoria" — informativa, US-FB3-05 / feedback item 11). Sin selección
    // el radar no se renderiza, así que cada label aparece una sola vez.
    expect(screen.getByText("Ambiental")).toBeInTheDocument();
    expect(screen.getByText("Técnica")).toBeInTheDocument();
    expect(screen.getByText("Económica")).toBeInTheDocument();
    expect(screen.getByText("Socioeconómica")).toBeInTheDocument();
    expect(screen.getByText("Resultado preliminar")).toBeInTheDocument();
  });

  // US-FB3-05 / feedback item 11 — "Regulatoria" como bloque informativo.
  it("muestra 'Regulatoria' como bloque informativo (variables, sin score)", () => {
    render(
      <AprincipalProvider>
        <Report />
      </AprincipalProvider>,
    );
    // Título del bloque + etiqueta "Informativa".
    expect(screen.getByText("Regulatoria")).toBeInTheDocument();
    expect(screen.getByText("Informativa")).toBeInTheDocument();
    // Sus variables aparecen listadas como contexto…
    expect(
      screen.getByText("Tasa de éxito en implementación de proyectos"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Proyectos de generación implementados XM"),
    ).toBeInTheDocument();
    // …y deja claro que no entra al puntaje.
    expect(
      screen.getByText(/No se incluye en el cálculo del puntaje general/i),
    ).toBeInTheDocument();
  });

  it("muestra '—' en región/coordenadas y 0 km² cuando no hay selección", () => {
    render(
      <Wrapper>
        <Report />
      </Wrapper>,
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/^0\s*km²/)).toBeInTheDocument();
  });

  it("muestra región derivada y coordenadas cuando hay selección (La Guajira)", () => {
    const hex = latLngToCell(11.5, -72.5, 7);
    render(
      <Wrapper>
        <Seeder hexes={[hex]} />
        <Report />
      </Wrapper>,
    );
    expect(screen.getByText("La Guajira")).toBeInTheDocument();
    expect(screen.getByText(/-72,/)).toBeInTheDocument();
  });

  it("dispara generateReportPdf al hacer click en 'Descargar PDF'", async () => {
    render(
      <Wrapper>
        <Report />
      </Wrapper>,
    );
    const btn = screen.getByRole("button", { name: /Descargar PDF/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() => {
      expect(generateReportPdfMock).toHaveBeenCalledTimes(1);
    });
    const [, filename] = generateReportPdfMock.mock.calls[0];
    expect(filename).toMatch(/^informe-vento-\d+\.pdf$/);
  });

  it("muestra mensaje de error si la generación del PDF falla", async () => {
    generateReportPdfMock.mockRejectedValueOnce(new Error("boom"));
    render(
      <Wrapper>
        <Report />
      </Wrapper>,
    );
    const btn = screen.getByRole("button", { name: /Descargar PDF/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    // Aparece en el error inline y también como toast (US09) → puede haber 2.
    const errores = await screen.findAllByText(/No se pudo generar el PDF/i);
    expect(errores.length).toBeGreaterThanOrEqual(1);
  });
});
