import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AprincipalProvider } from "../Utils/AccionPrincipalContext";

// Smoke test: HeatmapDemo es WebGL-pesado; el comportamiento real del mapa
// se cubre en e2e. Aquí sólo verificamos que monta y dispara los fetches
// de arranque (warmup / counts / variables).
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

vi.mock("@luma.gl/core", () => ({ luma: { registerAdapters: vi.fn() } }));
vi.mock("@luma.gl/webgl", () => ({ webgl2Adapter: {} }));

import HeatmapDemo from "./HeatmapDemo";

describe("HeatmapDemo (smoke)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/tiles/warmup")) {
        return Promise.resolve({ ok: true, json: async () => ({ status: "ready" }) });
      }
      if (url.includes("/api/tiles/counts")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ total: 100, selected: 0, aboveThreshold: 60 }),
        });
      }
      if (url.includes("/api/tiles/variables")) {
        return Promise.resolve({ ok: true, json: async () => ({ variables: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("monta el mapa (DeckGL + MapLibre stubs) sin errores", async () => {
    render(
      <AprincipalProvider>
        <HeatmapDemo />
      </AprincipalProvider>,
    );
    expect(screen.getByTestId("deckgl")).toBeInTheDocument();
    expect(screen.getByTestId("maplibre")).toBeInTheDocument();
    // Dispara el warmup del backend al montar.
    await vi.waitFor(() => {
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.map(
        (c) => String(c[0]),
      );
      expect(calls.some((u) => u.includes("/api/tiles/warmup"))).toBe(true);
    });
  });
});
