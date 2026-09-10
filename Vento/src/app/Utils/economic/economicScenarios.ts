/**
 * Escenarios económicos y series de proyección (US04-02). TEMPLATE determinista
 * hasta que el backend/admin (US08-03) entregue los escenarios y series reales:
 * el emplazamiento del componente no cambia, solo la fuente de `economicSeries`.
 *
 * La dimensión económica NO puntúa el modelo de idoneidad: es apoyo a la toma de
 * decisiones (ver nota en el panel).
 */
export interface EconomicScenario {
  id: string;
  label: string;
  description: string;
}

export const ECONOMIC_SCENARIOS: EconomicScenario[] = [
  {
    id: "base",
    label: "Base",
    description: "Evolución tendencial del mercado según supuestos centrales.",
  },
  {
    id: "optimista",
    label: "Optimista",
    description: "Mayor demanda y precios al alza (transición energética acelerada).",
  },
  {
    id: "conservador",
    label: "Conservador",
    description: "Crecimiento moderado con precios contenidos.",
  },
];

/** Horizontes de proyección seleccionables (años). */
export const PROJECTION_HORIZONS = [5, 10, 15] as const;

/** Año base de las proyecciones (fijo para que el template sea determinista). */
export const BASE_YEAR = 2025;

export interface SeriesPoint {
  year: number;
  value: number;
}

/** Hash estable de una cadena → semilla determinista para el template. */
function seed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Serie de proyección (template) para una variable bajo un escenario y un número
 * de años. Determinista: mismos parámetros → misma serie (no usa Math.random ni
 * fechas). Sustituir por la serie real cuando exista `GET /api/tiles/economico`.
 */
/** Capacidad de referencia (MW) → factor 1×. El escenario de capacidad nominal
 *  escala la magnitud de la proyección proporcionalmente al tamaño del proyecto. */
export const CAPACIDAD_REFERENCIA_MW = 20;

export function economicSeries(
  scenarioId: string,
  varId: string,
  years: number,
  capacidadMW: number = CAPACIDAD_REFERENCIA_MW,
): SeriesPoint[] {
  const s = seed(`${scenarioId}|${varId}`);
  const start = 40 + (s % 40); // 40..79
  const mult =
    scenarioId === "optimista"
      ? 1.06
      : scenarioId === "conservador"
        ? 0.99
        : 1.03;
  const amp = 2 + ((s >> 5) % 5); // 2..6
  // Factor por capacidad nominal (tamaño del proyecto): 20 MW = 1× (referencia).
  // Así el selector de capacidad SÍ altera la proyección (template).
  const factor =
    capacidadMW > 0 ? capacidadMW / CAPACIDAD_REFERENCIA_MW : 1;
  const out: SeriesPoint[] = [];
  let v = start;
  for (let i = 0; i < years; i++) {
    const wobble = amp * Math.sin((i + (s % 5)) * 0.9);
    out.push({
      year: BASE_YEAR + i,
      value: Math.max(0, Math.round((v + wobble) * factor)),
    });
    v = v * mult;
  }
  return out;
}

/** Paleta de series (misma línea viridis/marca). */
export const ECONOMIC_SERIES_COLORS = [
  "#165170",
  "#21918c",
  "#5ec962",
  "#3b528b",
  "#e07a5f",
  "#b5179e",
];
