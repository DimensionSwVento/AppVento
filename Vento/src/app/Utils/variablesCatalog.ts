/**
 * Catálogo hardcoded de variables del análisis, agrupadas por dimensión.
 * Fuente temporal hasta que el endpoint `GET /api/variables` esté disponible.
 *
 * Las variables **no tienen color propio**: el color del heatmap viene de la
 * paleta GIS vigente (inferno/viridis en `heatmap.ts`), no de la variable.
 * Los pesos signados (aporte aditivo/penalizador) viven en `variableWeights.ts`.
 */

export type DimensionId =
  | "ambiental"
  | "tecnica"
  | "regulatoria"
  | "socioeconomica"
  | "macroeconomica";

export interface Variable {
  id: string;
  dimension: DimensionId;
  label: string;
  description: string;
}

export interface Dimension {
  id: DimensionId;
  label: string;
}

export const DIMENSIONS: Dimension[] = [
  { id: "ambiental", label: "Dimensión ambiental" },
  { id: "tecnica", label: "Dimensión técnica" },
  { id: "regulatoria", label: "Dimensión regulatoria" },
  { id: "socioeconomica", label: "Dimensión socioeconómica" },
  { id: "macroeconomica", label: "Dimensión macroeconómica" },
];

/**
 * Variables hardcoded por dimensión. Cantidad y nombres son placeholder
 * razonable — se reemplazan cuando llegue la lista oficial del cliente o
 * del endpoint backend.
 */
export const VARIABLES: Variable[] = [
  // Ambiental
  { id: "viento-100m", dimension: "ambiental", label: "Velocidad del viento a 100m", description: "Promedio anual de velocidad del viento a 100m de altura" },
  { id: "densidad-energetica", dimension: "ambiental", label: "Densidad energética", description: "Energía disponible por unidad de área barrida del rotor" },
  { id: "exposicion-solar", dimension: "ambiental", label: "Exposición solar", description: "Radiación solar promedio anual sobre el terreno" },
  { id: "humedad-relativa", dimension: "ambiental", label: "Humedad relativa", description: "Humedad promedio relevante para corrosión y eficiencia" },
  // Técnica
  { id: "pendiente-terreno", dimension: "tecnica", label: "Pendiente del terreno", description: "Inclinación promedio del suelo, afecta cimentación" },
  { id: "rugosidad-superficie", dimension: "tecnica", label: "Rugosidad de superficie", description: "Clasificación del suelo según obstáculos y vegetación" },
  { id: "distancia-subestacion", dimension: "tecnica", label: "Distancia a subestación", description: "Proximidad a líneas de transmisión existentes" },
  { id: "accesibilidad-vial", dimension: "tecnica", label: "Accesibilidad vial", description: "Distancia a vías principales para transporte de equipos" },
  // Regulatoria
  { id: "zonas-protegidas", dimension: "regulatoria", label: "Zonas protegidas", description: "Solapamiento con áreas de conservación ambiental" },
  { id: "resguardos-indigenas", dimension: "regulatoria", label: "Resguardos indígenas", description: "Distancia o solapamiento con territorios indígenas" },
  { id: "uso-suelo", dimension: "regulatoria", label: "Uso del suelo permitido", description: "Categoría POT que habilita o restringe el desarrollo eólico" },
  { id: "cigarrillos-ilegales", dimension: "regulatoria", label: "Cigarrillos ilegales", description: "Concentración de actividad ilegal en la zona — penaliza la viabilidad pese a otras variables favorables" },
  // Socioeconómica
  { id: "densidad-poblacional", dimension: "socioeconomica", label: "Densidad poblacional", description: "Número de habitantes por km² en la zona" },
  { id: "nbi", dimension: "socioeconomica", label: "Necesidades básicas insatisfechas", description: "Indicador de pobreza estructural a nivel municipal" },
  { id: "conflictividad", dimension: "socioeconomica", label: "Conflictividad social", description: "Histórico de conflictos sociales o ambientales en la zona" },
  // Macroeconómica
  { id: "pib-departamental", dimension: "macroeconomica", label: "PIB departamental", description: "Producto Interno Bruto del departamento" },
  { id: "inversion-historica", dimension: "macroeconomica", label: "Inversión histórica energética", description: "Inversión pública/privada acumulada en proyectos energéticos" },
  { id: "precio-kwh", dimension: "macroeconomica", label: "Precio del kWh regional", description: "Tarifa promedio de energía eléctrica en la región" },
];

export function variablesByDimension(dim: DimensionId): Variable[] {
  return VARIABLES.filter((v) => v.dimension === dim);
}

export function getVariableById(id: string): Variable | undefined {
  return VARIABLES.find((v) => v.id === id);
}
