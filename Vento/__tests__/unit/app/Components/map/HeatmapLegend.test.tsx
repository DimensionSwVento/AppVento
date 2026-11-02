import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HeatmapLegend from "@/app/Components/map/HeatmapLegend";

describe("HeatmapLegend", () => {
  it("renderiza el título de la leyenda", () => {
    render(<HeatmapLegend />);
    expect(screen.getByText("Idoneidad (%)")).toBeInTheDocument();
  });

  // #19b (4d9ca59): la leyenda muestra SOLO los valores (%) — se quitaron las
  // etiquetas cualitativas ("Muy alta/Media/…").
  it("renderiza los 5 ticks numéricos (100→0) sin etiquetas cualitativas", () => {
    render(<HeatmapLegend />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items.map((li) => li.textContent)).toEqual(["100", "75", "50", "25", "0"]);
    for (const label of ["Muy alta", "Alta", "Media", "Baja", "Muy baja"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it("con `notch` muestra el rango de idoneidad del área; sin él no", () => {
    const { rerender } = render(<HeatmapLegend />);
    expect(screen.queryByText(/Área:/)).not.toBeInTheDocument();
    rerender(<HeatmapLegend notch={{ min: 12.4, max: 87.6 }} />);
    expect(screen.getByText(/Área:/)).toHaveTextContent("Área: 12–88%");
  });

  it("incluye la referencia de corregimientos", () => {
    render(<HeatmapLegend />);
    expect(screen.getByText("Corregimientos")).toBeInTheDocument();
  });
});
