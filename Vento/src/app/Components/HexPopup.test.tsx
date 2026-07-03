import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HexPopup from "./HexPopup";

const HEX = "8a2a1072b59ffff";

const detailFixture = {
  h3_index: HEX,
  score_general: 0.87,
  tipo_celda: "continental",
  variables: {
    "001_velocidad_de_viento/mean": 7.5,
    "004_densidad_energ/mean": 412.1,
    sin_dato: null,
  },
};

describe("HexPopup", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetchOnce(payload: unknown, ok = true) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok,
      json: async () => payload,
    });
  }

  it("muestra estado de carga y luego el detalle del hexágono", async () => {
    mockFetchOnce(detailFixture);
    render(<HexPopup h3Index={HEX} x={100} y={100} onClose={vi.fn()} />);

    expect(screen.getByText("Cargando...")).toBeInTheDocument();
    expect(await screen.findByText("Score General")).toBeInTheDocument();
    expect(screen.getByText("87%")).toBeInTheDocument();
    expect(screen.getByText("Velocidad de Viento")).toBeInTheDocument();
    expect(screen.getByText(/7\.50/)).toBeInTheDocument();
    expect(screen.getByText("continental")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(`/api/tiles/detail/${HEX}`);
  });

  it("omite variables con valor null", async () => {
    mockFetchOnce(detailFixture);
    render(<HexPopup h3Index={HEX} x={100} y={100} onClose={vi.fn()} />);
    await screen.findByText("Score General");
    expect(screen.queryByText(/sin dato/)).not.toBeInTheDocument();
  });

  it("muestra 'Sin datos' cuando la API responde !ok", async () => {
    mockFetchOnce({}, false);
    render(<HexPopup h3Index={HEX} x={100} y={100} onClose={vi.fn()} />);
    expect(await screen.findByText("Sin datos")).toBeInTheDocument();
  });

  it("muestra 'Sin datos' cuando el fetch falla", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("network"),
    );
    render(<HexPopup h3Index={HEX} x={100} y={100} onClose={vi.fn()} />);
    expect(await screen.findByText("Sin datos")).toBeInTheDocument();
  });

  it("el botón × llama onClose", async () => {
    mockFetchOnce(detailFixture);
    const onClose = vi.fn();
    render(<HexPopup h3Index={HEX} x={100} y={100} onClose={onClose} />);
    await screen.findByText("Score General");
    fireEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("un click fuera del popup llama onClose (tras el defer de 100ms)", async () => {
    vi.useFakeTimers();
    try {
      mockFetchOnce(detailFixture);
      const onClose = vi.fn();
      render(<HexPopup h3Index={HEX} x={100} y={100} onClose={onClose} />);

      // Antes del defer el listener no está registrado.
      fireEvent.click(document.body);
      expect(onClose).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(150);
      fireEvent.click(document.body);
      expect(onClose).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
