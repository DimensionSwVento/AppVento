import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import VariableTooltip from "./VariableTooltip";
import type { Variable } from "../Utils/variablesCatalog";

const additive: Variable = {
  id: "viento-velocidad",
  dimension: "tecnica",
  label: "Velocidad del viento media anualizada",
  description: "Promedio anual de velocidad del viento",
  iconKey: "Wind",
};

const penalizing: Variable = {
  id: "grupos-beligerantes",
  dimension: "socioeconomica",
  label: "Presencia de grupos beligerantes",
  description: "Actividad de grupos armados ilegales",
  iconKey: "Swords",
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

  it("muestra 'Suma a viabilidad' para variable con peso positivo", () => {
    render(<VariableTooltip variable={additive} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Información sobre/i }),
    );
    expect(screen.getByText("Suma a viabilidad")).toBeInTheDocument();
  });

  it("muestra 'Resta a viabilidad' para variable con peso negativo", () => {
    render(<VariableTooltip variable={penalizing} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Información sobre/i }),
    );
    expect(screen.getByText("Resta a viabilidad")).toBeInTheDocument();
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
