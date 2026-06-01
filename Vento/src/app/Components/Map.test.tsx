import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { AprincipalProvider } from "../Utils/AccionPrincipalContext";

type TestViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

type DeckGLMockProps = {
  children?: React.ReactNode;
  onViewStateChange?: (args: { viewState: TestViewState }) => void;
};

type TileLayerMockProps = {
  refinementStrategy?: string;
  onViewportLoad?: () => void;
};

const deckGLPropsRef = vi.hoisted(
  (): { current: DeckGLMockProps | null } => ({ current: null }),
);
const tileLayerPropsRef = vi.hoisted(
  (): { current: TileLayerMockProps | null } => ({ current: null }),
);

const VIEW_STATE: TestViewState = {
  longitude: -73.5,
  latitude: 4.5,
  zoom: 6,
  pitch: 0,
  bearing: 0,
};

// DeckGL y MapLibre tocan WebGL/Canvas que jsdom no implementa.
// Mock simple: renderizan un div con sus children para que el árbol React funcione.
vi.mock("@deck.gl/react", () => ({
  DeckGL: (props: DeckGLMockProps) => {
    deckGLPropsRef.current = props;
    return <div data-testid="deckgl">{props.children}</div>;
  },
}));

vi.mock("react-map-gl/maplibre", () => ({
  Map: () => <div data-testid="maplibre" />,
}));

vi.mock("@deck.gl/geo-layers", () => ({
  TileLayer: vi.fn(function (this: object, props: TileLayerMockProps) {
    tileLayerPropsRef.current = props;
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
  beforeEach(() => {
    deckGLPropsRef.current = null;
    tileLayerPropsRef.current = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("usa refinementStrategy best-available para suavizar el cambio de tiles", () => {
    render(
      <AprincipalProvider>
        <MapView />
      </AprincipalProvider>
    );
    expect(tileLayerPropsRef.current?.refinementStrategy).toBe("best-available");
  });

  it("activa y limpia la transición visual cuando cambia la resolución H3", () => {
    vi.useFakeTimers();
    render(
      <AprincipalProvider>
        <MapView />
      </AprincipalProvider>
    );

    act(() => {
      deckGLPropsRef.current?.onViewStateChange?.({
        viewState: { ...VIEW_STATE, zoom: 8 },
      });
    });

    expect(screen.getByTestId("h3-remap-status")).toHaveTextContent(
      "Actualizando retícula",
    );

    act(() => {
      tileLayerPropsRef.current?.onViewportLoad?.();
      vi.advanceTimersByTime(260);
    });

    expect(screen.queryByTestId("h3-remap-status")).not.toBeInTheDocument();
  });

  it("soporta cambios entre resoluciones H3 3-8 sin errores de render", () => {
    vi.useFakeTimers();
    render(
      <AprincipalProvider>
        <MapView />
      </AprincipalProvider>
    );

    for (const zoom of [5, 6, 7, 8, 10, 12]) {
      act(() => {
        deckGLPropsRef.current?.onViewStateChange?.({
          viewState: { ...VIEW_STATE, zoom },
        });
      });
      act(() => {
        vi.advanceTimersByTime(650);
      });
    }

    expect(screen.getByTestId("deckgl")).toBeInTheDocument();
  });
});
