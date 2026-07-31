import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Dimensions from "@/app/Components/dimensions/Dimensions";
import { VariablesProvider } from "@/app/Utils/contexts/VariablesContext";
import { AprincipalProvider } from "@/app/Utils/contexts/AccionPrincipalContext";
import { DIMENSIONS, VARIABLES } from "@/app/Utils/variables/variablesCatalog";

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
    fireEvent.change(input, { target: { value: "WPD" } });

    // La dimensión técnica (que contiene la variable matching) sigue
    // renderizando su card. Con búsqueda las cards se abren solas.
    expect(screen.getByText(/Dimensión técnica/)).toBeInTheDocument();
    expect(screen.queryByText(/Dimensión regulatoria/)).not.toBeInTheDocument();
    expect(
      screen.getByText("Densidad de potencia WPD"),
    ).toBeInTheDocument();

    // Una variable sin match no debe estar visible (ni en cards visibles).
    const sinMatch = VARIABLES.filter(
      (v) =>
        !v.label.toLowerCase().includes("wpd") &&
        !v.description.toLowerCase().includes("wpd"),
    ).map((v) => v.label);
    for (const lbl of sinMatch.slice(0, 3)) {
      expect(screen.queryByText(lbl)).not.toBeInTheDocument();
    }
  });

  it("filtra variables por el query del search bar (match en descripción)", () => {
    renderDimensions();
    const input = screen.getByLabelText("Buscar variables");
    // 'vías' aparece en la descripción de `distancia-vial`
    // ("Distancia lineal (m) a vías principales…") pero no en su label.
    fireEvent.change(input, { target: { value: "vías" } });

    // La card de la dimensión técnica sigue, el resto desaparece.
    expect(screen.getByText(/Dimensión técnica/)).toBeInTheDocument();
    expect(
      screen.getByText("Distancia a infraestructura vial"),
    ).toBeInTheDocument();
  });
});
