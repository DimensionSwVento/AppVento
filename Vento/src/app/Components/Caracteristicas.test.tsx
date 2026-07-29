import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CaracteristicasProvider } from "../Utils/CaracteristicasContext";

const useAprincipalMock = vi.fn();
const dominantHexTypeMock = vi.fn();

vi.mock("../Utils/AccionPrincipalContext", () => ({
  useAprincipal: () => useAprincipalMock(),
}));

vi.mock("../Utils/hexClassification", () => ({
  dominantHexType: (hexes: Iterable<string>) => dominantHexTypeMock(hexes),
}));

vi.mock("./NextStepButton", () => ({
  default: ({ disabled, blockedReason }: { disabled?: boolean; blockedReason?: string }) => (
    <button data-testid="next-step" disabled={disabled} title={blockedReason}>
      next
    </button>
  ),
}));

import Caracteristicas from "./Caracteristicas";

// Hex H3 real (res 10) — cellArea() exige un índice válido.
const HEX = "8a2a1072b59ffff";

function renderCaracteristicas(hexes: string[] = [HEX]) {
  useAprincipalMock.mockReturnValue({ selectedHexes: new Set(hexes) });
  return render(
    <CaracteristicasProvider>
      <Caracteristicas />
    </CaracteristicasProvider>,
  );
}

describe("Caracteristicas (US05)", () => {
  beforeEach(() => {
    dominantHexTypeMock.mockReturnValue("onshore");
  });

  it("sin hexágonos: pide seleccionar área y bloquea el siguiente paso", () => {
    dominantHexTypeMock.mockReturnValue(null);
    renderCaracteristicas([]);
    expect(
      screen.getByText(/Selecciona al menos un hexágono en el mapa para detectar/),
    ).toBeInTheDocument();
    expect(screen.getByTestId("next-step")).toBeDisabled();
  });

  it("detecta emplazamiento onshore y muestra el badge", () => {
    renderCaracteristicas();
    expect(screen.getByText("Onshore (tierra)")).toBeInTheDocument();
    expect(screen.getByText("El proyecto está en tierra firme.")).toBeInTheDocument();
    // Onshore no requiere tipo de tecnología offshore.
    expect(screen.queryByText("Tipo de tecnología offshore")).not.toBeInTheDocument();
  });

  it("emplazamiento offshore: muestra selector de tecnología y exige elegirla", () => {
    dominantHexTypeMock.mockReturnValue("offshore");
    renderCaracteristicas();
    expect(screen.getByText("Offshore (mar)")).toBeInTheDocument();
    expect(screen.getByText("Tipo de tecnología offshore")).toBeInTheDocument();
    expect(
      screen.getByText(/Selecciona el tipo de tecnología offshore/),
    ).toBeInTheDocument();

    const flotante = screen.getByRole("button", { name: /Flotante/ });
    fireEvent.click(flotante);
    expect(flotante).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.queryByText(/Selecciona el tipo de tecnología offshore/),
    ).not.toBeInTheDocument();
  });

  it("muestra errores de validación iniciales (US05-AC3)", () => {
    renderCaracteristicas();
    expect(
      screen.getByText(/La capacidad nominal debe ser mayor a 0 MW/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Selecciona la categoría\/perfil del aerogenerador/),
    ).toBeInTheDocument();
    expect(screen.getByTestId("next-step")).toBeDisabled();
  });

  it("elimina los inputs manuales de aerogeneradores y distancia al SIN", () => {
    renderCaracteristicas();

    expect(screen.queryByText("Distancia al SIN")).not.toBeInTheDocument();
    expect(screen.queryByText(/Ingresa el número de aerogeneradores/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ingresa la distancia al SIN/)).not.toBeInTheDocument();
  });

  it("deriva aerogeneradores, energía y área desde capacidad y categoría", () => {
    renderCaracteristicas();

    fireEvent.click(screen.getByRole("button", { name: "Aumentar Unidades" }));
    fireEvent.click(screen.getByRole("button", { name: /Mediano · 2–4 MW/ }));

    const turbineLabel = screen.getByText("Número de aerogeneradores");
    expect(turbineLabel.nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("3,07 GWh/año")).toBeInTheDocument();
    expect(screen.getByText("0,2 km²")).toBeInTheDocument();
  });

  it("formulario completo habilita el siguiente paso", () => {
    renderCaracteristicas();

    // Capacidad: subir las unidades del picker (0 → 1 MW).
    fireEvent.click(screen.getByRole("button", { name: "Aumentar Unidades" }));
    // Categoría M.
    fireEvent.click(screen.getByRole("button", { name: /Mediano · 2–4 MW/ }));

    expect(screen.getByTestId("next-step")).toBeEnabled();
  });

  it("muestra el área total del proyecto en km²", () => {
    renderCaracteristicas();
    expect(screen.getByText(/km²/)).toBeInTheDocument();
    expect(
      screen.queryByText("Selecciona hexágonos en el mapa"),
    ).not.toBeInTheDocument();
  });
});
