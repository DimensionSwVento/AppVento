// import { readFileSync } from "fs";
// import { parquetRead } from "hyparquet";
// NOTA: hyparquet deshabilitado — solo se usa en las API routes de tiles/hexagons
// que se conectarán al backend FastAPI. Habilitar cuando se restaure la API local.

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

// parseH3Parquet deshabilitado — requiere hyparquet
// export default async function parseH3Parquet(filePath: string): Promise<H3DataSet> { ... }
