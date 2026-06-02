import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HeatmapLegend from "./HeatmapLegend";

describe("HeatmapLegend (US03-AC13) — leyenda siempre visible + ayuda ?", () => {
  it("renderiza siempre la pill con extremos 'Baja' y 'Alta'", () => {
    render(<HeatmapLegend palette="inferno" />);
    expect(screen.getByText(/Baja/i)).toBeInTheDocument();
    expect(screen.getByText(/Alta/i)).toBeInTheDocument();
  });

  it("expone la rampa con role='img' y aria-label descriptivo", () => {
    render(<HeatmapLegend palette="inferno" />);
    expect(
      screen.getByRole("img", { name: /Leyenda del heatmap.*viabilidad/i }),
    ).toBeInTheDocument();
  });

  it("no muestra el popover de ayuda inicialmente", () => {
    render(<HeatmapLegend palette="inferno" />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("hover sobre '?' abre el popover de ayuda", () => {
    render(<HeatmapLegend palette="inferno" />);
    fireEvent.mouseEnter(
      screen.getByRole("button", { name: /Cómo funciona el heatmap/i }),
    );
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText(/¿Cómo funciona el heatmap\?/)).toBeInTheDocument();
  });

  it("mouseleave sobre '?' cierra el popover", () => {
    render(<HeatmapLegend palette="inferno" />);
    const btn = screen.getByRole("button", { name: /Cómo funciona el heatmap/i });
    fireEvent.mouseEnter(btn);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.mouseLeave(btn);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("click sobre '?' alterna el popover (sticky)", () => {
    render(<HeatmapLegend palette="inferno" />);
    const btn = screen.getByRole("button", { name: /Cómo funciona el heatmap/i });
    fireEvent.click(btn);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("ESC cierra el popover", () => {
    render(<HeatmapLegend palette="inferno" />);
    fireEvent.click(
      screen.getByRole("button", { name: /Cómo funciona el heatmap/i }),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("cambia la rampa entre Inferno y Viridis (background-image distinto)", () => {
    const { container, rerender } = render(<HeatmapLegend palette="inferno" />);
    const inferno = (container.querySelector("[style*='background-image']") as HTMLElement | null)?.style.backgroundImage ?? "";
    rerender(<HeatmapLegend palette="viridis" />);
    const viridis = (container.querySelector("[style*='background-image']") as HTMLElement | null)?.style.backgroundImage ?? "";
    expect(inferno).not.toEqual("");
    expect(viridis).not.toEqual("");
    expect(inferno).not.toEqual(viridis);
  });
});
