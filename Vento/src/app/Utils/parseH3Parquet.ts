import { readFileSync } from "fs";
import { parquetRead } from "hyparquet";

export interface H3HexagonData {
  h3_index: string;
  score_general: number;
  tipo_celda: string;
  variables: Record<string, number>;
  metadata?: Record<string, string>;
}

export interface H3DataSet {
  hexagons: H3HexagonData[];
  totalCount: number;
  parsedAt: string;
}

// columnas mínimas para renderizar el mapa
const MAP_COLUMNS = ["h3_index", "hex_id", "score_general", "score", "tipo_celda", "cell_type"];

/**
 * Parsea un archivo .h3.parquet y retorna solo los datos necesarios para el mapa.
 * Lee únicamente las columnas esenciales para evitar saturar memoria con un archivo de 126MB.
 */
export default async function parseH3Parquet(
  filePath: string
): Promise<H3DataSet> {
  const buffer = readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );

  let rows: Record<string, unknown>[] = [];

  await parquetRead({
    file: arrayBuffer,
    columns: MAP_COLUMNS,
    rowFormat: "object",
    onComplete: (data: Record<string, unknown>[]) => {
      rows = data;
    },
  });

  const hexagons: H3HexagonData[] = rows.map((row) => ({
    h3_index: String(row.h3_index ?? row.hex_id ?? ""),
    score_general: Number(row.score_general ?? row.score ?? 0),
    tipo_celda: String(row.tipo_celda ?? row.cell_type ?? "activa"),
    variables: {},
  }));

  return {
    hexagons,
    totalCount: hexagons.length,
    parsedAt: new Date().toISOString(),
  };
}
