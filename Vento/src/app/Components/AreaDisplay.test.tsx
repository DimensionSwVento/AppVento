import { describe, it, expect } from "vitest";
import { useEffect } from "react";
import { render, screen, act } from "@testing-library/react";
import { latLngToCell, cellArea } from "h3-js";
import AreaDisplay from "./AreaDisplay";
import { AprincipalProvider, useAprincipal } from "../Utils/AccionPrincipalContext";

const fmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

function Seeder({ hexes }: { hexes: string[] }) {
  const { setSelectedHexes } = useAprincipal();
  useEffect(() => {
    setSelectedHexes(new Set(hexes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function Controller() {
  const { setSelectedHexes } = useAprincipal();
  return (
    <button
      data-testid="add-hex"
      onClick={() => {
        const hex = latLngToCell(6.25, -75.56, 7);
        setSelectedHexes((prev) => new Set(prev).add(hex));
      }}
    >
      add
    </button>
  );
}

describe("AreaDisplay (US03-P2 AC2, AC4, AC5)", () => {
  it("renderiza 0 km² cuando no hay hexágonos seleccionados (AC5)", () => {
    render(
      <AprincipalProvider>
        <AreaDisplay />
      </AprincipalProvider>
    );
    expect(screen.getByText("Área seleccionada")).toBeInTheDocument();
    expect(screen.getByText(/^0\s/)).toBeInTheDocument();
    expect(screen.getByText("km²")).toBeInTheDocument();
  });

  it("muestra el área formateada en es-CO con separadores de miles (AC2)", () => {
    const hex = latLngToCell(4.7, -74.07, 7);
    const expected = fmt.format(cellArea(hex, "km2"));

    render(
      <AprincipalProvider>
        <Seeder hexes={[hex]} />
        <AreaDisplay />
      </AprincipalProvider>
    );

    expect(screen.getByText(new RegExp(`^${expected.replace(".", "\\.")}\\s`))).toBeInTheDocument();
  });

  it("actualiza reactivamente al añadir un hexágono (AC4)", () => {
    render(
      <AprincipalProvider>
        <AreaDisplay />
        <Controller />
      </AprincipalProvider>
    );

    expect(screen.getByText(/^0\s/)).toBeInTheDocument();

    const btn = screen.getByTestId("add-hex");
    act(() => btn.click());

    const hex = latLngToCell(6.25, -75.56, 7);
    const expected = fmt.format(cellArea(hex, "km2"));
    expect(screen.getByText(new RegExp(`^${expected.replace(".", "\\.")}\\s`))).toBeInTheDocument();
  });

  it("usa el mismo color de fondo que el SideBar (#165170)", () => {
    const { container } = render(
      <AprincipalProvider>
        <AreaDisplay />
      </AprincipalProvider>
    );
    const panel = container.querySelector("div");
    expect(panel?.className).toContain("bg-[#165170ff]");
  });
});
