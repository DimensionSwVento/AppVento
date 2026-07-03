import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const useAprincipalMock = vi.fn();

vi.mock("../Utils/AccionPrincipalContext", () => ({
  useAprincipal: () => useAprincipalMock(),
}));

import PhaseHintCard from "./PhaseHintCard";

const STORAGE_KEY = "vento:phaseHint:dismissed";

function setPhase(accion: string | null, hexes: string[] = []) {
  useAprincipalMock.mockReturnValue({
    accion,
    selectedHexes: new Set(hexes),
  });
}

describe("PhaseHintCard", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("no renderiza nada sin acción activa", () => {
    setPhase(null);
    const { container } = render(<PhaseHintCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el hint persistente en seleccion-area sin botón de cierre", () => {
    setPhase("seleccion-area");
    render(<PhaseHintCard />);
    expect(
      screen.getByText(/Selecciona un área en el mapa/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ocultar este tip" }),
    ).not.toBeInTheDocument();
  });

  it("oculta el hint de seleccion-area cuando ya hay hexágonos seleccionados", () => {
    setPhase("seleccion-area", ["8a2a1072b59ffff"]);
    const { container } = render(<PhaseHintCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("en otras fases muestra hint dismissable con su etiqueta de paso", () => {
    setPhase("dimensiones");
    render(<PhaseHintCard />);
    expect(screen.getByText("Paso 2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ocultar este tip" }),
    ).toBeInTheDocument();
  });

  it("dismiss oculta el hint y lo persiste en localStorage", async () => {
    setPhase("dimensiones");
    render(<PhaseHintCard />);
    fireEvent.click(screen.getByRole("button", { name: "Ocultar este tip" }));
    await waitFor(() => {
      expect(screen.queryByText("Paso 2")).not.toBeInTheDocument();
    });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toContain(
      "dimensiones",
    );
  });

  it("respeta el dismiss persistido al montar", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["informe"]));
    setPhase("informe");
    const { container } = render(<PhaseHintCard />);
    // El estado dismissed se carga en un useEffect → esperar al flush.
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it("un localStorage corrupto no rompe el componente", () => {
    window.localStorage.setItem(STORAGE_KEY, "{{not-json");
    setPhase("caracteristicas");
    render(<PhaseHintCard />);
    expect(screen.getByText("Paso 3")).toBeInTheDocument();
  });
});
