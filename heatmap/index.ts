/**
 * Punto de entrada del módulo `heatmap`.
 *
 * Esta carpeta es **autocontenida**: sólo depende de:
 *  - libs externas (h3-js, @deck.gl/layers, React)
 *  - `../Utils/variableWeights` (peso signado por variable)
 *
 * Está pensada para copiarse a la rama de previsualización del informe (US06)
 * sin necesidad de arrastrar el resto del subsistema E4. La rama destino debe
 * disponer de `variableWeights` (o un equivalente con la misma forma).
 */
export {
  HEATMAP_RES,
  aggregateScore,
  colorForScore,
  expandToRes8,
  scoreFor,
  INFERNO_STOPS,
  VIRIDIS_STOPS,
  type Palette,
} from "./heatmap";
export { buildHeatmapLayer } from "./HeatmapLayer";
export { default as PaletteToggle } from "./PaletteToggle";
export { default as HeatmapLegend } from "./HeatmapLegend";
