"use client";
import { useMemo } from "react";
import { useSelectionScores, type SelectionScores } from "./useSelectionScores";
import { useAreaHexData } from "./useAreaHexData";
import { USE_PLACEHOLDER_FALLBACK } from "../projectData";

/** Categoría del backend (prefijo de variable) → id de dimensión del frontend. */
const CAT_TO_DIM: Record<string, string> = {
  TEC: "tecnica",
  AMB: "ambiental",
  SOE: "social",
  SOC: "social",
  MAC: "macroeconomica",
  REG: "regulatoria",
};

/**
 * Puntajes agregados del área seleccionada (general + por dimensión, 0–100).
 *
 * Usa los datos reales del backend (`useAreaHexData`) y agrega sobre los hexes;
 * si el backend no responde / no hay datos, **cae al placeholder local**
 * (`useSelectionScores`). Así el informe funciona con o sin backend.
 */
export function useAreaScores(selectedHexes: Set<string>): SelectionScores {
  const placeholder = useSelectionScores(selectedHexes);
  const areaData = useAreaHexData(selectedHexes, true);

  return useMemo(() => {
    if (!areaData || areaData.size === 0) {
      // Sin datos del backend: placeholder (si está habilitado) o ceros (prod).
      return USE_PLACEHOLDER_FALLBACK ? placeholder : { general: 0, byDim: {} };
    }

    let genSum = 0;
    const dimSums: Record<string, { sum: number; n: number }> = {};
    for (const info of areaData.values()) {
      genSum += info.score_general ?? 0;
      for (const [cat, val] of Object.entries(info.scores ?? {})) {
        const dim = CAT_TO_DIM[cat];
        if (!dim || typeof val !== "number") continue;
        (dimSums[dim] ??= { sum: 0, n: 0 });
        dimSums[dim].sum += val;
        dimSums[dim].n += 1;
      }
    }

    const byDim: Record<string, number> = {};
    for (const [dim, { sum, n }] of Object.entries(dimSums)) {
      byDim[dim] = (sum / n) * 100;
    }
    return { general: (genSum / areaData.size) * 100, byDim };
  }, [areaData, placeholder]);
}
