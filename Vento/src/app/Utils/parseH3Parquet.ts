import { readFileSync } from "fs";
import { parquetRead } from "hyparquet";

export interface H3HexagonData {
  h3_index: string;
  score_general: number;
  tipo_celda: string;
  variables: Record<string, string | number | null>;
}

export interface H3DataSet {
  hexagons: H3HexagonData[];
  totalCount: number;
  parsedAt: string;
  variableNames: string[];
}

const IGNORE_COLUMNS = new Set([
  "h3_index", "hex_id", "score_general", "score", "tipo_celda", "cell_type",
]);
const IGNORE_PREFIXES = ["divipola_csv", "lat_lon_csv", "municipios_csv"];

function shouldIgnore(col: string): boolean {
  if (IGNORE_COLUMNS.has(col)) return true;
  return IGNORE_PREFIXES.some((p) => col.startsWith(p));
}

const VARIABLE_LABELS: Record<string, string> = {
  "001_velocidad_de_viento": "Velocidad de Viento (m/s)",
  "004_densidad_energ": "Densidad Energética Eólica (W/m²)",
  "009_profundidad_roca": "Profundidad de Roca",
  "soc_022_sr": "Zonas Reserva Campesina (ha)",
  "soc_025_er": "Cigarrillos Ilegales (%)",
};

export function getVariableLabel(colName: string): string {
  for (const [prefix, label] of Object.entries(VARIABLE_LABELS)) {
    if (colName.startsWith(prefix)) return label;
  }
  const parts = colName.split("/");
  return parts[0].replace(/_/g, " ");
}

export default async function parseH3Parquet(
  filePath: string
): Promise<H3DataSet> {
  console.time("[PARQUET] lectura");
  const buffer = readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );

  let rows: Record<string, unknown>[] = [];
  await parquetRead({
    file: arrayBuffer,
    rowFormat: "object",
    onComplete: (data: Record<string, unknown>[]) => {
      rows = data;
    },
  });
  console.timeEnd("[PARQUET] lectura");
  console.log(`[PARQUET] filas: ${rows.length}`);

  const variableNames: string[] = [];
  if (rows.length > 0) {
    for (const key of Object.keys(rows[0])) {
      if (!shouldIgnore(key)) variableNames.push(key);
    }
  }

  const hexagons: H3HexagonData[] = rows.map((row) => {
    const variables: Record<string, string | number | null> = {};
    for (const col of variableNames) {
      const val = row[col];
      if (val === null || val === undefined) {
        variables[col] = null;
      } else if (typeof val === "number") {
        variables[col] = val;
      } else {
        variables[col] = String(val);
      }
    }
    return {
      h3_index: String(row.h3_index ?? row.hex_id ?? ""),
      score_general: Number(row.score_general ?? row.score ?? 0),
      tipo_celda: String(row.tipo_celda ?? row.cell_type ?? "activa"),
      variables,
    };
  });

  return {
    hexagons,
    totalCount: hexagons.length,
    parsedAt: new Date().toISOString(),
    variableNames,
  };
}
