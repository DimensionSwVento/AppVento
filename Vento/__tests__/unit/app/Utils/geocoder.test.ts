import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { polygonCentroid, searchPlace } from "@/app/Utils/h3/geocoder";

describe("geocoder — polygonCentroid", () => {
  it("retorna null para anillo vacío", () => {
    expect(polygonCentroid([])).toBeNull();
  });

  it("calcula el promedio simple de lat/lng de los vértices", () => {
    const ring: [number, number][] = [
      [-74, 4],
      [-74, 5],
      [-73, 5],
      [-73, 4],
    ];
    const c = polygonCentroid(ring);
    expect(c).not.toBeNull();
    expect(c!.lat).toBeCloseTo(4.5);
    expect(c!.lng).toBeCloseTo(-73.5);
  });
});

describe("geocoder — searchPlace (mock fetch)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("retorna [] si la query es menor a 2 chars (no hace fetch)", async () => {
    const out = await searchPlace("a");
    expect(out).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("llama Nominatim con los parámetros esperados y parsea la respuesta", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          display_name: "El Porvenir, Cauca, Colombia",
          name: "El Porvenir",
          lat: "2.5",
          lon: "-76.5",
          class: "place",
          type: "village",
          geojson: {
            type: "Polygon",
            coordinates: [[[-76.6, 2.4], [-76.6, 2.6], [-76.4, 2.6], [-76.4, 2.4]]],
          },
        },
      ],
    });
    const out = await searchPlace("El Porvenir");
    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain("countrycodes=co");
    expect(url).toContain("polygon_geojson=1");
    expect(url).toContain("limit=7");
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("El Porvenir");
    expect(out[0].lat).toBe(2.5);
    expect(out[0].lng).toBe(-76.5);
    expect(out[0].type).toBe("village");
    expect(out[0].polygons).toHaveLength(1);
  });

  it("aplana MultiPolygon a varios anillos", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          display_name: "Test",
          name: "Test",
          lat: "0",
          lon: "0",
          class: "boundary",
          type: "administrative",
          geojson: {
            type: "MultiPolygon",
            coordinates: [
              [[[0, 0], [0, 1], [1, 1], [1, 0]]],
              [[[2, 2], [2, 3], [3, 3], [3, 2]]],
            ],
          },
        },
      ],
    });
    const out = await searchPlace("test");
    expect(out[0].polygons).toHaveLength(2);
  });

  it("retorna polygons=[] cuando la respuesta no tiene geojson", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          display_name: "Punto sin polígono",
          name: "X",
          lat: "1",
          lon: "1",
          class: "place",
          type: "village",
        },
      ],
    });
    const out = await searchPlace("Punto");
    expect(out[0].polygons).toEqual([]);
  });

  it("lanza si Nominatim responde con !ok", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 503,
    });
    await expect(searchPlace("abc")).rejects.toThrow(/503/);
  });
});
