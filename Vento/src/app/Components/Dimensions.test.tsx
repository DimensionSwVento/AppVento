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

    // La dimensión técnica (que contiene la variable matching) sigue
    // renderizando su card. Las dimensiones sin matches desaparecen.
    expect(screen.getByText(/Dimensión técnica/)).toBeInTheDocument();
    expect(screen.queryByText(/Dimensión regulatoria/)).not.toBeInTheDocument();

    // Expandir la card para ver la variable matching.
    fireEvent.click(screen.getByText(/Dimensión técnica/));
    expect(
      screen.getByText("Velocidad del viento media anualizada"),
    ).toBeInTheDocument();

    // Una variable sin match no debe estar visible (ni en cards visibles).
    const sinMatch = VARIABLES.filter(
      (v) =>
        !v.label.toLowerCase().includes("viento") &&
        !v.description.toLowerCase().includes("viento"),
    ).map((v) => v.label);
    for (const lbl of sinMatch.slice(0, 3)) {
      expect(screen.queryByText(lbl)).not.toBeInTheDocument();
    }
  });

  it("filtra variables por el query del search bar (match en descripción)", () => {
    renderDimensions();
    const input = screen.getByLabelText("Buscar variables");
    // 'subestaciones' aparece en la descripción de `nodos-conexion`
    // ("Distancia a subestaciones y nodos eléctricos") pero no en su label.
    fireEvent.change(input, { target: { value: "subestaciones" } });

    // La card de la dimensión técnica sigue, el resto desaparece.
    expect(screen.getByText(/Dimensión técnica/)).toBeInTheDocument();
    // Expandir y verificar el label
    fireEvent.click(screen.getByText(/Dimensión técnica/));
    expect(
      screen.getByText("Distancia a nodos de conexión"),
    ).toBeInTheDocument();
  });
});
