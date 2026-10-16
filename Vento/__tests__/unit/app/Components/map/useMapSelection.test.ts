import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { useMapSelection } from "@/app/Components/map/useMapSelection";
import type { Place } from "@/app/Utils/h3/geocoder";

// FB-FIX-21: `searchOutcome` refleja qué hizo realmente el buscador.

const { bannedMock } = vi.hoisted(() => ({ bannedMock: vi.fn(() => false) }));
vi.mock("@/app/Utils/h3/hexClassification", () => ({
  isHexBanned: bannedMock,
  canAddHexToSelection: () => true,
}));

const ring: [number, number][] = [
  [-72.95, 11.5],
  [-72.95, 11.56],
  [-72.87, 11.56],
  [-72.87, 11.5],
  [-72.95, 11.5],
];
const municipio: Place = {
  name: "Riohacha",
  displayName: "Riohacha, La Guajira, Colombia",
  lat: 11.53,
  lng: -72.91,
  category: "place",
  type: "city",
  polygons: [ring],
};
const region: Place = { ...municipio, name: "La Guajira", type: "state", polygons: [] };

// viewState como estado React real (igual que Map.tsx): el fly-to del buscador
// y el cambio de zoom ocurren en el mismo render que la selección.
function setup() {
  return renderHook(() => {
    const [viewState, setViewState] = useState({
      longitude: -74,
      latitude: 4.5,
      zoom: 6,
      pitch: 0,
      bearing: 0,
    });
    const sel = useMapSelection({
      canSelect: true,
      viewState: viewState as never,
      selectedHexes: new Set(),
      setViewState: setViewState as never,
      clampViewState: (v) => v,
      setSelectedHexes: vi.fn(),
    });
    return { ...sel, setViewState };
  });
}

describe("useMapSelection — searchOutcome", () => {
  beforeEach(() => bannedMock.mockReturnValue(false));

  it("lugar con polígono → autoselección con conteo", () => {
    const { result } = setup();
    act(() => result.current.handlePlaceSelect(municipio));
    const o = result.current.searchOutcome;
    expect(o?.mode).toBe("auto");
    expect(o && o.mode === "auto" && o.count).toBeGreaterThan(0);
  });

  it("lugar sin polígono → exploración (sin-poligono)", () => {
    const { result } = setup();
    act(() => result.current.handlePlaceSelect(region));
    expect(result.current.searchOutcome).toEqual({
      name: "La Guajira",
      mode: "explore",
      reason: "sin-poligono",
    });
  });

  it("polígono con todo excluido → exploración (sin-zonas), no promete autoselección", () => {
    bannedMock.mockReturnValue(true);
    const { result } = setup();
    act(() => result.current.handlePlaceSelect(municipio));
    expect(result.current.searchOutcome).toMatchObject({ mode: "explore", reason: "sin-zonas" });
  });

  it("al cambiar de resolución H3 la autoselección pasa a exploración (zoom)", () => {
    const { result } = setup();
    act(() => result.current.handlePlaceSelect(municipio));
    expect(result.current.searchOutcome?.mode).toBe("auto");
    // El usuario aleja el mapa → otra resolución H3.
    act(() => result.current.setViewState((v) => ({ ...v, zoom: 6 })));
    expect(result.current.searchOutcome).toMatchObject({ mode: "explore", reason: "zoom" });
  });

  it("resetSearch y dismiss limpian el aviso", () => {
    const { result } = setup();
    act(() => result.current.handlePlaceSelect(region));
    act(() => result.current.dismissSearchOutcome());
    expect(result.current.searchOutcome).toBeNull();
    act(() => result.current.handlePlaceSelect(region));
    act(() => result.current.resetSearch());
    expect(result.current.searchOutcome).toBeNull();
  });
});
