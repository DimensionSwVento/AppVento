import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AprincipalProvider, useAprincipal } from "./AccionPrincipalContext";

function Probe() {
  const { accion, setAccion, selectedHexes, setSelectedHexes } = useAprincipal();
  return (
    <div>
      <span data-testid="accion">{accion}</span>
      <span data-testid="count">{selectedHexes.size}</span>
      <button onClick={() => setAccion("dimensiones")}>to-dim</button>
      <button
        onClick={() =>
          setSelectedHexes((prev) => {
            const next = new Set(prev);
            next.add("8a2a1072b59ffff");
            return next;
          })
        }
      >
        add-hex
      </button>
    </div>
  );
}

describe("AccionPrincipalContext", () => {
  it("inicia en seleccion-area sin hexágonos", () => {
    render(
      <AprincipalProvider>
        <Probe />
      </AprincipalProvider>
    );
    expect(screen.getByTestId("accion").textContent).toBe("seleccion-area");
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("setAccion cambia el estado", () => {
    render(
      <AprincipalProvider>
        <Probe />
      </AprincipalProvider>
    );
    act(() => screen.getByText("to-dim").click());
    expect(screen.getByTestId("accion").textContent).toBe("dimensiones");
  });

  it("setSelectedHexes agrega un hexágono", () => {
    render(
      <AprincipalProvider>
        <Probe />
      </AprincipalProvider>
    );
    act(() => screen.getByText("add-hex").click());
    expect(screen.getByTestId("count").textContent).toBe("1");
  });
});
