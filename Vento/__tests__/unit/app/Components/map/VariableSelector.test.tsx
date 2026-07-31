import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// VariableSelector solo pide la lista de variables si USE_BACKEND=true; en test
// forzamos el modo con API (en template no renderiza el select).
vi.mock("@/app/Utils/projectData", async (orig) => ({
  ...(await orig<typeof import("@/app/Utils/projectData")>()),
  USE_BACKEND: true,
}));

import VariableSelector from "@/app/Components/map/VariableSelector";

const variablesFixture = {
  variables: [
    { name: "001_velocidad_de_viento", label: "Velocidad de Viento", range: { min: 0, max: 12 } },
    { name: "soc_022_sr", label: "Zona Reserva Campesina", range: null },
  ],
};

describe("VariableSelector", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => variablesFixture,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("no renderiza nada mientras no llegan variables", () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}),
    );
    const { container } = render(
      <VariableSelector selected={null} onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza el select con la opción default y las variables de la API", async () => {
    render(<VariableSelector selected={null} onSelect={vi.fn()} />);
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/tiles/variables");
    expect(screen.getByRole("option", { name: "Temp. Viabilidad" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Velocidad de Viento" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Zona Reserva Campesina" })).toBeInTheDocument();
  });

  it("seleccionar una variable llama onSelect con su nombre", async () => {
    const onSelect = vi.fn();
    render(<VariableSelector selected={null} onSelect={onSelect} />);
    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: "001_velocidad_de_viento" } });
    expect(onSelect).toHaveBeenCalledWith("001_velocidad_de_viento");
  });

  it("seleccionar la opción default llama onSelect con null", async () => {
    const onSelect = vi.fn();
    render(
      <VariableSelector selected="001_velocidad_de_viento" onSelect={onSelect} />,
    );
    const select = await screen.findByRole("combobox");
    fireEvent.change(select, { target: { value: "" } });
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("un fetch fallido no rompe el componente (queda vacío)", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network"),
    );
    const { container } = render(
      <VariableSelector selected={null} onSelect={vi.fn()} />,
    );
    await vi.waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });
});
