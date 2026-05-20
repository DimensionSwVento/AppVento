import { describe, it, expect } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import DimensionCard from "./DimensionCard";
import { VariablesProvider } from "../Utils/VariablesContext";
import { DIMENSIONS, variablesByDimension } from "../Utils/variablesCatalog";

const ambiental = DIMENSIONS.find((d) => d.id === "ambiental")!;
const vars = variablesByDimension("ambiental");

describe("DimensionCard", () => {
  it("renderiza header con contador 0/N cerrado por defecto", () => {
    render(
      <VariablesProvider>
        <DimensionCard dimension={ambiental} variables={vars} />
      </VariablesProvider>,
    );
    expect(screen.getByText(/Dimensión ambiental/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`0/${vars.length}`))).toBeInTheDocument();
    // cerrado: no muestra la primera variable
    expect(
      screen.queryByText(vars[0].label),
    ).not.toBeInTheDocument();
  });

  it("expande al hacer click en el header", () => {
    render(
      <VariablesProvider>
        <DimensionCard dimension={ambiental} variables={vars} />
      </VariablesProvider>,
    );
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText(vars[0].label)).toBeInTheDocument();
  });

  it("activar un switch incrementa el contador del header", () => {
    render(
      <VariablesProvider>
        <DimensionCard dimension={ambiental} variables={vars} defaultOpen />
      </VariablesProvider>,
    );
    const sw = screen.getByRole("switch", { name: vars[0].label });
    act(() => fireEvent.click(sw));
    expect(screen.getByText(new RegExp(`1/${vars.length}`))).toBeInTheDocument();
  });

  it("no renderiza si la lista de variables está vacía (filtrado por búsqueda sin match)", () => {
    const { container } = render(
      <VariablesProvider>
        <DimensionCard dimension={ambiental} variables={[]} />
      </VariablesProvider>,
    );
    expect(container.firstChild).toBeNull();
  });
});
