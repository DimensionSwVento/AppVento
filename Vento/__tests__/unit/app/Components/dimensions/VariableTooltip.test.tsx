import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import VariableTooltip from "@/app/Components/dimensions/VariableTooltip";
import type { Variable } from "@/app/Utils/variables/variablesCatalog";

const additive: Variable = {
  id: "wpd",
  masterId: "TEC-004-T",
  dimension: "tecnica",
  criterio: "Recurso eólico",
  label: "Densidad de potencia WPD",
  description: "Wind Power Density a la altura del rotor",
  iconKey: "tabler:windmill",
};

const penalizing: Variable = {
  id: "grupos-beligerantes",
  masterId: "SOC-011-S",
  dimension: "social",
  criterio: "Social",
  subcriterio: "Riesgo en seguridad, delictividad y conflicto armado",
  label: "Presencia de grupos beligerantes",
  description: "Actividad de grupos armados ilegales",
  iconKey: "lucide:Swords",
};

describe("VariableTooltip (US04-AC2)", () => {
  it("no muestra el popover inicialmente", () => {
    render(<VariableTooltip variable={additive} />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("click sobre el icono abre el popover con la descripción", () => {
    render(<VariableTooltip variable={additive} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Información sobre/i }),
    );
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText(additive.description)).toBeInTheDocument();
  });

  it("muestra 'Suma a idoneidad' para variable con peso positivo", () => {
    render(<VariableTooltip variable={additive} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Información sobre/i }),
    );
    expect(screen.getByText("Suma a idoneidad")).toBeInTheDocument();
  });

  it("muestra 'Resta a idoneidad' para variable con peso negativo", () => {
    render(<VariableTooltip variable={penalizing} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Información sobre/i }),
    );
    expect(screen.getByText("Resta a idoneidad")).toBeInTheDocument();
  });

  it("segundo click sobre el icono cierra el popover", () => {
    render(<VariableTooltip variable={additive} />);
    const btn = screen.getByRole("button", { name: /Información sobre/i });
    fireEvent.click(btn);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("ESC cierra el popover", () => {
    render(<VariableTooltip variable={additive} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Información sobre/i }),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("click fuera del popover lo cierra", () => {
    render(
      <div>
        <button data-testid="outside">fuera</button>
        <VariableTooltip variable={additive} />
      </div>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Información sobre/i }),
    );
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
