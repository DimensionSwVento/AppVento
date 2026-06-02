import { PolygonLayer } from "@deck.gl/layers";
import { cellToBoundary } from "h3-js";
import { aggregateScore, colorForScore, expandToRes8, type Palette } from "./heatmap";

interface HexCell {
  h: string;
}

/**
 * Construye la PolygonLayer del heatmap clippeado a la selección.
 * Retorna `null` cuando no hay variables activas o no hay selección.
 *
 * Diseñada para vivir en la rama de previsualización del informe (US06): el
 * heatmap final del proyecto se renderiza ahí, no en la fase Dimensiones.
 */
export function buildHeatmapLayer(
  selectedHexes: Set<string>,
  activeVariables: Set<string>,
  palette: Palette,
) {
  if (activeVariables.size === 0 || selectedHexes.size === 0) return null;
  const data: HexCell[] = expandToRes8(selectedHexes).map((h) => ({ h }));
  return new PolygonLayer<HexCell>({
    id: "variable-heatmap",
    data,
    getPolygon: (d) => cellToBoundary(d.h, true),
    getFillColor: (d) =>
      colorForScore(aggregateScore(activeVariables, d.h), palette),
    filled: true,
    stroked: false,
    pickable: false,
    updateTriggers: { getFillColor: [activeVariables, palette] },
  });
}
