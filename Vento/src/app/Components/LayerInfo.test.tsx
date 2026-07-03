import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LayerInfo from "./LayerInfo";

describe("LayerInfo", () => {
  it("muestra resolución, tamaño y conteos", () => {
    render(
      <LayerInfo resolution={5} total={12345} selectedCount={42} aboveThresholdCount={7} />,
    );
    expect(screen.getByText("Res 5")).toBeInTheDocument();
    expect(screen.getByText("~8.5 km")).toBeInTheDocument();
    expect(screen.getByText((12345).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("usa 'Res N' como tamaño cuando la resolución no tiene etiqueta conocida", () => {
    render(
      <LayerInfo resolution={12} total={0} selectedCount={0} aboveThresholdCount={0} />,
    );
    // Aparece como valor de "Capa" y como fallback de "Tamaño".
    expect(screen.getAllByText("Res 12")).toHaveLength(2);
  });
});
