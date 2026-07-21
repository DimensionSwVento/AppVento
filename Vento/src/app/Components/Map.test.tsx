import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { AprincipalProvider } from "../Utils/AccionPrincipalContext";

// DeckGL y MapLibre tocan WebGL/Canvas que jsdom no implementa.
// Mock simple: renderizan un div con sus children para que el árbol React funcione.
// Además capturamos las props del último render: `getCursor`, `onHover` y las
// capas son la superficie que verifican los tests de US-FB3-03 (feedback 8) y
// no hay otra forma de alcanzarlas sin un contexto WebGL real.
type DeckProps = {
  getCursor: (s: { isHovering: boolean; isDragging?: boolean }) => string;
  onHover: (info: { object?: { h: string }; x?: number; y?: number }) => void;
  layers: ({ id: string; pickable?: boolean; visible?: boolean } | null)[];
};
let deckProps: DeckProps;

vi.mock("@deck.gl/react", () => ({
  DeckGL: ({ children, ...props }: { children: React.ReactNode }) => {
    deckProps = props as unknown as DeckProps;
    return <div data-testid="deckgl">{children}</div>;
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

// Fase "informe" con heatmap encendido: los providers reales sólo exponen
// estado interno (no aceptan valor inicial), así que se mockean los hooks de
// contexto para poder montar el mapa directamente en esa fase.
const SELECTED_HEX = "8866e50b61fffff"; // res-8 en Colombia → sin expansión
const informeMode = { on: false };

vi.mock("../Utils/AccionPrincipalContext", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../Utils/AccionPrincipalContext")
  >();
  return {
    ...actual,
    useAprincipal: () =>
      informeMode.on
        ? {
            accion: "informe",
            selectedHexes: new Set([SELECTED_HEX]),
            setSelectedHexes: vi.fn(),
            setAccion: vi.fn(),
          }
        : {
            accion: "seleccion-area",
            selectedHexes: new Set<string>(),
            setSelectedHexes: vi.fn(),
            setAccion: vi.fn(),
          },
  };
});

vi.mock("../Utils/HeatmapDimensionContext", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../Utils/HeatmapDimensionContext")
  >();
  return {
    ...actual,
    useHeatmapDimension: () => ({
      activeDimension: informeMode.on ? "general" : null,
      toggleDimension: vi.fn(),
      setActiveDimension: vi.fn(),
    }),
  };
});

import MapView from "./Map";

/** Monta el mapa en fase informe con el heatmap activo. */
function renderInforme() {
  informeMode.on = true;
  return render(
    <AprincipalProvider>
      <MapView />
    </AprincipalProvider>
  );
}

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

// US-FB3-03 / feedback item 8 — tooltip por hexágono en la fase de informe.
describe("MapView — hover en la fase de informe (US-FB3-03)", () => {
  afterEach(() => {
    informeMode.on = false;
  });

  // AC2 — el cursor "prohibido" era lo que hacía leer el mapa como bloqueado.
  it("nunca usa el cursor not-allowed", () => {
    render(
      <AprincipalProvider>
        <MapView />
      </AprincipalProvider>
    );
    expect(deckProps.getCursor({ isHovering: true })).not.toBe("not-allowed");
    expect(deckProps.getCursor({ isHovering: false })).not.toBe("not-allowed");

    cleanup();
    renderInforme();
    expect(deckProps.getCursor({ isHovering: true })).not.toBe("not-allowed");
    expect(deckProps.getCursor({ isHovering: false })).not.toBe("not-allowed");
  });

  // AC2 — el cursor refleja la pickabilidad: hex consultable → pointer.
  it("usa pointer sobre un hex consultable y grab fuera de él", () => {
    renderInforme();
    expect(deckProps.getCursor({ isHovering: true })).toBe("pointer");
    expect(deckProps.getCursor({ isHovering: false })).toBe("grab");
  });

  // AC3 — la regresión de fondo: con el heatmap activo, grid y selected van
  // con visible:false y deck.gl no pickea capas invisibles. Si el heatmap no
  // es pickable no queda NADA que pickear y el tooltip no sale en ningún hex.
  it("deja el heatmap del informe como capa pickable", () => {
    renderInforme();
    const heatmap = deckProps.layers.find((l) => l?.id === "informe-heatmap");
    expect(heatmap).toBeDefined();
    expect(heatmap?.pickable).toBe(true);
  });

  // AC5 — el handler de hover alimenta el estado `hoveredHex`, que es lo que
  // monta el tooltip.
  it("el hover sobre un hex muestra el tooltip de valores", () => {
    renderInforme();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    act(() => {
      deckProps.onHover({ object: { h: SELECTED_HEX }, x: 120, y: 80 });
    });
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveStyle({ left: "132px", top: "92px" });
  });

  // AC5 — salir del hex limpia el estado y oculta el tooltip.
  it("el hover fuera de un hex oculta el tooltip", () => {
    renderInforme();
    act(() => {
      deckProps.onHover({ object: { h: SELECTED_HEX }, x: 10, y: 10 });
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    act(() => {
      deckProps.onHover({ object: undefined, x: 10, y: 10 });
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
