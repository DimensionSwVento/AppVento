import { describe, it, expect } from "vitest";
import { act, render } from "@testing-library/react";
import { useVariables, VariablesProvider } from "./VariablesContext";
import { VARIABLES, variablesByDimension } from "./variablesCatalog";

function Probe({ onCtx }: { onCtx: (ctx: ReturnType<typeof useVariables>) => void }) {
  const ctx = useVariables();
  onCtx(ctx);
  return null;
}

describe("VariablesContext — multi-selección con polaridad ponderada", () => {
  it("inicia con set vacío y total correcto", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    expect(captured.activeVariables.size).toBe(0);
    expect(captured.totalActive).toBe(0);
    expect(captured.totalVariables).toBe(VARIABLES.length);
  });

  it("toggleVariable activa una variable inactiva", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    act(() => captured.toggleVariable(VARIABLES[0].id));
    expect(captured.isActive(VARIABLES[0].id)).toBe(true);
    expect(captured.totalActive).toBe(1);
  });

  it("toggleVariable sobre la activa la desactiva", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    act(() => captured.toggleVariable(VARIABLES[0].id));
    act(() => captured.toggleVariable(VARIABLES[0].id));
    expect(captured.isActive(VARIABLES[0].id)).toBe(false);
    expect(captured.totalActive).toBe(0);
  });

  it("permite múltiples variables activas simultáneamente", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    act(() => {
      captured.toggleVariable(VARIABLES[0].id);
      captured.toggleVariable(VARIABLES[1].id);
      captured.toggleVariable(VARIABLES[2].id);
    });
    expect(captured.totalActive).toBe(3);
    expect(captured.isActive(VARIABLES[0].id)).toBe(true);
    expect(captured.isActive(VARIABLES[1].id)).toBe(true);
    expect(captured.isActive(VARIABLES[2].id)).toBe(true);
  });

  it("activeCountByDimension cuenta sólo variables activas de esa dimensión", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    const ambVar = variablesByDimension("ambiental")[0];
    const tecVar = variablesByDimension("tecnica")[0];
    act(() => {
      captured.toggleVariable(ambVar.id);
      captured.toggleVariable(tecVar.id);
    });
    expect(captured.activeCountByDimension("ambiental")).toBe(1);
    expect(captured.activeCountByDimension("tecnica")).toBe(1);
    expect(captured.activeCountByDimension("regulatoria")).toBe(0);
  });

  it("totalByDimension devuelve el total fijo (independiente del estado)", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    expect(captured.totalByDimension("ambiental")).toBe(
      variablesByDimension("ambiental").length,
    );
  });
});
