import { apiUrl } from "./apiUrl";
import { dimensionHexScore } from "./heatmapPalette";

export type SinDistanceSource = "backend" | "demo";

export interface HexSinDistance {
  h3Index: string;
  distanceKm: number;
  source: SinDistanceSource;
}

interface HexDetailResponse {
  distancia_sin_km?: unknown;
  variables?: Record<string, unknown>;
}

const DISTANCE_FIELD_CANDIDATES = [
  "distancia_sin_km",
  "distancia_al_sin_km",
  "distancia-sin",
] as const;

export function nearestHexToSin(
  distances: Iterable<HexSinDistance>,
): HexSinDistance | null {
  let nearest: HexSinDistance | null = null;

  for (const item of distances) {
    if (!Number.isFinite(item.distanceKm) || item.distanceKm < 0) continue;
    if (!nearest || item.distanceKm < nearest.distanceKm) nearest = item;
  }

  return nearest;
}

export function parseSinDistance(detail: HexDetailResponse): number | null {
  const topLevel = toDistance(detail.distancia_sin_km);
  if (topLevel !== null) return topLevel;

  const variables = detail.variables ?? {};
  for (const candidate of DISTANCE_FIELD_CANDIDATES) {
    const direct = toDistance(variables[candidate]);
    if (direct !== null) return direct;

    const aggregateEntry = Object.entries(variables).find(([key]) =>
      key.startsWith(`${candidate}/`),
    );
    const aggregate = toDistance(aggregateEntry?.[1]);
    if (aggregate !== null) return aggregate;
  }

  return null;
}

export async function fetchNearestSinDistance(
  hexes: Iterable<string>,
  fetcher: typeof fetch = fetch,
): Promise<HexSinDistance | null> {
  const results = await Promise.all(
    Array.from(hexes, (h3Index) => fetchHexSinDistance(h3Index, fetcher)),
  );
  const backendResults = results.filter((item) => item.source === "backend");

  // Nunca mezclar una estimación demo con distancias reales del dataset.
  return nearestHexToSin(backendResults.length > 0 ? backendResults : results);
}

async function fetchHexSinDistance(
  h3Index: string,
  fetcher: typeof fetch,
): Promise<HexSinDistance> {
  try {
    const response = await fetcher(
      apiUrl(`/api/tiles/detail/${encodeURIComponent(h3Index)}`),
    );
    if (response.ok) {
      const detail = (await response.json()) as HexDetailResponse;
      const distanceKm = parseSinDistance(detail);
      if (distanceKm !== null) {
        return { h3Index, distanceKm, source: "backend" };
      }
    }
  } catch {
    // El fallback demo mantiene operativo el frontend sin ocultar su origen.
  }

  return {
    h3Index,
    distanceKm: dimensionHexScore("distancia-sin", h3Index) * 80,
    source: "demo",
  };
}

function toDistance(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
