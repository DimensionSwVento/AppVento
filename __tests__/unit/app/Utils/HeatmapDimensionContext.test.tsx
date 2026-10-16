import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  HEATMAP_DIMENSIONS,
  HeatmapDimensionProvider,
  useHeatmapDimension,
} from "@/app/Utils/contexts/HeatmapDimensionContext";

function Probe() {
  const { activeDimension, toggleDimension, setActiveDimension } =
    useHeatmapDimension();
  return (
    <div>
      <span data-testid="active">{activeDimension ?? "none"}</span>
      <button onClick={() => toggleDimension("ambiental")}>toggle-ambiental</button>
      <button onClick={() => toggleDimension("tecnica")}>toggle-tecnica</button>
      <button onClick={() => setActiveDimension(null)}>set-null</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <HeatmapDimensionProvider>
      <Probe />
    </HeatmapDimensionProvider>,
  );
}

describe("HeatmapDimensionContext", () => {
  it("expone el catálogo de 6 dimensiones", () => {
    expect(HEATMAP_DIMENSIONS.map((d) => d.id)).toEqual([
      "general",
      "ambiental",
      "tecnica",
      "social",
      "macroeconomica",
      "regulatoria",
    ]);
  });

  it("arranca con 'general' activa", () => {
    renderProbe();
    expect(screen.getByTestId("active")).toHaveTextContent("general");
  });

  it("toggle activa una dimensión distinta (radio/mutex)", () => {
    renderProbe();
    fireEvent.click(screen.getByText("toggle-ambiental"));
    expect(screen.getByTestId("active")).toHaveTextContent("ambiental");
    fireEvent.click(screen.getByText("toggle-tecnica"));
    expect(screen.getByTestId("active")).toHaveTextContent("tecnica");
  });

  it("toggle sobre la dimensión activa la apaga (null)", () => {
    renderProbe();
    fireEvent.click(screen.getByText("toggle-ambiental"));
    fireEvent.click(screen.getByText("toggle-ambiental"));
    expect(screen.getByTestId("active")).toHaveTextContent("none");
  });

  it("setActiveDimension(null) apaga el heatmap", () => {
    renderProbe();
    fireEvent.click(screen.getByText("set-null"));
    expect(screen.getByTestId("active")).toHaveTextContent("none");
  });

  it("fuera del provider entrega contexto noop sin lanzar", () => {
    render(<Probe />);
    expect(screen.getByTestId("active")).toHaveTextContent("none");
    fireEvent.click(screen.getByText("toggle-ambiental"));
    expect(screen.getByTestId("active")).toHaveTextContent("none");
  });
});
