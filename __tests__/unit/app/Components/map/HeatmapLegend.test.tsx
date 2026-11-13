import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HeatmapLegend from "@/app/Components/map/HeatmapLegend";

describe("HeatmapLegend", () => {
  it("renderiza el título de la leyenda", () => {
    render(<HeatmapLegend />);
    expect(screen.getByText("Idoneidad (%)")).toBeInTheDocument();
  });

  it("renderiza los 5 ticks numéricos (100/75/50/25/0)", () => {
    // #19: se quitaron las etiquetas cualitativas y los rangos; la leyenda ahora
    // son solo los ticks numéricos alineados a la barra de gradiente.
    render(<HeatmapLegend />);
    for (const tick of ["100", "75", "50", "25", "0"]) {
      expect(screen.getByText(tick)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("incluye la referencia de corregimientos", () => {
    render(<HeatmapLegend />);
    expect(screen.getByText("Corregimientos")).toBeInTheDocument();
  });
});
