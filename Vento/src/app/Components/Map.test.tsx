import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AprincipalProvider } from "../Utils/AccionPrincipalContext";

// DeckGL y MapLibre tocan WebGL/Canvas que jsdom no implementa.
// Mock simple: renderizan un div con sus children para que el árbol React funcione.
vi.mock("@deck.gl/react", () => ({
  DeckGL: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="deckgl">{children}</div>
  ),
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
});
