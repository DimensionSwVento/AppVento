import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  CaracteristicasProvider,
  useCaracteristicas,
} from "../Utils/CaracteristicasContext";

const useAprincipalMock = vi.fn();
const dominantHexTypeMock = vi.fn();

vi.mock("../Utils/AccionPrincipalContext", () => ({
  useAprincipal: () => useAprincipalMock(),
}));

vi.mock("../Utils/hexClassification", () => ({
  dominantHexType: (hexes: Iterable<string>) => dominantHexTypeMock(hexes),
}));

vi.mock("./NextStepButton", () => ({
  default: ({
    disabled,
    blockedReason,
  }: {
    disabled?: boolean;
    blockedReason?: string;
  }) => (
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

function CapacitySetter({ value }: { value: number }) {
  const { setCapacidadMW } = useCaracteristicas();
  return <button onClick={() => setCapacidadMW(value)}>set capacity</button>;
}

describe("Caracteristicas (US05)", () => {
  beforeEach(() => {
    dominantHexTypeMock.mockReturnValue("onshore");
  });

  it("sin hexágonos: pide seleccionar área y bloquea el siguiente paso", () => {
    dominantHexTypeMock.mockReturnValue(null);
    renderCaracteristicas([]);
    expect(
      screen.getByText(
        /Selecciona al menos un hexágono en el mapa para detectar/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("next-step")).toBeDisabled();
  });

  it("detecta emplazamiento onshore y muestra el badge", () => {
    renderCaracteristicas();
    expect(screen.getByText("Onshore (tierra)")).toBeInTheDocument();
    expect(
      screen.getByText("El proyecto está en tierra firme."),
    ).toBeInTheDocument();
    // Onshore no requiere tipo de tecnología offshore.
    expect(
      screen.queryByText("Tipo de tecnología offshore"),
    ).not.toBeInTheDocument();
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
      screen.getByText(
        /La capacidad nominal debe ser de al menos 0.01 MW/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ingresa el número de aerogeneradores."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Selecciona la categoría\/perfil del aerogenerador/),
    ).toBeInTheDocument();
    expect(screen.getByText("Ingresa la distancia al SIN.")).toBeInTheDocument();
    expect(screen.getByTestId("next-step")).toBeDisabled();
  });

  it("acepta exactamente el límite mínimo y elimina el estado inválido", () => {
    renderCaracteristicas();
    const picker = screen.getByRole("group", {
      name: "Capacidad nominal en megavatios",
    });
    const units = screen.getByRole("textbox", { name: "Unidades" });

    expect(picker).toHaveAccessibleDescription(/0.01 – 999.99/);
    expect(units).toHaveAttribute("aria-invalid", "true");
    fireEvent.keyDown(
      screen.getByRole("textbox", { name: "Centésimas" }),
      { key: "1" },
    );

    expect(screen.getByText("0.01 MW")).toBeInTheDocument();
    expect(
      screen.queryByText(/La capacidad nominal debe ser de al menos/),
    ).not.toBeInTheDocument();
    expect(units).not.toHaveAttribute("aria-invalid");
  });

  it("acepta exactamente 999.99 MW mediante entrada por teclado", () => {
    renderCaracteristicas();

    const hundreds = screen.getByRole("textbox", { name: "Centenas" });
    hundreds.focus();
    fireEvent.keyDown(hundreds, { key: "9" });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Decenas" }), {
      key: "9",
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Unidades" }), {
      key: "9",
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Décimas" }), {
      key: "9",
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Centésimas" }), {
      key: "9",
    });

    expect(screen.getByText("999.99 MW")).toBeInTheDocument();
    expect(
      screen.queryByText(/La capacidad excede el límite/),
    ).not.toBeInTheDocument();
  });

  it("rechaza un valor de contexto superior al límite y lo describe en el picker", () => {
    useAprincipalMock.mockReturnValue({ selectedHexes: new Set([HEX]) });
    render(
      <CaracteristicasProvider>
        <CapacitySetter value={1_000} />
        <Caracteristicas />
      </CaracteristicasProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "set capacity" }));

    const error = screen.getByText(
      "La capacidad excede el límite de 999.99 MW.",
    );
    expect(error).toBeInTheDocument();
    expect(
      screen.getByRole("group", {
        name: "Capacidad nominal en megavatios",
      }),
    ).toHaveAccessibleDescription(error.textContent ?? "");
  });

  it("preserva la categoría de tamaño derivada al escribir la capacidad", () => {
    renderCaracteristicas();

    expect(screen.getByText("Pequeña (≤1 MW)")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Unidades" }), {
      key: "2",
    });
    expect(screen.getByText("Mediano (>1 MW)")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Decenas" }), {
      key: "2",
    });
    expect(screen.getByText("Grande (>20 MW)")).toBeInTheDocument();
  });

  it("valida el rango del número de aerogeneradores (máx. 500)", () => {
    renderCaracteristicas();
    const input = screen.getByPlaceholderText("0");
    fireEvent.change(input, { target: { value: "501" } });
    expect(
      screen.getByText(/Cantidad fuera del rango técnico permitido/),
    ).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "10" } });
    expect(
      screen.queryByText(/Cantidad fuera del rango técnico permitido/),
    ).not.toBeInTheDocument();
  });

  it("valida el rango de la distancia al SIN (máx. 500 km)", () => {
    renderCaracteristicas();
    const input = screen.getByPlaceholderText("0.0");
    fireEvent.change(input, { target: { value: "600" } });
    expect(
      screen.getByText(/Distancia fuera del rango técnico/),
    ).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "42.5" } });
    expect(
      screen.queryByText(/Distancia fuera del rango técnico/),
    ).not.toBeInTheDocument();
  });

  it("formulario completo habilita el siguiente paso", () => {
    renderCaracteristicas();

    // Capacidad: paso decimal predeterminado de 5 centésimas (0 → 0.05 MW).
    fireEvent.click(
      screen.getByRole("button", { name: "Aumentar Centésimas" }),
    );
    // Número de aerogeneradores.
    fireEvent.change(screen.getByPlaceholderText("0"), {
      target: { value: "10" },
    });
    // Categoría M.
    fireEvent.click(
      screen.getByRole("button", { name: /Mediano · 2–4 MW/ }),
    );
    // Distancia al SIN.
    fireEvent.change(screen.getByPlaceholderText("0.0"), {
      target: { value: "12" },
    });

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
