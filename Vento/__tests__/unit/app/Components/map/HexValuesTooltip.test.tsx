import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HexValuesTooltip from "@/app/Components/map/HexValuesTooltip";
import { HEATMAP_DIMENSIONS } from "@/app/Utils/contexts/HeatmapDimensionContext";
import { INFO_VARS } from "@/app/Utils/variables/informativeVariables";

const HEX = "8a2a1072b59ffff";

describe("HexValuesTooltip", () => {
  it("no renderiza nada sin hex o sin coordenadas", () => {
    const { container, rerender } = render(
      <HexValuesTooltip hex={null} x={10} y={10} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<HexValuesTooltip hex={HEX} x={null} y={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza los puntajes de las dimensiones puntuables y su valor", () => {
    render(<HexValuesTooltip hex={HEX} x={100} y={50} />);
    const tooltip = screen.getByRole("tooltip", { name: "Valores del hexágono" });
    expect(tooltip).toBeInTheDocument();
    for (const d of HEATMAP_DIMENSIONS.filter((d) => d.scorable)) {
      expect(screen.getByText(d.label)).toBeInTheDocument();
    }
  });

  // #17: las dimensiones INFORMATIVAS (económica/regulatoria, scorable:false) YA
  // NO se muestran entre los puntajes de idoneidad del hex — su valor vive en la
  // sección "Variables informativas" y en el informe, no aquí.
  it("ya NO muestra las dimensiones informativas (económica/regulatoria) entre los puntajes", () => {
    render(<HexValuesTooltip hex={HEX} x={100} y={50} />);
    for (const d of HEATMAP_DIMENSIONS.filter((d) => !d.scorable)) {
      expect(screen.queryByText(d.label)).not.toBeInTheDocument();
    }
  });

  it("se ancla al cursor con offset de 12px", () => {
    render(<HexValuesTooltip hex={HEX} x={100} y={50} />);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveStyle({ left: "112px", top: "62px" });
  });

  it("limita las variables informativas a 4 y muestra el resto como '+N más'", () => {
    render(<HexValuesTooltip hex={HEX} x={100} y={50} />);
    const extra = INFO_VARS.length - 4;
    if (extra > 0) {
      expect(screen.getByText(`+${extra} más`)).toBeInTheDocument();
    }
    // Las primeras 4 variables informativas aparecen listadas.
    for (const v of INFO_VARS.slice(0, 4)) {
      expect(screen.getByText(v.label)).toBeInTheDocument();
    }
  });
});
