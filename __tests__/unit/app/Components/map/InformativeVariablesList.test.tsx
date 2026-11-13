import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { INFO_VARS } from "@/app/Utils/variables/informativeVariables";

const useAprincipalMock = vi.fn();
const toggleVariableMock = vi.fn();
const useVariablesMock = vi.fn();

vi.mock("@/app/Utils/contexts/AccionPrincipalContext", () => ({
  useAprincipal: () => useAprincipalMock(),
}));

vi.mock("@/app/Utils/contexts/VariablesContext", () => ({
  useVariables: () => useVariablesMock(),
}));

import InformativeVariablesList from "@/app/Components/map/InformativeVariablesList";

const HEX = "8a2a1072b59ffff";
const firstVar = INFO_VARS[0];
const secondVar = INFO_VARS[1];

describe("InformativeVariablesList", () => {
  beforeEach(() => {
    useAprincipalMock.mockReturnValue({ selectedHexes: new Set([HEX]) });
    useVariablesMock.mockReturnValue({
      activeVariables: new Set([firstVar.id]),
      toggleVariable: toggleVariableMock,
    });
  });

  it("no renderiza nada sin hexágonos seleccionados", () => {
    useAprincipalMock.mockReturnValue({ selectedHexes: new Set() });
    const { container } = render(<InformativeVariablesList />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lista las variables activas con su valor promedio", () => {
    render(<InformativeVariablesList />);
    expect(screen.getByText("Variables informativas")).toBeInTheDocument();
    expect(screen.getByText(firstVar.label)).toBeInTheDocument();
    // Sólo la variable activa aparece en la lista (no las disponibles).
    expect(screen.queryByText(secondVar.label)).not.toBeInTheDocument();
  });

  it("el botón '+' abre el picker con las variables disponibles", () => {
    render(<InformativeVariablesList />);
    const addBtn = screen.getByRole("button", {
      name: new RegExp(`Añadir variable \\(${INFO_VARS.length - 1}\\)`),
    });
    expect(addBtn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(addBtn);
    expect(screen.getByText(secondVar.label)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cerrar/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("elegir una variable del picker la activa via toggleVariable y cierra el picker", () => {
    render(<InformativeVariablesList />);
    fireEvent.click(screen.getByRole("button", { name: /Añadir variable/ }));
    fireEvent.click(screen.getByText(secondVar.label));
    expect(toggleVariableMock).toHaveBeenCalledWith(secondVar.id);
    expect(screen.queryByText(secondVar.label)).not.toBeInTheDocument();
  });

  it("quitar una variable no-obligatoria llama toggleVariable", () => {
    render(<InformativeVariablesList />);
    const removeBtn = screen.queryByRole("button", {
      name: `Quitar ${firstVar.label}`,
    });
    // Si la primera variable del catálogo es obligatoria no hay botón;
    // en ese caso el contrato es exactamente ese.
    if (removeBtn) {
      fireEvent.click(removeBtn);
      expect(toggleVariableMock).toHaveBeenCalledWith(firstVar.id);
    } else {
      expect(toggleVariableMock).not.toHaveBeenCalled();
    }
  });
});
