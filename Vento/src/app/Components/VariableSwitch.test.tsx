import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Variable } from "../Utils/variablesCatalog";

const isActiveMock = vi.fn();
const toggleVariableMock = vi.fn();

vi.mock("../Utils/VariablesContext", () => ({
  useVariables: () => ({
    isActive: (id: string) => isActiveMock(id),
    toggleVariable: (id: string) => toggleVariableMock(id),
  }),
}));

import VariableSwitch from "./VariableSwitch";

const baseVariable: Variable = {
  id: "amb_001",
  label: "Velocidad del viento",
  description: "Velocidad media anual del viento",
  dimension: "ambiental",
} as Variable;

describe("VariableSwitch", () => {
  beforeEach(() => {
    isActiveMock.mockReturnValue(false);
  });

  it("renderiza label y descripción de la variable", () => {
    render(<VariableSwitch variable={baseVariable} />);
    expect(screen.getByText("Velocidad del viento")).toBeInTheDocument();
    expect(screen.getByText("Velocidad media anual del viento")).toBeInTheDocument();
  });

  it("refleja el estado activo en aria-checked", () => {
    isActiveMock.mockReturnValue(true);
    render(<VariableSwitch variable={baseVariable} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("click en el switch llama toggleVariable con el id", () => {
    render(<VariableSwitch variable={baseVariable} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(toggleVariableMock).toHaveBeenCalledWith("amb_001");
  });

  it("variable obligatoria: switch deshabilitado, badge 'obligatoria' y sin toggle", () => {
    const required = { ...baseVariable, required: true } as Variable;
    render(<VariableSwitch variable={required} />);
    const sw = screen.getByRole("switch");
    expect(sw).toBeDisabled();
    expect(sw).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("obligatoria")).toBeInTheDocument();
    fireEvent.click(sw);
    expect(toggleVariableMock).not.toHaveBeenCalled();
  });
});
