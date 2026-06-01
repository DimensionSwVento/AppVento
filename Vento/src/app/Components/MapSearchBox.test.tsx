import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import MapSearchBox from "./MapSearchBox";

const { searchPlaceMock } = vi.hoisted(() => ({
  searchPlaceMock: vi.fn(),
}));

vi.mock("../Utils/geocoder", async () => {
  const actual = await vi.importActual<typeof import("../Utils/geocoder")>(
    "../Utils/geocoder",
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
});
