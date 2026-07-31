import { describe, it, expect } from "vitest";
import { act, render } from "@testing-library/react";
import { useVariables, VariablesProvider } from "@/app/Utils/contexts/VariablesContext";
import {
  VARIABLES,
  getVariableById,
  requiredVariableIds,
  variablesByDimension,
} from "@/app/Utils/variables/variablesCatalog";

function Probe({ onCtx }: { onCtx: (ctx: ReturnType<typeof useVariables>) => void }) {
  const ctx = useVariables();
  onCtx(ctx);
  return null;
}

const firstNonRequired = VARIABLES.find((v) => !v.required)!;
const secondNonRequired = VARIABLES.filter((v) => !v.required)[1];
const requiredVar = VARIABLES.find((v) => v.required)!;

describe("VariablesContext — multi-selección con obligatorias", () => {
  it("inicia con las variables obligatorias activas y el resto inactivas", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    const required = requiredVariableIds();
    expect(captured.totalActive).toBe(required.length);
    for (const id of required) expect(captured.isActive(id)).toBe(true);
  });

  it("toggleVariable activa una variable no obligatoria inactiva", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    act(() => captured.toggleVariable(firstNonRequired.id));
    expect(captured.isActive(firstNonRequired.id)).toBe(true);
  });

  it("toggleVariable sobre la activa no obligatoria la desactiva", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    act(() => captured.toggleVariable(firstNonRequired.id));
    act(() => captured.toggleVariable(firstNonRequired.id));
    expect(captured.isActive(firstNonRequired.id)).toBe(false);
  });

  it("toggleVariable sobre una obligatoria no la desactiva (no-op)", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    const before = captured.totalActive;
    act(() => captured.toggleVariable(requiredVar.id));
    expect(captured.isActive(requiredVar.id)).toBe(true);
    expect(captured.totalActive).toBe(before);
  });

  it("permite múltiples no-obligatorias activas simultáneamente", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    act(() => {
      captured.toggleVariable(firstNonRequired.id);
      captured.toggleVariable(secondNonRequired.id);
    });
    expect(captured.isActive(firstNonRequired.id)).toBe(true);
    expect(captured.isActive(secondNonRequired.id)).toBe(true);
  });

  it("activeCountByDimension refleja obligatorias activas de esa dimensión desde el inicio", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    // wpd (obligatoria) es técnica
    const reqInTecnica = variablesByDimension("tecnica").filter(
      (v) => v.required,
    ).length;
    expect(captured.activeCountByDimension("tecnica")).toBe(reqInTecnica);
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

  it("getVariableById sigue funcionando con ids del catálogo", () => {
    expect(getVariableById(firstNonRequired.id)).toBeDefined();
    expect(getVariableById("no-existe")).toBeUndefined();
  });
});
