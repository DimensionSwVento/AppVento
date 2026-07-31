import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Dimensions from "@/app/Components/dimensions/Dimensions";
import { VariablesProvider } from "@/app/Utils/contexts/VariablesContext";
import { AprincipalProvider } from "@/app/Utils/contexts/AccionPrincipalContext";
import { DIMENSIONS } from "@/app/Utils/variables/variablesCatalog";

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
    // El menú lista solo las variables OPCIONALES (no-cálculo). "Turbulencia"
    // (técnica) es una de ellas; matchea por label.
    fireEvent.change(input, { target: { value: "turbulencia" } });

    // La dimensión con la variable sigue; una sin match desaparece.
    expect(screen.getByText(/Dimensión técnica/)).toBeInTheDocument();
    expect(screen.queryByText(/Dimensión social/)).not.toBeInTheDocument();
    // La variable aparece (en la card y/o el catálogo informativo).
    expect(screen.getAllByText("Turbulencia").length).toBeGreaterThan(0);
  });

  it("filtra variables por el query del search bar (match en descripción)", () => {
    renderDimensions();
    const input = screen.getByLabelText("Buscar variables");
    // 'IEC' aparece en la descripción de la turbulencia
    // ("Clasificación IEC según intensidad turbulenta…") pero no en su label.
    fireEvent.change(input, { target: { value: "IEC" } });

    expect(screen.getByText(/Dimensión técnica/)).toBeInTheDocument();
    expect(screen.getAllByText("Turbulencia").length).toBeGreaterThan(0);
  });
});
