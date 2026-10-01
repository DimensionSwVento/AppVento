import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import MapSearchBox from "@/app/Components/map/MapSearchBox";

const { searchPlaceMock } = vi.hoisted(() => ({
  searchPlaceMock: vi.fn(),
}));

vi.mock("@/app/Utils/h3/geocoder", async () => {
  const actual = await vi.importActual<typeof import("@/app/Utils/h3/geocoder")>(
    "@/app/Utils/h3/geocoder",
  );
  return {
    ...actual,
    searchPlace: searchPlaceMock,
  };
});

const samplePlace = {
  name: "El Porvenir",
  displayName: "El Porvenir, Cauca, Colombia",
  lat: 2.5,
  lng: -76.5,
  category: "place",
  type: "village",
  polygons: [
    [
      [-76.6, 2.4],
      [-76.6, 2.6],
      [-76.4, 2.6],
      [-76.4, 2.4],
    ] as [number, number][],
  ],
};

describe("MapSearchBox", () => {
  beforeEach(() => {
    searchPlaceMock.mockReset();
    vi.useFakeTimers();
  });

  it("renderiza un input de búsqueda accesible con icono lupa", () => {
    vi.useRealTimers();
    render(<MapSearchBox onSelect={() => {}} />);
    expect(screen.getByLabelText("Buscar lugar")).toBeInTheDocument();
  });

  it("no llama searchPlace si la query tiene menos de 2 caracteres", () => {
    render(<MapSearchBox onSelect={() => {}} />);
    fireEvent.change(screen.getByLabelText("Buscar lugar"), {
      target: { value: "a" },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(searchPlaceMock).not.toHaveBeenCalled();
  });

  it("llama searchPlace tras el debounce y muestra resultados", async () => {
    searchPlaceMock.mockResolvedValueOnce([samplePlace]);
    render(<MapSearchBox onSelect={() => {}} />);
    fireEvent.change(screen.getByLabelText("Buscar lugar"), {
      target: { value: "El Porvenir" },
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    vi.useRealTimers();
    await waitFor(() => {
      expect(searchPlaceMock).toHaveBeenCalledWith(
        "El Porvenir",
        expect.any(AbortSignal),
      );
    });
    expect(await screen.findByText("El Porvenir")).toBeInTheDocument();
    expect(
      screen.getByText("El Porvenir, Cauca, Colombia"),
    ).toBeInTheDocument();
  });

  it("dispara onSelect con el place al hacer click en un resultado", async () => {
    const onSelect = vi.fn();
    searchPlaceMock.mockResolvedValueOnce([samplePlace]);
    render(<MapSearchBox onSelect={onSelect} />);
    fireEvent.change(screen.getByLabelText("Buscar lugar"), {
      target: { value: "El Porvenir" },
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    vi.useRealTimers();
    const option = await screen.findByText("El Porvenir");
    fireEvent.click(option);
    expect(onSelect).toHaveBeenCalledWith(samplePlace);
  });

  it("muestra 'Sin resultados' cuando la API devuelve []", async () => {
    searchPlaceMock.mockResolvedValueOnce([]);
    render(<MapSearchBox onSelect={() => {}} />);
    fireEvent.change(screen.getByLabelText("Buscar lugar"), {
      target: { value: "xyz" },
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    vi.useRealTimers();
    expect(await screen.findByText(/Sin resultados/i)).toBeInTheDocument();
  });

  // FB-FIX-21: el modo activo debe verse después de elegir un lugar.
  describe("aviso de modo activo", () => {
    beforeEach(() => vi.useRealTimers());

    it("autoselección: muestra cuántos hexágonos se seleccionaron", () => {
      render(
        <MapSearchBox
          onSelect={() => {}}
          outcome={{ name: "Riohacha", mode: "auto", count: 124 }}
        />,
      );
      const banner = screen.getByRole("status");
      expect(banner).toHaveTextContent("Autoselección");
      expect(banner).toHaveTextContent("124 hexágonos de Riohacha seleccionados.");
    });

    it("exploración sin polígono: explica que solo se movió el mapa", () => {
      render(
        <MapSearchBox
          onSelect={() => {}}
          outcome={{ name: "La Guajira", mode: "explore", reason: "sin-poligono" }}
        />,
      );
      const banner = screen.getByRole("status");
      expect(banner).toHaveTextContent("Exploración");
      expect(banner).toHaveTextContent("solo se movió el mapa");
    });

    it("explica cuando la selección se quitó al cambiar el zoom", () => {
      render(
        <MapSearchBox
          onSelect={() => {}}
          outcome={{ name: "Riohacha", mode: "explore", reason: "zoom" }}
        />,
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "se quitó al cambiar el zoom",
      );
    });

    it("el aviso se puede cerrar", () => {
      const onDismiss = vi.fn();
      render(
        <MapSearchBox
          onSelect={() => {}}
          outcome={{ name: "Riohacha", mode: "auto", count: 1 }}
          onDismissOutcome={onDismiss}
        />,
      );
      fireEvent.click(screen.getByLabelText("Cerrar aviso de modo"));
      expect(onDismiss).toHaveBeenCalled();
    });

    it("móvil: la pastilla del input despliega y pliega el detalle", () => {
      render(
        <MapSearchBox
          onSelect={() => {}}
          outcome={{ name: "La Guajira", mode: "explore", reason: "sin-poligono" }}
        />,
      );
      const pill = screen.getByRole("button", { name: /Modo exploración/ });
      expect(pill).toHaveTextContent("Explorar");
      // Plegado: en móvil el aviso queda oculto (max-md:hidden).
      expect(screen.getByRole("status")).toHaveClass("max-md:hidden");
      fireEvent.click(pill);
      expect(pill).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("status")).not.toHaveClass("max-md:hidden");
      fireEvent.click(pill);
      expect(screen.getByRole("status")).toHaveClass("max-md:hidden");
    });

    it("sin búsqueda previa no hay aviso", () => {
      render(<MapSearchBox onSelect={() => {}} />);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("la lista de resultados explica qué hace cada modo", async () => {
      searchPlaceMock.mockResolvedValueOnce([samplePlace]);
      render(<MapSearchBox onSelect={() => {}} />);
      fireEvent.change(screen.getByLabelText("Buscar lugar"), {
        target: { value: "porvenir" },
      });
      expect(await screen.findByText(/solo mueve/)).toBeInTheDocument();
      expect(
        screen.getByTitle("Al elegirlo se seleccionan los hexágonos del lugar"),
      ).toBeInTheDocument();
    });
  });
});
