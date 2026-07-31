import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AprincipalProvider, useAprincipal } from "@/app/Utils/contexts/AccionPrincipalContext";

// Flag para simular (o no) la carga del mapa. Por defecto el mock dispara
// `onLoad` → `mapReady = true`; el test del indicador de carga lo desactiva.
const { mapLoad } = vi.hoisted(() => ({ mapLoad: { fire: true } }));

// DeckGL y MapLibre tocan WebGL/Canvas que jsdom no implementa.
// Mock simple: renderizan un div con sus children para que el árbol React funcione.
vi.mock("@deck.gl/react", () => ({
  DeckGL: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="deckgl">{children}</div>
  ),
}));

// El mock dispara `onLoad` (vía useEffect) para que MapView marque `mapReady`
// y renderice los widgets fijos (incluida la toolbar de US-FB3-02).
vi.mock("react-map-gl/maplibre", () => ({
  Map: ({ onLoad }: { onLoad?: () => void }) => {
    useEffect(() => { if (mapLoad.fire) onLoad?.(); }, [onLoad]);
    return <div data-testid="maplibre" />;
  },
}));

// @deck.gl/core arrastra wgsl_reflect (WebGPU), que no importa bajo vitest.
// Solo se usa WebMercatorViewport.fitBounds → mock ligero que devuelve una vista válida.
vi.mock("@deck.gl/core", () => ({
  WebMercatorViewport: class {
    fitBounds() {
      return { longitude: -73.5, latitude: 4.5, zoom: 8 };
    }
  },
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

import MapView from "@/app/Components/map/Map";

// Helper: siembra hexes en el contexto al montar, para poder ejercitar los
// estados habilitado/deshabilitado y los handlers de la toolbar de selección.
function SeedSelection({ hexes }: { hexes: string[] }) {
  const { setSelectedHexes } = useAprincipal();
  useEffect(() => {
    setSelectedHexes(new Set(hexes));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe("MapView", () => {
  beforeEach(() => {
    mapLoad.fire = true;
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
    mapLoad.fire = false; // el mapa aún no dispara onLoad → mapReady = false
    render(
      <AprincipalProvider>
        <MapView />
      </AprincipalProvider>
    );
    expect(screen.getByText(/cargando mapa/i)).toBeInTheDocument();
  });

  // US-FB3-02 — botones permanentes de navegación
  describe("toolbar de navegación de selección", () => {
    it("AC7 — renderiza los tres botones (zoom, reset y borrar)", () => {
      render(
        <AprincipalProvider>
          <MapView />
        </AprincipalProvider>
      );
      expect(screen.getByRole("button", { name: "Zoom a la selección" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reset a Colombia" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Borrar selección" })).toBeInTheDocument();
    });

    it("AC5 — con selección vacía, zoom y borrar quedan deshabilitados; reset habilitado", () => {
      render(
        <AprincipalProvider>
          <MapView />
        </AprincipalProvider>
      );
      expect(screen.getByRole("button", { name: "Zoom a la selección" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Borrar selección" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Reset a Colombia" })).toBeEnabled();
    });

    it("AC5 — con hexes seleccionados, zoom y borrar se habilitan", () => {
      render(
        <AprincipalProvider>
          <SeedSelection hexes={["862a1072fffffff"]} />
          <MapView />
        </AprincipalProvider>
      );
      expect(screen.getByRole("button", { name: "Zoom a la selección" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Borrar selección" })).toBeEnabled();
    });

    it("AC3/AC7 — 'Borrar selección' limpia selectedHexes (los botones vuelven a deshabilitarse)", () => {
      render(
        <AprincipalProvider>
          <SeedSelection hexes={["862a1072fffffff", "862a1077fffffff"]} />
          <MapView />
        </AprincipalProvider>
      );
      const borrar = screen.getByRole("button", { name: "Borrar selección" });
      expect(borrar).toBeEnabled();
      fireEvent.click(borrar);
      // Al vaciar la selección, borrar y zoom deben deshabilitarse de nuevo.
      expect(screen.getByRole("button", { name: "Borrar selección" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Zoom a la selección" })).toBeDisabled();
    });

    it("AC1/AC2/AC7 — 'Zoom a la selección' y 'Reset a Colombia' se disparan sin errores", () => {
      render(
        <AprincipalProvider>
          <SeedSelection hexes={["862a1072fffffff"]} />
          <MapView />
        </AprincipalProvider>
      );
      expect(() => {
        fireEvent.click(screen.getByRole("button", { name: "Zoom a la selección" }));
        fireEvent.click(screen.getByRole("button", { name: "Reset a Colombia" }));
      }).not.toThrow();
    });
  });
});
