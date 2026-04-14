import { describe, it, expect } from "vitest";
import { useEffect } from "react";
import { render, screen, act } from "@testing-library/react";
import SideBar from "./SideBar";
import { AprincipalProvider, useAprincipal } from "../Utils/AccionPrincipalContext";

/** helper para preparar estado inicial antes de renderizar SideBar */
function Seed({
  accion,
  hexes,
  children,
}: {
  accion?: "seleccion-area" | "dimensiones" | "caracteristicas" | "informe";
  hexes?: string[];
  children: React.ReactNode;
}) {
  const { setAccion, setSelectedHexes } = useAprincipal();
  useEffect(() => {
    if (accion !== undefined) setAccion(accion);
    if (hexes && hexes.length > 0) setSelectedHexes(new Set(hexes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
}

function renderSideBar(opts: { accion?: "seleccion-area" | "dimensiones" | "caracteristicas" | "informe"; hexes?: string[] } = {}) {
  return render(
    <AprincipalProvider>
      <Seed accion={opts.accion} hexes={opts.hexes}>
        <SideBar>
          <div data-testid="children">child</div>
        </SideBar>
      </Seed>
    </AprincipalProvider>
  );
}

describe("SideBar", () => {
  it("renderiza las 4 acciones principales", () => {
    renderSideBar();
    expect(screen.getByText("Selección de área")).toBeInTheDocument();
    expect(screen.getByText("Dimensiones")).toBeInTheDocument();
    expect(screen.getByText("Características del proyecto")).toBeInTheDocument();
    expect(screen.getByText("Informe de viabilidad")).toBeInTheDocument();
  });

  it("oculta el panel de children en seleccion-area", () => {
    renderSideBar({ accion: "seleccion-area" });
    expect(screen.queryByTestId("children")).not.toBeInTheDocument();
  });

  it("Dimensiones está deshabilitado si no hay hexágonos seleccionados", () => {
    renderSideBar({ accion: "seleccion-area" });
    const dim = screen.getByText("Dimensiones").parentElement!;
    expect(dim.className).toContain("opacity-40");
  });

  it("Dimensiones se habilita cuando hay hexágonos seleccionados", () => {
    renderSideBar({ accion: "seleccion-area", hexes: ["8a2a1072b59ffff"] });
    const dim = screen.getByText("Dimensiones").parentElement!;
    expect(dim.className).toContain("cursor-pointer");
    expect(dim.className).not.toContain("opacity-40");
  });
});
