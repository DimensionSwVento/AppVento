import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HeatmapLegend from "@/app/Components/map/HeatmapLegend";

describe("HeatmapLegend", () => {
  it("renderiza el título de la leyenda", () => {
    render(<HeatmapLegend />);
    expect(screen.getByText("Prefactibilidad (%)")).toBeInTheDocument();
  });

  it("renderiza los 5 rangos con sus etiquetas", () => {
    render(<HeatmapLegend />);
    const buckets = [
      ["90 – 100", "Muy alta"],
      ["75 – 90", "Alta"],
      ["50 – 75", "Media"],
      ["25 – 50", "Baja"],
      ["0 – 25", "Muy baja"],
    ];
    for (const [range, label] of buckets) {
      expect(screen.getByText(range)).toBeInTheDocument();
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("incluye la referencia de corregimientos", () => {
    render(<HeatmapLegend />);
    expect(screen.getByText("Corregimientos")).toBeInTheDocument();
  });
});
