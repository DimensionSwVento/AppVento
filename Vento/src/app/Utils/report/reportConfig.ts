/**
 * Configuración del informe (US06-03). Define QUÉ incluye el usuario en el
 * informe antes de guardarlo/descargarlo: qué dimensiones puntuables mostrar,
 * el tipo de gráfico de los scores y qué secciones/bloques aparecen. La misma
 * config gobierna la previsualización, el PDF (US06-04) y lo guardado al
 * histórico (una sola fuente de verdad → previsualización === PDF).
 */
export type ReportChartType = "radar" | "pie" | "bar";

export interface ReportConfig {
  /** Dimensiones PUNTUABLES activas en el informe (por id de dimensión). */
  dims: Record<string, boolean>;
  /** Tipo de gráfico para los puntajes por dimensión. */
  chartType: ReportChartType;
  /** Captura del mapa con color de idoneidad. */
  showMap: boolean;
  /** Detalle de las variables que entran al puntaje (label + score). */
  showScoreDetail: boolean;
  /** Ranking de variables que más influyen en el resultado. */
  showInfluencers: boolean;
  /** Detalle técnico del modelo: dimensión→criterio→variable + cálculo. */
  showModelDetail: boolean;
  /** Variables informativas seleccionadas. */
  showInformative: boolean;
  /** Detalle de variables excluyentes (restricciones duras). */
  showExcluyentes: boolean;
  /** Bloque Regulatoria (informativa). */
  showRegulatoria: boolean;
  /**
   * Bloque Económica (informativa). NOTA: el disparador real de la sección es
   * `econ.addToReport` (checkbox "incluir en informe" de la modal económica).
   * Este flag queda como espejo en la config del informe — ver `showEconomica`
   * cableado en Report.tsx (gate `config.showEconomica && econ.addToReport`).
   */
  showEconomica: boolean;
  /** Tabla de fuentes de datos, discriminadas por dimensión. */
  showSources: boolean;
}

/**
 * Config por defecto (CA3): dimensiones puntuables activas, radar, y las
 * secciones habituales encendidas. El detalle técnico del modelo queda
 * apagado (opt-in "conocer el detalle interno del modelo"). `hasEconomica`
 * enciende la económica por defecto solo si fue activada antes.
 */
export function defaultReportConfig(
  scorableDimIds: string[],
  opts: { hasEconomica?: boolean } = {},
): ReportConfig {
  const dims: Record<string, boolean> = {};
  for (const id of scorableDimIds) dims[id] = true;
  return {
    dims,
    chartType: "radar",
    showMap: true,
    showScoreDetail: true,
    showInfluencers: true,
    showModelDetail: false,
    showInformative: true,
    showExcluyentes: true,
    showRegulatoria: true,
    showEconomica: opts.hasEconomica ?? true,
    showSources: true,
  };
}
