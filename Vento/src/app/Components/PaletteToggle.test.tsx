import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PaletteToggle from "./PaletteToggle";

describe("PaletteToggle (US03-AC11)", () => {
  it("renderiza dos opciones: Inferno y Viridis", () => {
    render(<PaletteToggle palette="inferno" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Inferno" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Viridis" })).toBeInTheDocument();
  });

  it("marca aria-pressed=true en la paleta activa", () => {
    render(<PaletteToggle palette="inferno" onChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Inferno", pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Viridis", pressed: false }),
    ).toBeInTheDocument();
  });

  it("click sobre Viridis dispara onChange('viridis')", () => {
    const onChange = vi.fn();
    render(<PaletteToggle palette="inferno" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Viridis" }));
    expect(onChange).toHaveBeenCalledWith("viridis");
  });

  it("click sobre Inferno dispara onChange('inferno')", () => {
    const onChange = vi.fn();
    render(<PaletteToggle palette="viridis" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inferno" }));
    expect(onChange).toHaveBeenCalledWith("inferno");
  });
});
