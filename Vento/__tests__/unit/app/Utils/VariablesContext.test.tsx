import { describe, it, expect } from "vitest";
import { act, render } from "@testing-library/react";
import { useVariables, VariablesProvider } from "@/app/Utils/contexts/VariablesContext";
import {
  VARIABLES,
  getVariableById,
  requiredVariableIds,
  optionalVariablesByDimension,
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

  it("activeCountByDimension cuenta las OPCIONALES activas de esa dimensión", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    // El menú lista solo las variables opcionales (no-cálculo); al inicio ninguna
    // está activa (las obligatorias ponderadas no cuentan en el menú).
    expect(captured.activeCountByDimension("tecnica")).toBe(0);
    const opt = optionalVariablesByDimension("tecnica")[0];
    act(() => captured.toggleVariable(opt.id));
    expect(captured.activeCountByDimension("tecnica")).toBe(1);
  });

  it("totalByDimension devuelve el total de OPCIONALES de la dimensión", () => {
    let captured!: ReturnType<typeof useVariables>;
    render(
      <VariablesProvider>
        <Probe onCtx={(c) => (captured = c)} />
      </VariablesProvider>,
    );
    expect(captured.totalByDimension("tecnica")).toBe(
      optionalVariablesByDimension("tecnica").length,
    );
    // Una dimensión sin variables opcionales (p.ej. ambiental) → 0.
    expect(captured.totalByDimension("ambiental")).toBe(0);
  });

  it("getVariableById sigue funcionando con ids del catálogo", () => {
    expect(getVariableById(firstNonRequired.id)).toBeDefined();
    expect(getVariableById("no-existe")).toBeUndefined();
  });
});
