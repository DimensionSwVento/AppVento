import { describe, expect, it, vi } from "vitest";
import {
  fetchNearestSinDistance,
  nearestHexToSin,
  parseSinDistance,
} from "./sinDistance";

describe("nearestHexToSin", () => {
  it("devuelve el hex con la distancia mínima al SIN", () => {
    expect(
      nearestHexToSin([
        { h3Index: "hex-a", distanceKm: 18.2, source: "backend" },
        { h3Index: "hex-b", distanceKm: 4.7, source: "backend" },
        { h3Index: "hex-c", distanceKm: 9.1, source: "backend" },
      ]),
    ).toEqual({ h3Index: "hex-b", distanceKm: 4.7, source: "backend" });
  });

  it("ignora valores inválidos y devuelve null sin datos válidos", () => {
    expect(
      nearestHexToSin([
        { h3Index: "negative", distanceKm: -1, source: "backend" },
        { h3Index: "nan", distanceKm: Number.NaN, source: "demo" },
      ]),
    ).toBeNull();
  });
});

describe("parseSinDistance", () => {
  it("acepta el campo de primer nivel y agregados del dataset", () => {
    expect(parseSinDistance({ distancia_sin_km: 12.5 })).toBe(12.5);
    expect(
      parseSinDistance({
        variables: { "distancia_sin_km/mean": "7.25" },
      }),
    ).toBe(7.25);
  });
});

describe("fetchNearestSinDistance", () => {
  it("consulta cada detalle y conserva el mínimo real", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const distance = String(input).includes("hex-near") ? 2.5 : 20;
      return new Response(JSON.stringify({ distancia_sin_km: distance }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const result = await fetchNearestSinDistance(
      ["hex-far", "hex-near"],
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      h3Index: "hex-near",
      distanceKm: 2.5,
      source: "backend",
    });
  });

  it("usa un valor demo explícito cuando el backend no está disponible", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    const result = await fetchNearestSinDistance(["hex-demo"], fetcher);

    expect(result?.source).toBe("demo");
    expect(result?.distanceKm).toBeGreaterThanOrEqual(0);
    expect(result?.distanceKm).toBeLessThanOrEqual(80);
  });
});
