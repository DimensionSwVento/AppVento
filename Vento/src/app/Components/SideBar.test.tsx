import { describe, it, expect, vi } from "vitest";
import { useEffect, useState } from "react";
import { render, screen } from "@testing-library/react";
import SideBar from "./SideBar";
import { AprincipalProvider, useAprincipal } from "../Utils/AccionPrincipalContext";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "test@test.com", name: "Test" } } }),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));

/**
 * Helper que siembra estado inicial en el Provider y sólo renderiza a los
 * hijos cuando el commit del setState ya fue aplicado. Esto evita carreras
 * entre el flush de useEffect y los asserts del test (React 19 + RTL).
 */
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
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (accion !== undefined) setAccion(accion);
    if (hexes && hexes.length > 0) setSelectedHexes(new Set(hexes));
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!ready) return null;
  return <>{children}</>;
}

function renderSideBar(opts: { accion?: "seleccion-area" | "dimensiones" | "caracteristicas" | "informe"; hexes?: string[] } = {}) {
  return render(
    <AprincipalProvider>
      <Seed accion={opts.accion} hexes={opts.hexes}>
        <SideBar>
          <div data-testid="children">child</div>
        </SideBar>
        <ActionProbe />
      </Seed>
    </AprincipalProvider>
  );
}

function ActionProbe() {
  const { accion } = useAprincipal();
  return <span data-testid="accion-state">{accion}</span>;
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
    expect(dim).toHaveAttribute("aria-disabled", "true");
    expect(dim.className).toContain("cursor-not-allowed");
  });

  it("Dimensiones se habilita cuando hay hexágonos seleccionados", () => {
    renderSideBar({ accion: "seleccion-area", hexes: ["8a2a1072b59ffff"] });
    const dim = screen.getByText("Dimensiones").parentElement!;
    expect(dim).toHaveAttribute("aria-disabled", "false");
    expect(dim.className).toContain("cursor-pointer");
  });

  it("ya no renderiza el CTA de próximo paso dentro del SideBar (vive en el mapa)", () => {
    renderSideBar({ accion: "seleccion-area", hexes: ["8a2a1072b59ffff"] });
    expect(screen.queryByTestId("next-step-cta")).not.toBeInTheDocument();
  });
});
