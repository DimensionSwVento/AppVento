import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import polygonClipping from "polygon-clipping";

// --- Fuente A: IGAC departamentos (tierra firme, fuente oficial colombiana) ---

const IGAC_SOURCE_URL =
  "https://mapas2.igac.gov.co/server/rest/services/limites/limites/MapServer/2/query";

const IGAC_QUERY = {
  where: "1=1",
  outFields: "DeCodigo,DeNombre",
  returnGeometry: "true",
  outSR: "4326",
  geometryPrecision: "5",
  maxAllowableOffset: "0.001",
  f: "json",
};

// --- Fuente B: Nominatim/OSM admin_level=2 Colombia (incluye mar territorial ~22 km) ---
//
// El mismo patrón que usa el geocoder cliente (`Vento/src/app/Utils/geocoder.ts`).
// Se aprovecha que OSM mantiene los polígonos administrativos con mar territorial
// para que el borde quede ~20 km offshore en la costa sin necesidad de buffer.

const NOMINATIM_SOURCE_URL = "https://nominatim.openstreetmap.org/search";

const NOMINATIM_QUERY = {
  q: "Colombia",
  countrycodes: "co",
  format: "jsonv2",
  polygon_geojson: "1",
  limit: "1",
  "accept-language": "es",
};

// Nominatim exige User-Agent identificable (https://operations.osmfoundation.org/policies/nominatim/).
const NOMINATIM_USER_AGENT = "vento-app/1.0 (generate-igac-boundary.mjs)";

const OUTPUT_PATH = resolve("src/app/Utils/data/colombia-igac-boundary.json");
const LAND_OUTPUT_PATH = resolve(
  "src/app/Utils/data/colombia-igac-land-boundary.json",
);
const MIN_RING_AREA = 0.000001;

// Modo `--land-only` → tierra firme oficial sin la unión Nominatim (sin
// mar territorial). Usado por `hexClassification.ts` para auto-detectar
// onshore/offshore con precisión real (no la heurística manual previa).
const LAND_ONLY_MODE = process.argv.includes("--land-only");

function buildIgacUrl() {
  const params = new URLSearchParams(IGAC_QUERY);
  return `${IGAC_SOURCE_URL}?${params.toString()}`;
}

function buildNominatimUrl() {
  const params = new URLSearchParams(NOMINATIM_QUERY);
  return `${NOMINATIM_SOURCE_URL}?${params.toString()}`;
}

function closeRing(ring) {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

/** Convierte feature ArcGIS REST (IGAC) a MultiPolygons separados para polygon-clipping. */
function igacFeatureToMultiPolygons(feature) {
  const rings = feature.geometry?.rings ?? [];
  return rings
    .map((ring) => closeRing(ring))
    .filter((ring) => ring.length >= 4)
    .map((ring) => [[ring]]);
}

/**
 * Convierte GeoJSON Polygon/MultiPolygon (Nominatim) a UNA MultiPolygon de
 * polygon-clipping. Soporta huecos (rings interiores).
 */
function nominatimGeojsonToMultiPolygon(geojson) {
  if (!geojson) return null;
  if (geojson.type === "Polygon") {
    // coordinates = [outer, hole1, hole2, ...] → MultiPolygon con un polígono
    return [geojson.coordinates];
  }
  if (geojson.type === "MultiPolygon") {
    // coordinates = [[outer, holes...], [outer2, holes...]] → ya es MultiPolygon
    return geojson.coordinates;
  }
  return null;
}

function ringBounds(ring) {
  return ring.reduce(
    ([west, south, east, north], [lng, lat]) => [
      Math.min(west, lng),
      Math.min(south, lat),
      Math.max(east, lng),
      Math.max(north, lat),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
}

function mergeBounds(bounds) {
  return bounds.reduce(
    ([west, south, east, north], current) => [
      Math.min(west, current[0]),
      Math.min(south, current[1]),
      Math.max(east, current[2]),
      Math.max(north, current[3]),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
}

function normalizeUnion(result) {
  return result
    .map((polygon) => polygon[0])
    .filter((ring) => Array.isArray(ring) && ring.length >= 4)
    .map((ring) => closeRing(ring))
    .filter((ring) => Math.abs(ringArea(ring)) >= MIN_RING_AREA)
    .sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)));
}

async function fetchIgac() {
  const sourceQueryUrl = buildIgacUrl();
  const response = await fetch(sourceQueryUrl);
  if (!response.ok) {
    throw new Error(
      `IGAC request failed: ${response.status} ${response.statusText}`,
    );
  }
  const payload = await response.json();
  const features = payload.features ?? [];
  if (features.length === 0) {
    throw new Error("IGAC response did not include polygon features");
  }
  return {
    features,
    sourceQueryUrl,
    multiPolygons: features.flatMap(igacFeatureToMultiPolygons),
  };
}

async function fetchNominatim() {
  const sourceQueryUrl = buildNominatimUrl();
  const response = await fetch(sourceQueryUrl, {
    headers: {
      "User-Agent": NOMINATIM_USER_AGENT,
      "Accept-Language": "es",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Nominatim request failed: ${response.status} ${response.statusText}`,
    );
  }
  const payload = await response.json();
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("Nominatim did not return any result for 'Colombia'");
  }
  const colombia = payload[0];
  const multiPolygon = nominatimGeojsonToMultiPolygon(colombia.geojson);
  if (!multiPolygon) {
    throw new Error(
      `Nominatim Colombia entry has no usable polygon (type=${colombia.geojson?.type})`,
    );
  }
  return {
    sourceQueryUrl,
    displayName: colombia.display_name,
    osmType: colombia.osm_type,
    osmId: colombia.osm_id,
    multiPolygon,
  };
}

async function main() {
  if (LAND_ONLY_MODE) {
    // Solo IGAC, sin Nominatim, sin union. Tierra firme oficial pura.
    const igac = await fetchIgac();
    const unionResult = polygonClipping.union(...igac.multiPolygons);
    const polygons = normalizeUnion(unionResult);
    if (polygons.length === 0) {
      throw new Error("Union produced no usable outer rings");
    }
    const bounds = mergeBounds(polygons.map(ringBounds));
    const artifact = {
      metadata: {
        source:
          "IGAC departamentos (tierra firme oficial) — sin mar territorial. Usado por hexClassification para auto-detectar onshore/offshore.",
        sources: {
          land: {
            name: "IGAC limites/limites MapServer layer 2 - Departamentos",
            url: IGAC_SOURCE_URL,
            sourceQueryUrl: igac.sourceQueryUrl,
            query: IGAC_QUERY,
            featureCount: igac.features.length,
          },
        },
        generatedAt: new Date().toISOString(),
        polygonCount: polygons.length,
        bounds,
        minRingArea: MIN_RING_AREA,
        note:
          "Sólo tierra firme IGAC (sin union Nominatim). Re-generable con `node Vento/scripts/generate-igac-boundary.mjs --land-only`.",
      },
      polygons,
    };
    await mkdir(dirname(LAND_OUTPUT_PATH), { recursive: true });
    await writeFile(LAND_OUTPUT_PATH, `${JSON.stringify(artifact)}\n`);
    console.log(
      `Generated ${polygons.length} land-only polygons from IGAC (${igac.features.length} departments) at ${LAND_OUTPUT_PATH}`,
    );
    return;
  }

  const [igac, nominatim] = await Promise.all([fetchIgac(), fetchNominatim()]);

  // Union: IGAC departments (tierra firme oficial) ∪ Nominatim Colombia
  // (silueta incluyendo mar territorial). Resultado: borde a ~22 km offshore
  // con la precisión interna de departamentos del IGAC.
  const allMultiPolygons = [...igac.multiPolygons, nominatim.multiPolygon];
  const unionResult = polygonClipping.union(...allMultiPolygons);
  const polygons = normalizeUnion(unionResult);
  if (polygons.length === 0) {
    throw new Error("Union produced no usable outer rings");
  }

  const bounds = mergeBounds(polygons.map(ringBounds));
  const artifact = {
    metadata: {
      source:
        "Union de IGAC departamentos (tierra firme, oficial) + Nominatim/OSM admin_level=2 Colombia (incluye mar territorial ~22 km offshore)",
      sources: {
        land: {
          name: "IGAC limites/limites MapServer layer 2 - Departamentos",
          url: IGAC_SOURCE_URL,
          sourceQueryUrl: igac.sourceQueryUrl,
          query: IGAC_QUERY,
          featureCount: igac.features.length,
        },
        sea: {
          name: "Nominatim OSM admin_level=2 Colombia (mar territorial)",
          url: NOMINATIM_SOURCE_URL,
          sourceQueryUrl: nominatim.sourceQueryUrl,
          query: NOMINATIM_QUERY,
          osmType: nominatim.osmType,
          osmId: nominatim.osmId,
          displayName: nominatim.displayName,
        },
      },
      generatedAt: new Date().toISOString(),
      polygonCount: polygons.length,
      bounds,
      minRingArea: MIN_RING_AREA,
      note:
        "Tierra firme: IGAC oficial. Mar territorial (~22 km offshore): Nominatim/OSM. Decisión documentada en ADR-014. Re-generable con `node Vento/scripts/generate-igac-boundary.mjs`.",
    },
    polygons,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(artifact)}\n`);

  console.log(
    `Generated ${polygons.length} polygons from union of IGAC (${igac.features.length} departments) + Nominatim Colombia at ${OUTPUT_PATH}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
