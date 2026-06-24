import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { latLngToCell } from "h3-js";
import Report from "./Report";
import {
  AprincipalProvider,
  useAprincipal,
} from "../Utils/AccionPrincipalContext";

const { exportElementToPdfMock } = vi.hoisted(() => ({
  exportElementToPdfMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../Utils/pdfExport", () => ({
  exportElementToPdf: exportElementToPdfMock,
}));

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
    exportElementToPdfMock.mockClear();
  });

  it("renderiza el título, las 5 dimensiones y el bloque de resultado preliminar", () => {
    render(
      <AprincipalProvider>
        <Report />
      </AprincipalProvider>,
    );
    expect(
      screen.getByText("Consulta y descarga el resultado preliminar"),
    ).toBeInTheDocument();
    // Las 5 dimensiones del catálogo (excluido "General" — usado para el
    // puntaje agregado, no para el listado de barras).
    expect(screen.getByText("Ambiental")).toBeInTheDocument();
    expect(screen.getByText("Técnica")).toBeInTheDocument();
    expect(screen.getByText("Económica")).toBeInTheDocument();
    expect(screen.getByText("Socioeconómica")).toBeInTheDocument();
    expect(screen.getByText("Regulatoria")).toBeInTheDocument();
    // Sección "Resultado preliminar" (exact, distingue del h2
    // "Consulta y descarga el resultado preliminar").
    expect(screen.getByText("Resultado preliminar")).toBeInTheDocument();
  });

  it("muestra '—' en región/coordenadas y 0 km² cuando no hay selección", () => {
    render(
      <AprincipalProvider>
        <Report />
      </AprincipalProvider>,
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/^0\s*km²/)).toBeInTheDocument();
  });

  it("muestra región derivada y coordenadas cuando hay selección (La Guajira)", () => {
    const hex = latLngToCell(11.5, -72.5, 7);
    render(
      <AprincipalProvider>
        <Seeder hexes={[hex]} />
        <Report />
      </AprincipalProvider>,
    );
    expect(screen.getByText("La Guajira")).toBeInTheDocument();
    expect(screen.getByText(/-72,/)).toBeInTheDocument();
  });

  it("dispara exportElementToPdf al hacer click en 'Descargar PDF'", async () => {
    render(
      <AprincipalProvider>
        <Report />
      </AprincipalProvider>,
    );
    const btn = screen.getByRole("button", { name: /Descargar PDF/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() => {
      expect(exportElementToPdfMock).toHaveBeenCalledTimes(1);
    });
    const [, filename] = exportElementToPdfMock.mock.calls[0];
    expect(filename).toMatch(/^informe-vento-\d+\.pdf$/);
  });

  it("muestra mensaje de error si la generación del PDF falla", async () => {
    exportElementToPdfMock.mockRejectedValueOnce(new Error("boom"));
    render(
      <AprincipalProvider>
        <Report />
      </AprincipalProvider>,
    );
    const btn = screen.getByRole("button", { name: /Descargar PDF/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(
      await screen.findByText(/No se pudo generar el PDF/i),
    ).toBeInTheDocument();
  });
});
