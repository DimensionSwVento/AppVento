import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import MapView from "@/app/Components/map/Map";

// US-FB3-03 / feedback item 8 — tooltip por hexágono en la fase de informe.
//
// Estos tests viven en su PROPIO archivo (no en Map.test.tsx) a propósito:
// aquí mockeamos los hooks de contexto a nivel de módulo para forzar la fase
// "informe", lo que sería incompatible con los tests de Map.test.tsx que usan
// el AprincipalProvider REAL. `vi.mock` es global al archivo.
//
// La superficie verificable es DeckGL: capturamos sus props (`getCursor`,
// `onHover`, `layers`) porque no hay otra forma de alcanzarlas sin WebGL real.

type DeckProps = {
  getCursor: (s: { isHovering: boolean }) => string;
  onHover: (info: { object?: { h: string }; x?: number; y?: number }) => void;
  layers: ({ id: string; pickable?: boolean; visible?: boolean } | null)[];
};
let deckProps: DeckProps;

vi.mock("@deck.gl/react", () => ({
  DeckGL: ({ children, ...props }: { children: ReactNode }) => {
    deckProps = props as unknown as DeckProps;
    return <div data-testid="deckgl">{children}</div>;
  },
}));

vi.mock("react-map-gl/maplibre", () => ({
  Map: () => <div data-testid="maplibre" />,
}));

vi.mock("@deck.gl/core", () => ({
  WebMercatorViewport: class {
    fitBounds() {
      return { longitude: -73.5, latitude: 4.5, zoom: 8 };
    }
  },
}));

// Las capas se mockean como clases que copian sus props a `this`, para poder
// inspeccionar `id`/`pickable`/`visible` desde `deckProps.layers`.
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
vi.mock("@luma.gl/core", () => ({ luma: { registerAdapters: vi.fn() } }));
vi.mock("@luma.gl/webgl", () => ({ webgl2Adapter: {} }));

// Forzamos la fase "informe" con una dimensión activa → heatmapActive = true.
// Map.tsx: canSelect = accion==="seleccion-area"; heatmapActive = accion==="informe" && activeDimension!==null.
const SELECTED_HEX = "8866e50b61fffff"; // res-8 en Colombia (sin expansión)

vi.mock("@/app/Utils/contexts/AccionPrincipalContext", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/app/Utils/contexts/AccionPrincipalContext")
    >();
  return {
    ...actual,
    useAprincipal: () => ({
      accion: "informe",
      selectedHexes: new Set([SELECTED_HEX]),
      setSelectedHexes: vi.fn(),
      setAccion: vi.fn(),
      maxFaseIdx: 0,
    }),
  };
});

vi.mock("@/app/Utils/contexts/HeatmapDimensionContext", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/app/Utils/contexts/HeatmapDimensionContext")
    >();
  return {
    ...actual,
    useHeatmapDimension: () => ({
      activeDimension: "ambiental",
      toggleDimension: vi.fn(),
      setActiveDimension: vi.fn(),
    }),
  };
});

describe("MapView — fase de informe: cursor y capa pickable (US-FB3-03)", () => {
  // AC2 — el cursor "prohibido" hacía leer el mapa como bloqueado; ya no debe salir.
  it("getCursor nunca devuelve 'not-allowed'", () => {
    render(<MapView />);
    expect(deckProps.getCursor({ isHovering: true })).not.toBe("not-allowed");
    expect(deckProps.getCursor({ isHovering: false })).not.toBe("not-allowed");
  });

  it("getCursor: 'pointer' al hover sobre la capa consultable del informe, 'grab' fuera", () => {
    render(<MapView />);
    // En informe: canSelect=false, heatmapActive=true → hover = pointer.
    expect(deckProps.getCursor({ isHovering: true })).toBe("pointer");
    expect(deckProps.getCursor({ isHovering: false })).toBe("grab");
  });

  it("deja el heatmap del informe como ÚNICA capa pickable (habilita el tooltip por hex)", () => {
    render(<MapView />);
    const heatmap = deckProps.layers.find((l) => l?.id === "informe-heatmap");
    expect(heatmap).toBeDefined();
    expect(heatmap?.pickable).toBe(true);
  });
});
