import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AprincipalProvider } from "../Utils/AccionPrincipalContext";

// DeckGL y MapLibre tocan WebGL/Canvas que jsdom no implementa.
// Mock simple: renderizan un div con sus children para que el árbol React funcione.
vi.mock("@deck.gl/react", () => ({
  DeckGL: ({
    children,
    layers,
    onClick,
  }: {
    children: React.ReactNode;
    layers: Array<{
      id?: string;
      data?: unknown[];
      pickable?: boolean;
    } | null>;
    onClick?: (info: { object?: { h: string } }) => void;
  }) => {
    const selectedLayer = layers.find((layer) => layer?.id === "selected-hexes");
    const selectedCount = Array.isArray(selectedLayer?.data)
      ? selectedLayer.data.length
      : 0;

    return (
      <div data-testid="deckgl">
        <button
          type="button"
          data-testid="large-hex"
          onClick={() => onClick?.({ object: { h: "83754efffffffff" } })}
        >
          Hexágono grande
        </button>
        <output data-testid="selected-count">{selectedCount}</output>
        <output data-testid="selected-layer-pickable">
          {String(selectedLayer?.pickable)}
        </output>
        {children}
      </div>
    );
  },
}));

vi.mock("react-map-gl/maplibre", () => ({
  Map: () => <div data-testid="maplibre" />,
}));

vi.mock("@deck.gl/geo-layers", () => ({
  TileLayer: vi.fn(function (this: object, props: object) {
    Object.assign(this, props);
  }),
}));

vi.mock("@deck.gl/layers", () => ({
  PolygonLayer: vi.fn(function (this: object, props: object) {
    Object.assign(this, props);
  }),
  TextLayer: vi.fn(function (this: object, props: object) {
    Object.assign(this, props);
  }),
}));

vi.mock("@luma.gl/core", () => ({
  luma: { registerAdapters: vi.fn() },
}));

vi.mock("@luma.gl/webgl", () => ({
  webgl2Adapter: {},
}));

import MapView from "./Map";

describe("MapView", () => {
  it("renderiza el contenedor del mapa", () => {
    render(
      <AprincipalProvider>
        <MapView />
      </AprincipalProvider>
    );
    expect(screen.getByTestId("deckgl")).toBeInTheDocument();
    expect(screen.getByTestId("maplibre")).toBeInTheDocument();
  });

  it("muestra el indicador de carga inicial", () => {
    render(
      <AprincipalProvider>
        <MapView />
      </AprincipalProvider>
    );
    expect(screen.getByText(/cargando mapa/i)).toBeInTheDocument();
  });

  it("permite deseleccionar un hexágono grande al volver a clicar", () => {
    render(
      <AprincipalProvider>
        <MapView />
      </AprincipalProvider>
    );

    const largeHex = screen.getByTestId("large-hex");

    fireEvent.click(largeHex);
    expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
    expect(screen.getByTestId("selected-layer-pickable")).toHaveTextContent(
      "true",
    );

    fireEvent.click(largeHex);
    expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
  });
});
