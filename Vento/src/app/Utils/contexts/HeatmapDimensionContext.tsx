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
  | "regulatoria"
  // Recurso eólico (viento): NO son dimensiones puntuables — son variables del
  // modelo (`heat`) que el usuario puede visualizar como mapa de calor desde el
  // MISMO desplegable, en Informe, recortadas al área seleccionada. Se listan
  // aparte (`HEATMAP_WIND_OPTIONS`) para NO contaminar scores/radar/tooltip.
  | "velocidad-viento"
  | "densidad-viento";

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
  // Económica y Regulatoria son INFORMATIVAS (no puntúan) → scorable: false.
  { id: "macroeconomica", label: "económica", scorable: false },
  { id: "regulatoria", label: "Regulatoria", scorable: false },
];

/**
 * Opciones de VIENTO del desplegable "Visualización en el mapa" (Informe).
 * Son variables del modelo (`heat`), NO dimensiones: por eso van fuera de
 * `HEATMAP_DIMENSIONS` (que alimenta scores, radar, tooltip y Report). Sus ids
 * coinciden con el catálogo/`mapSymbols` para reusar `fetchWindCells`/
 * `windValueForHex`. El heatmap se pinta con el pipeline del Informe → recortado
 * al área seleccionada (instrucción cliente Sprint 4).
 */
export const HEATMAP_WIND_OPTIONS: { id: HeatmapDimensionId; label: string }[] =
  [
    { id: "velocidad-viento", label: "Velocidad del viento" },
    { id: "densidad-viento", label: "Densidad de viento" },
  ];

/** ¿El id activo es una capa de viento (no una dimensión puntuable)? */
export function isWindHeatmap(id: HeatmapDimensionId | null): boolean {
  return id === "velocidad-viento" || id === "densidad-viento";
}

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
