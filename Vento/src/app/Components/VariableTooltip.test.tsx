import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import VariableTooltip from "./VariableTooltip";

describe("VariableTooltip", () => {
  it("muestra y oculta la definición con hover", () => {
    render(<VariableTooltip definition="Definición de prueba" />);

    const button = screen.getByRole("button", {
      name: "Ver definición de variable",
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.mouseEnter(button);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Definición de prueba");
    expect(button).toHaveAttribute("aria-describedby");

    fireEvent.mouseLeave(button);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("abre con tap/click y se cierra al hacer click fuera", async () => {
    render(<VariableTooltip definition="Definición móvil" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Ver definición de variable" }),
    );
    expect(screen.getByRole("tooltip")).toHaveTextContent("Definición móvil");

    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  it("se cierra con Escape", async () => {
    render(<VariableTooltip definition="Definición con escape" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Ver definición de variable" }),
    );
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });
});
