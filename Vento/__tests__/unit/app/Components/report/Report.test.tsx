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
      setFillColor: vi.fn(),
      rect: vi.fn(),
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      setDrawColor: vi.fn(),
      setLineWidth: vi.fn(),
      line: vi.fn(),
      text: vi.fn(),
      save: saveMock,
    };
  }),
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
    html2canvasMock.mockReset();
    saveMock.mockReset();
    html2canvasMock.mockResolvedValue({
      width: 800,
      height: 2400,
      toDataURL: () => "data:image/jpeg;base64,AAA",
    });
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
    // "Regulatoria" — informativa, US-FB3-05 / feedback item 11). Los labels
    // pueden aparecer en las barras y en la tabla de variables → getAllByText.
    expect(screen.getAllByText("Ambiental").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Técnica").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Social").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Macroeconómica").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Resultado preliminar")).toBeInTheDocument();
  });

  // US-FB3-05 / feedback item 11 — "Regulatoria" informativa. Hoy vacía
  // ("Falta" del cliente) y visible solo en el informe COMPLETO (pantalla
  // completa / PDF), no en la previsualización compacta.
  it("muestra 'Regulatoria' como bloque informativo (pendiente) en el informe completo", async () => {
    render(
      <Wrapper>
        <Report />
      </Wrapper>,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Ver informe a pantalla completa/i,
      }),
    );
    expect(await screen.findByText("Regulatoria")).toBeInTheDocument();
    expect(screen.getByText("Informativa")).toBeInTheDocument();
    // Deja claro que no entra al puntaje (sin notas de estado interno).
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
    // "0 km²" aparece en la cabecera y en el resumen → puede haber varias.
    expect(screen.getAllByText(/0\s*km²/).length).toBeGreaterThanOrEqual(1);
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
    // Las coordenadas aparecen en la cabecera y en el resumen → varias.
    expect(screen.getAllByText(/-72,/).length).toBeGreaterThanOrEqual(1);
  });

  it("captura el DOM y descarga el PDF al hacer click en 'Descargar PDF'", async () => {
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
      expect(html2canvasMock).toHaveBeenCalledTimes(1);
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
    const btn = screen.getByRole("button", { name: /Descargar PDF/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    // Aparece en el error inline y también como toast (US09) → puede haber 2.
    const errores = await screen.findAllByText(/No se pudo generar el PDF/i);
    expect(errores.length).toBeGreaterThanOrEqual(1);
  });
});
