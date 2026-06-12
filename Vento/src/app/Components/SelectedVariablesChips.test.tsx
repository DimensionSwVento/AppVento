import { describe, it, expect } from "vitest";
import { useEffect } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import SelectedVariablesChips from "./SelectedVariablesChips";
import {
  useVariables,
  VariablesProvider,
} from "../Utils/VariablesContext";
import { VARIABLES } from "../Utils/variablesCatalog";

function Seeder({ ids }: { ids: string[] }) {
  const { toggleVariable } = useVariables();
  useEffect(() => {
    for (const id of ids) toggleVariable(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// Variables del nuevo catálogo escogidas por propiedad útil para el test:
// - regulatoria (no-required) → tasa-exito-proyectos, para verificar subtítulo
// - penalizing (no-required, peso < 0) → grupos-beligerantes, para popover
// - additive ambientales no-required para Limpiar
const regulatoriaVar = VARIABLES.find((v) => v.id === "tasa-exito-proyectos")!;
const penalizingVar = VARIABLES.find((v) => v.id === "grupos-beligerantes")!;
const ambientalA = VARIABLES.find((v) => v.id === "densidad-aire")!;
const ambientalB = VARIABLES.find((v) => v.id === "riesgo-fisico")!;
const pendiente = VARIABLES.find((v) => v.id === "pendiente-terreno")!;

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
    render(
      <VariablesProvider>
        <Seeder ids={[regulatoriaVar.id]} />
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Regulatoria/)).toBeInTheDocument();
  });

  it("botón 'Limpiar' deselecciona todas las no-obligatorias y deja sólo las required", () => {
    render(
      <VariablesProvider>
        <Seeder ids={[ambientalA.id, ambientalB.id, pendiente.id]} />
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Limpiar/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText(ambientalA.label)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(ambientalB.label)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(pendiente.label)).not.toBeInTheDocument();
    expect(
      within(dialog).getByText("Velocidad del viento media anualizada"),
    ).toBeInTheDocument();
  });

  it("muestra los nombres de las variables activas en el panel", () => {
    render(
      <VariablesProvider>
        <Seeder ids={[ambientalA.id]} />
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(ambientalA.label)).toBeInTheDocument();
  });

  it("click sobre un item del panel abre el info popover", () => {
    render(
      <VariablesProvider>
        <Seeder ids={[penalizingVar.id]} />
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
    expect(within(info).getByText("Resta a prefactibilidad")).toBeInTheDocument();
  });

  it("info popover tiene su propio botón de cerrar", () => {
    render(
      <VariablesProvider>
        <Seeder ids={[ambientalB.id]} />
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
    render(
      <VariablesProvider>
        <Seeder ids={[ambientalA.id]} />
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
