import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Dimensions from "./Dimensions";
import { VariablesProvider } from "../Utils/VariablesContext";
import { AprincipalProvider } from "../Utils/AccionPrincipalContext";
import { DIMENSIONS, VARIABLES } from "../Utils/variablesCatalog";

function renderDimensions() {
  return render(
    <AprincipalProvider>
      <VariablesProvider>
        <Dimensions />
      </VariablesProvider>
    </AprincipalProvider>,
  );
}

describe("Dimensions (US04-AC1)", () => {
  it("renderiza el título y las 5 cards de dimensión", () => {
    renderDimensions();
    expect(
      screen.getByText(
        "Configura las variables de interés por cada dimensión",
      ),
    ).toBeInTheDocument();
    for (const d of DIMENSIONS) {
      expect(
        screen.getByText(new RegExp(`${d.label}`)),
      ).toBeInTheDocument();
    }
  });

  it("renderiza el search bar con accesibilidad por label", () => {
    renderDimensions();
    expect(screen.getByLabelText("Buscar variables")).toBeInTheDocument();
  });

  it("filtra variables por el query del search bar (match en label)", () => {
    renderDimensions();
    const input = screen.getByLabelText("Buscar variables");
    fireEvent.change(input, { target: { value: "viento" } });

    // La variable "Velocidad del viento a 100m" sigue visible (su card se auto-expande)
    expect(
      screen.getByText("Velocidad del viento a 100m"),
    ).toBeInTheDocument();

    // Una dimensión sin matches no debe renderizarse
    const sinMatch = VARIABLES.filter((v) =>
      !v.label.toLowerCase().includes("viento") &&
      !v.description.toLowerCase().includes("viento"),
    ).map((v) => v.label);
    // al menos algunas variables sin match no aparecen
    for (const lbl of sinMatch.slice(0, 3)) {
      expect(screen.queryByText(lbl)).not.toBeInTheDocument();
    }
  });

  it("filtra variables por el query del search bar (match en descripción)", () => {
    renderDimensions();
    const input = screen.getByLabelText("Buscar variables");
    fireEvent.change(input, { target: { value: "transmisión" } });
    expect(
      screen.getByText("Distancia a subestación"),
    ).toBeInTheDocument();
  });
});
