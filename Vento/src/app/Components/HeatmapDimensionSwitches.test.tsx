import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HeatmapDimensionSwitches from "./HeatmapDimensionSwitches";
import {
  HEATMAP_DIMENSIONS,
  HeatmapDimensionProvider,
  useHeatmapDimension,
} from "../Utils/HeatmapDimensionContext";

function ActiveProbe() {
  const { activeDimension } = useHeatmapDimension();
  return <span data-testid="active-dim">{activeDimension ?? "none"}</span>;
}

function renderWithProvider() {
  return render(
    <HeatmapDimensionProvider>
      <HeatmapDimensionSwitches />
      <ActiveProbe />
    </HeatmapDimensionProvider>,
  );
}

describe("HeatmapDimensionSwitches", () => {
  it("renderiza el select con las 6 dimensiones", () => {
    renderWithProvider();
    const select = screen.getByLabelText("Visualización en el mapa");
    expect(select).toBeInTheDocument();
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(
      HEATMAP_DIMENSIONS.map((d) => d.label),
    );
  });

  it("arranca con 'general' activa (heatmap siempre encendido)", () => {
    renderWithProvider();
    expect(screen.getByLabelText("Visualización en el mapa")).toHaveValue("general");
    expect(screen.getByTestId("active-dim")).toHaveTextContent("general");
  });

  it("cambiar la opción actualiza la dimensión activa del contexto", () => {
    renderWithProvider();
    fireEvent.change(screen.getByLabelText("Visualización en el mapa"), {
      target: { value: "ambiental" },
    });
    expect(screen.getByTestId("active-dim")).toHaveTextContent("ambiental");
    expect(screen.getByLabelText("Visualización en el mapa")).toHaveValue("ambiental");
  });
});
