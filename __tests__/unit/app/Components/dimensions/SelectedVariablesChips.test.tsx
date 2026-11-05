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

  it("variables no obligatorias muestran ✕ que las deselecciona", () => {
    // uso-suelo (modelo, no obligatoria) está activa por defecto → su ✕ la quita.
    render(
      <VariablesProvider>
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: new RegExp(`Deseleccionar ${ambientalA.label}`),
      }),
    );
    expect(within(dialog).queryByText(ambientalA.label)).not.toBeInTheDocument();
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
        <Seeder ids={[ambientalA.id]} />
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Limpiar/i }));
    // El panel sigue abierto después de limpiar
    expect(screen.getByRole("dialog")).toBeInTheDocument();
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
