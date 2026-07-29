import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { latLngToCell } from "h3-js";
import Report from "./Report";
import {
  AprincipalProvider,
  useAprincipal,
} from "../Utils/AccionPrincipalContext";
import {
  VariablesProvider,
  useVariables,
} from "../Utils/VariablesContext";

const { exportElementToPdfMock, fetchNearestSinDistanceMock } = vi.hoisted(() => ({
  exportElementToPdfMock: vi.fn().mockResolvedValue(undefined),
  fetchNearestSinDistanceMock: vi.fn(),
}));

vi.mock("../Utils/pdfExport", () => ({
  exportElementToPdf: exportElementToPdfMock,
}));

vi.mock("../Utils/sinDistance", () => ({
  fetchNearestSinDistance: fetchNearestSinDistanceMock,
}));

function Seeder({ hexes }: { hexes: string[] }) {
  const { setSelectedHexes } = useAprincipal();
  useEffect(() => {
    setSelectedHexes(new Set(hexes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}


function VariableSeeder({ id }: { id: string }) {
  const { toggleVariable } = useVariables();
  useEffect(() => {
    toggleVariable(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
describe("Report (US06-AC3) — pantalla de informe", () => {
  beforeEach(() => {
    exportElementToPdfMock.mockClear();
    fetchNearestSinDistanceMock.mockReset();
    fetchNearestSinDistanceMock.mockResolvedValue({
      h3Index: "hex-near",
      distanceKm: 2.5,
      source: "backend",
    });
  });

  it("renderiza el título, las 5 dimensiones y el bloque de resultado preliminar", () => {
    render(
      <AprincipalProvider>
        <Report />
      </AprincipalProvider>,
    );
    expect(screen.getByText("Informe Vento")).toBeInTheDocument();
    expect(screen.getByText("Descarga del informe")).toBeInTheDocument();
    // Las 5 dimensiones del catálogo (excluido "General" — usado para el
    // puntaje agregado, no para el listado de barras).
    expect(screen.getByText("Ambiental")).toBeInTheDocument();
    expect(screen.getByText("Técnica")).toBeInTheDocument();
    expect(screen.getByText("Económica")).toBeInTheDocument();
    expect(screen.getByText("Socioeconómica")).toBeInTheDocument();
    expect(screen.getByText("Regulatoria")).toBeInTheDocument();
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

  it("reporta la distancia del hex más cercano al SIN en selección múltiple", async () => {
    const firstHex = latLngToCell(11.5, -72.5, 7);
    const secondHex = latLngToCell(11.6, -72.4, 7);
    render(
      <AprincipalProvider>
        <Seeder hexes={[firstHex, secondHex]} />
        <VariablesProvider>
          <VariableSeeder id="distancia-sin" />
          <Report />
        </VariablesProvider>
      </AprincipalProvider>,
    );

    const row = (await screen.findByText("Distancia al SIN")).closest("li");
    await waitFor(() => {
      expect(row).toHaveTextContent("2,5km");
    });
    expect(fetchNearestSinDistanceMock).toHaveBeenCalledTimes(1);

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
