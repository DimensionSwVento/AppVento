import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import polygonClipping from "polygon-clipping";

const SOURCE_URL =
  "https://mapas2.igac.gov.co/server/rest/services/limites/limites/MapServer/2/query";

const QUERY = {
  where: "1=1",
  outFields: "DeCodigo,DeNombre",
  returnGeometry: "true",
  outSR: "4326",
  geometryPrecision: "5",
  maxAllowableOffset: "0.001",
  f: "json",
};

const OUTPUT_PATH = resolve(
  "src/app/Utils/data/colombia-igac-boundary.json",
);
const MIN_RING_AREA = 0.000001;

function buildUrl() {
  const params = new URLSearchParams(QUERY);
  return `${SOURCE_URL}?${params.toString()}`;
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

function featureToMultiPolygon(feature) {
  const rings = feature.geometry?.rings ?? [];
  return rings
    .map((ring) => closeRing(ring))
    .filter((ring) => ring.length >= 4)
    .map((ring) => [[ring]]);
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

async function main() {
  const sourceQueryUrl = buildUrl();
  const response = await fetch(sourceQueryUrl);
  if (!response.ok) {
    throw new Error(`IGAC request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const features = payload.features ?? [];
  if (features.length === 0) {
    throw new Error("IGAC response did not include polygon features");
  }

  const multiPolygons = features.flatMap(featureToMultiPolygon);
  const unionResult = polygonClipping.union(...multiPolygons);
  const polygons = normalizeUnion(unionResult);
  if (polygons.length === 0) {
    throw new Error("IGAC polygon union produced no usable outer rings");
  }

  const bounds = mergeBounds(polygons.map(ringBounds));
  const artifact = {
    metadata: {
      source: "IGAC limites/limites MapServer layer 2 - Departamentos",
      sourceUrl: SOURCE_URL,
      sourceQueryUrl,
      generatedAt: new Date().toISOString(),
      query: QUERY,
      featureCount: features.length,
      polygonCount: polygons.length,
      bounds,
      minRingArea: MIN_RING_AREA,
      note:
        "Generated from official IGAC department polygons, dissolved with polygon-clipping, EPSG:4326 [lng, lat].",
    },
    polygons,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(artifact)}\n`);

  console.log(
    `Generated ${polygons.length} IGAC polygons from ${features.length} features at ${OUTPUT_PATH}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
