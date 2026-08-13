"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/**
 * Dimensiones (puntajes) que el heatmap del informe puede visualizar.
 * Una sola activa a la vez — comportamiento radio/mutex.
 */
export type HeatmapDimensionId =
  | "general"
  | "ambiental"
  | "tecnica"
  | "social"
  | "macroeconomica"
  | "regulatoria";

/**
 * `scorable`: si la dimensión puntúa en el modelo (WLC). "Regulatoria" es
 * informativa (US-FB3-05 / feedback item 11) → `scorable: false`. Coherente
 * con `SCORABLE_DIMENSION_IDS` de variablesCatalog. "general" es el agregado
 * de las puntuables, por eso cuenta como puntuable a efectos de UI.
 */
export const HEATMAP_DIMENSIONS: {
  id: HeatmapDimensionId;
  label: string;
  scorable: boolean;
}[] = [
  { id: "general", label: "General", scorable: true },
  { id: "ambiental", label: "Ambiental", scorable: true },
  { id: "tecnica", label: "Técnica", scorable: true },
  { id: "social", label: "Social", scorable: true },
  { id: "macroeconomica", label: "económica", scorable: true },
  { id: "regulatoria", label: "Regulatoria", scorable: false },
];

interface HeatmapDimensionContextValue {
  activeDimension: HeatmapDimensionId | null;
  /**
   * Toggle radio-style: activar una dimensión desactiva la anterior.
   * Si la misma dimensión está activa, vuelve a `null` (apaga el heatmap).
   */
  toggleDimension: (id: HeatmapDimensionId) => void;
  setActiveDimension: (id: HeatmapDimensionId | null) => void;
}

const noopContext: HeatmapDimensionContextValue = {
  activeDimension: null,
  toggleDimension: () => {},
  setActiveDimension: () => {},
};

const HeatmapDimensionContext =
  createContext<HeatmapDimensionContextValue>(noopContext);

export function useHeatmapDimension() {
  return useContext(HeatmapDimensionContext);
}

export function HeatmapDimensionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Arranca con "general" para que el heatmap esté siempre visible al
  // entrar a Informe. El usuario puede cambiar a otra dimensión, pero no
  // hay opción "sin visualización".
  const [activeDimension, setActiveDimension] =
    useState<HeatmapDimensionId | null>("general");

  const toggleDimension = useCallback((id: HeatmapDimensionId) => {
    setActiveDimension((prev) => (prev === id ? null : id));
  }, []);

  const value = useMemo<HeatmapDimensionContextValue>(
    () => ({ activeDimension, toggleDimension, setActiveDimension }),
    [activeDimension, toggleDimension],
  );

  return (
    <HeatmapDimensionContext.Provider value={value}>
      {children}
    </HeatmapDimensionContext.Provider>
  );
}
