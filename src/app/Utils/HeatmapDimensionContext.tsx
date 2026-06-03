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
  | "economica"
  | "socioeconomica"
  | "regulatoria";

export const HEATMAP_DIMENSIONS: { id: HeatmapDimensionId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "ambiental", label: "Ambiental" },
  { id: "tecnica", label: "Técnica" },
  { id: "economica", label: "Económica" },
  { id: "socioeconomica", label: "Socioeconómica" },
  { id: "regulatoria", label: "Regulatoria" },
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
  const [activeDimension, setActiveDimension] =
    useState<HeatmapDimensionId | null>(null);

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
