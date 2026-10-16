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

// --- Fuente B: h3.parquet — boundary real según celdas H3 ---
// Lee el parquet, convierte cada celda H3 a polígono hexagonal y une todo.
// No se usa Nominatim ni buffer marítimo: el boundary es exactamente lo que
// cubre el parquet, sin más ni menos.

const H3_PARQUET_PATH = resolve("tabla_maestra.h3.parquet"); // ← EDITA AQUÍ si la ruta es distinta

const OUTPUT_PATH = resolve("src/app/Utils/data/colombia-igac-boundary.json");
const LAND_OUTPUT_PATH = resolve(
  "src/app/Utils/data/colombia-igac-land-boundary.json",
);
const MIN_RING_AREA = 0.000001;

const LAND_ONLY_MODE = process.argv.includes("--land-only");

// ---------------------------------------------------------------------------
// Helpers geométricos (sin cambios)
// ---------------------------------------------------------------------------

function buildIgacUrl() {
  const params = new URLSearchParams(IGAC_QUERY);
  return `${IGAC_SOURCE_URL}?${params.toString()}`;
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

function igacFeatureToMultiPolygons(feature) {
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

// ---------------------------------------------------------------------------
// Leer h3.parquet y convertir celdas H3 → MultiPolygons para polygon-clipping
// ---------------------------------------------------------------------------

async function loadH3MultiPolygons(parquetPath) {
  // Usamos Python como subprocess para leer el parquet y volcar
  // los vértices de cada celda H3 en JSON — evita dependencia nativa de parquet en Node.
  const { execSync } = await import("node:child_process");

  const pythonScript = `
import sys, json, pandas as pd, h3

df = pd.read_parquet(r"${parquetPath}")

# Detectar columna H3 automáticamente
col = next(
    (c for c in df.columns if any(k in c.lower() for k in ("h3", "index", "cell"))),
    df.columns[0]
)
sys.stderr.write(f"Columna H3: {col}, filas: {len(df)}\\n")

cells = df[col].dropna().astype(str).unique().tolist()
sys.stderr.write(f"Celdas únicas: {len(cells)}\\n")

# h3.cells_to_geo devuelve GeoJSON geometry (Polygon o MultiPolygon)
geo = h3.cells_to_geo(cells)
print(json.dumps(geo))
`;

  const stdout = execSync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`, {
    maxBuffer: 512 * 1024 * 1024, // 512 MB
  });

  const geo = JSON.parse(stdout.toString());

  // Convertir GeoJSON geometry → formato MultiPolygon de polygon-clipping
  if (geo.type === "Polygon") {
    return [geo.coordinates];
  }
  if (geo.type === "MultiPolygon") {
    return geo.coordinates;
  }
  throw new Error(`Tipo GeoJSON inesperado desde h3.cells_to_geo: ${geo.type}`);
}

// ---------------------------------------------------------------------------
// Fetch IGAC
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (LAND_ONLY_MODE) {
    // Solo IGAC tierra firme, sin h3.parquet
    const igac = await fetchIgac();
    const unionResult = polygonClipping.union(...igac.multiPolygons);
    const polygons = normalizeUnion(unionResult);
    if (polygons.length === 0) throw new Error("Union produced no usable outer rings");

    const bounds = mergeBounds(polygons.map(ringBounds));
    const artifact = {
      metadata: {
        source: "IGAC departamentos (tierra firme oficial) — sin mar territorial.",
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
        note: "Sólo tierra firme IGAC. Re-generable con `node generate-igac-boundary.mjs --land-only`.",
      },
      polygons,
    };
    await mkdir(dirname(LAND_OUTPUT_PATH), { recursive: true });
    await writeFile(LAND_OUTPUT_PATH, `${JSON.stringify(artifact)}\n`);
    console.log(`Generated ${polygons.length} land-only polygons → ${LAND_OUTPUT_PATH}`);
    return;
  }

  // Modo normal: IGAC tierra firme ∪ boundary real del h3.parquet
  console.log("Cargando IGAC...");
  const igac = await fetchIgac();

  console.log(`Leyendo ${H3_PARQUET_PATH} y calculando boundary H3...`);
  const h3MultiPolygon = await loadH3MultiPolygons(H3_PARQUET_PATH);

  console.log("Uniendo IGAC + H3 boundary...");
  const allMultiPolygons = [...igac.multiPolygons, h3MultiPolygon];
  const unionResult = polygonClipping.union(...allMultiPolygons);
  const polygons = normalizeUnion(unionResult);
  if (polygons.length === 0) throw new Error("Union produced no usable outer rings");

  const bounds = mergeBounds(polygons.map(ringBounds));
  const artifact = {
    metadata: {
      source:
        "Union de IGAC departamentos (tierra firme, oficial) + boundary real de celdas H3 del parquet (sin mar territorial fijo)",
      sources: {
        land: {
          name: "IGAC limites/limites MapServer layer 2 - Departamentos",
          url: IGAC_SOURCE_URL,
          sourceQueryUrl: igac.sourceQueryUrl,
          query: IGAC_QUERY,
          featureCount: igac.features.length,
        },
        h3: {
          name: "h3.parquet — boundary derivado de celdas H3",
          path: H3_PARQUET_PATH,
          note: "El boundary marítimo refleja exactamente la cobertura del parquet, no una distancia fija.",
        },
      },
      generatedAt: new Date().toISOString(),
      polygonCount: polygons.length,
      bounds,
      minRingArea: MIN_RING_AREA,
      note: "Re-generable con `node generate-igac-boundary.mjs`.",
    },
    polygons,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(artifact)}\n`);

  console.log(`✅ Generated ${polygons.length} polygons → ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
