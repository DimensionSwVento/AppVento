import { describe, it, expect } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import DimensionCard from "@/app/Components/dimensions/DimensionCard";
import { VariablesProvider } from "@/app/Utils/contexts/VariablesContext";
import { DIMENSIONS, variablesByDimension } from "@/app/Utils/variables/variablesCatalog";

// Uso socioeconomica porque no tiene variables obligatorias (arrancan inactivas)
const socio = DIMENSIONS.find((d) => d.id === "socioeconomica")!;
const vars = variablesByDimension("socioeconomica");
const firstNonRequired = vars.find((v) => !v.required)!;

describe("DimensionCard", () => {
  it("renderiza header con contador 0/N cerrado por defecto", () => {
    render(
      <VariablesProvider>
        <DimensionCard dimension={socio} variables={vars} />
      </VariablesProvider>,
    );
    expect(screen.getByText(/Dimensión socioeconómica/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`0/${vars.length}`))).toBeInTheDocument();
    expect(
      screen.queryByText(firstNonRequired.label),
    ).not.toBeInTheDocument();
  });

  it("expande al hacer click en el header", () => {
    render(
      <VariablesProvider>
        <DimensionCard dimension={socio} variables={vars} />
      </VariablesProvider>,
    );
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText(firstNonRequired.label)).toBeInTheDocument();
  });

  it("activar un switch no-obligatorio incrementa el contador del header", () => {
    render(
      <VariablesProvider>
        <DimensionCard dimension={socio} variables={vars} defaultOpen />
      </VariablesProvider>,
    );
    const sw = screen.getByRole("switch", { name: firstNonRequired.label });
    act(() => fireEvent.click(sw));
    expect(screen.getByText(new RegExp(`1/${vars.length}`))).toBeInTheDocument();
  });

  it("no renderiza si la lista de variables está vacía (filtrado por búsqueda sin match)", () => {
    const { container } = render(
      <VariablesProvider>
        <DimensionCard dimension={socio} variables={[]} />
      </VariablesProvider>,
    );
    expect(container.firstChild).toBeNull();
  });
});
