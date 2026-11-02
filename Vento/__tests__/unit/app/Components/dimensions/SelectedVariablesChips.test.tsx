import { describe, it, expect } from "vitest";
import { useEffect } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import SelectedVariablesChips from "@/app/Components/dimensions/SelectedVariablesChips";
import {
  useVariables,
  VariablesProvider,
} from "@/app/Utils/contexts/VariablesContext";
import {
  VARIABLES,
  OPTIONAL_VARIABLES,
} from "@/app/Utils/variables/variablesCatalog";

function Seeder({ ids }: { ids: string[] }) {
  const { toggleVariable } = useVariables();
  useEffect(() => {
    for (const id of ids) toggleVariable(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// Variables del modelo (activas por defecto en Sprint 4) escogidas por propiedad:
// - penalizingVar (peso < 0) → grupos-beligerantes, para el popover "Resta a idoneidad"
// - ambientalA/B → para nombres, ✕ y cerrar popover
const penalizingVar = VARIABLES.find((v) => v.id === "grupos-beligerantes")!;
const ambientalA = VARIABLES.find((v) => v.id === "uso-suelo")!;
const ambientalB = VARIABLES.find((v) => v.id === "riesgo-fisico")!;

describe("SelectedVariablesChips (US04-AC4) — panel default, pill al colapsar", () => {
  it("renderiza el panel expandido por defecto cuando hay variables activas", () => {
    render(
      <VariablesProvider>
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(/^Variables seleccionadas$/),
    ).toBeInTheDocument();
  });

  it("muestra subtítulo con la dimensión por cada item", () => {
    // Sprint 4: las del modelo arrancan activas → el panel las lista todas; el
    // subtítulo de dimensión aparece varias veces (una por variable social).
    render(
      <VariablesProvider>
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByText(/Social/).length).toBeGreaterThan(0);
  });

  it("botón 'Limpiar' reinicia a las variables del modelo (quita las opcionales)", () => {
    // Sprint 4: 'Limpiar' vuelve al set del MODELO (no a vacío). Una opcional
    // seleccionada desaparece; las del modelo (WPD) permanecen.
    render(
      <VariablesProvider>
        <Seeder ids={[OPTIONAL_VARIABLES[0].id]} />
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Limpiar/i }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).queryByText(OPTIONAL_VARIABLES[0].label),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByText("Densidad de potencia WPD"),
    ).toBeInTheDocument();
  });

  it("muestra los nombres de las variables activas en el panel", () => {
    // uso-suelo es del modelo → activa por defecto → se muestra sin seed.
    render(
      <VariablesProvider>
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(ambientalA.label)).toBeInTheDocument();
  });

  it("click sobre un item del panel abre el info popover", () => {
    // grupos-beligerantes es del modelo → activa por defecto (sin seed).
    render(
      <VariablesProvider>
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: new RegExp(`Ver detalle de ${penalizingVar.label}`),
      }),
    );
    const info = screen.getByRole("tooltip");
    expect(
      within(info).getByText(penalizingVar.description),
    ).toBeInTheDocument();
    expect(within(info).getByText("Resta a idoneidad")).toBeInTheDocument();
  });

  it("info popover tiene su propio botón de cerrar", () => {
    render(
      <VariablesProvider>
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: new RegExp(`Ver detalle de ${ambientalB.label}`),
      }),
    );
    fireEvent.click(
      within(screen.getByRole("tooltip")).getByRole("button", {
        name: /Cerrar información/i,
      }),
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("variables obligatorias no muestran botón ✕ en el panel", () => {
    render(
      <VariablesProvider>
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    const required = VARIABLES.filter((v) => v.required);
    expect(required.length).toBeGreaterThan(0);
    for (const v of required) {
      expect(
        screen.queryByRole("button", {
          name: new RegExp(`Deseleccionar ${v.label}`),
        }),
      ).not.toBeInTheDocument();
    }
  });

  // a5e4fc8: la modal es para QUITAR rápido lo seleccionado → solo las
  // INFORMATIVAS (opcionales) llevan ✕; las del MODELO (p. ej. uso-suelo) van
  // plegadas abajo, siempre activas y sin ✕.
  it("variables no obligatorias (informativas) muestran ✕ que las deselecciona", () => {
    const optional = OPTIONAL_VARIABLES[0];
    render(
      <VariablesProvider>
        <Seeder ids={[optional.id]} />
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    const dialog = screen.getByRole("dialog");
    // Las del modelo no ofrecen ✕.
    expect(
      within(dialog).queryByRole("button", {
        name: new RegExp(`Deseleccionar ${ambientalA.label}`),
      }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText(optional.label)).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: new RegExp(`Deseleccionar ${optional.label}`),
      }),
    );
    expect(within(dialog).queryByText(optional.label)).not.toBeInTheDocument();
  });

  it("click sobre el header del panel lo colapsa a la pill compacta", () => {
    render(
      <VariablesProvider>
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    // El header completo actúa como botón "Cerrar lista"
    fireEvent.click(screen.getByRole("button", { name: /Cerrar lista/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Variables seleccionadas en el mapa — abrir lista/i }),
    ).toBeInTheDocument();
  });

  it("click sobre 'Limpiar' NO colapsa el panel (stopPropagation)", () => {
    render(
      <VariablesProvider>
        {/* a5e4fc8: 'Limpiar' solo aparece si hay informativas (quitables) —
            las del modelo (p. ej. uso-suelo) no cuentan → se siembra una opcional. */}
        <Seeder ids={[OPTIONAL_VARIABLES[0].id]} />
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Limpiar/i }));
    // El panel sigue abierto después de limpiar
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Variables seleccionadas en el mapa — abrir lista/i }),
    ).not.toBeInTheDocument();
  });

  it("click sobre la pill compacta vuelve a abrir el panel", () => {
    render(
      <VariablesProvider>
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Cerrar lista/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /Variables seleccionadas en el mapa — abrir lista/i }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("ESC NO colapsa el panel (es fijo)", () => {
    render(
      <VariablesProvider>
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

// Regression, issue #265: `wpd` is required (always active by `isActive`) and a
// heatmap variable. Turning on another heatmap used to remove it from the active
// set, so `totalActive` stopped matching what the UI showed.
function ActiveProbe() {
  const { totalActive, isActive, activeVariables, toggleVariable } = useVariables();
  return (
    <div>
      <span data-testid="total-active">{totalActive}</span>
      <span data-testid="wpd-active">{String(isActive("wpd"))}</span>
      <span data-testid="wpd-in-set">{String(activeVariables.has("wpd"))}</span>
      <button onClick={() => toggleVariable("densidad-viento")}>densidad</button>
    </div>
  );
}

describe("VariablesContext — heatmap invariant with required variables (issue #265)", () => {
  it("prender un mapa de calor no saca del set a una obligatoria", () => {
    render(
      <VariablesProvider>
        <ActiveProbe />
      </VariablesProvider>,
    );
    // `densidad-viento` no está activa por defecto; al prenderla debe sumar 1 y
    // `wpd` (obligatoria y de calor) debe seguir en el set.
    const before = Number(screen.getByTestId("total-active").textContent);
    expect(screen.getByTestId("wpd-in-set").textContent).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "densidad" }));

    expect(screen.getByTestId("wpd-in-set").textContent).toBe("true");
    expect(screen.getByTestId("wpd-active").textContent).toBe("true");
    expect(Number(screen.getByTestId("total-active").textContent)).toBe(before + 1);
  });
});
