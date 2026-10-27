"use client";
import { useMemo } from "react";
import { dimensionScore, generalScore } from "./heatmapPalette";
import {
  HEATMAP_DIMENSIONS,
} from "../contexts/HeatmapDimensionContext";

export type SelectionScores = {
  general: number;
  byDim: Record<string, number>;
};

/**
 * Puntajes agregados (general + por dimensión) del área seleccionada.
 *
 * Fuente ÚNICA: se calcula una sola vez (memoizado por el set de hexes) y lo
 * comparten las barras, el radar (US06-01) y, a futuro, el snapshot del
 * histórico (US07). Evita recalcular la misma cosa en varios componentes.
 */
export function useSelectionScores(selectedHexes: Set<string>): SelectionScores {
  return useMemo(() => {
    if (selectedHexes.size === 0) return { general: 0, byDim: {} };
    const byDim: Record<string, number> = {};
    for (const d of HEATMAP_DIMENSIONS) {
      if (d.id === "general") continue;
      byDim[d.id] = parseFloat(dimensionScore(d.id, selectedHexes));
    }
    return { general: parseFloat(generalScore(selectedHexes)), byDim };
  }, [selectedHexes]);
}
