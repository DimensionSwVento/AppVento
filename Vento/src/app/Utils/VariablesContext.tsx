"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DimensionId, VARIABLES, variablesByDimension } from "./variablesCatalog";

interface VariablesContextValue {
  /** Set de IDs de variables activas (multi-selección). El heatmap del mapa agrega
   *  sus scores ponderados por polaridad (aditivas suman, penalizadoras restan). */
  activeVariables: Set<string>;
  toggleVariable: (id: string) => void;
  isActive: (id: string) => boolean;
  activeCountByDimension: (dim: DimensionId) => number;
  totalByDimension: (dim: DimensionId) => number;
  totalActive: number;
  totalVariables: number;
}

const noopContext: VariablesContextValue = {
  activeVariables: new Set(),
  toggleVariable: () => {},
  isActive: () => false,
  activeCountByDimension: () => 0,
  totalByDimension: (dim) => variablesByDimension(dim).length,
  totalActive: 0,
  totalVariables: VARIABLES.length,
};

const VariablesContext = createContext<VariablesContextValue>(noopContext);

export function useVariables() {
  return useContext(VariablesContext);
}

export function VariablesProvider({ children }: { children: React.ReactNode }) {
  const [activeVariables, setActiveVariables] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleVariable = useCallback((id: string) => {
    setActiveVariables((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isActive = useCallback(
    (id: string) => activeVariables.has(id),
    [activeVariables],
  );

  const activeCountByDimension = useCallback(
    (dim: DimensionId) =>
      variablesByDimension(dim).reduce(
        (acc, v) => acc + (activeVariables.has(v.id) ? 1 : 0),
        0,
      ),
    [activeVariables],
  );

  const value = useMemo<VariablesContextValue>(
    () => ({
      activeVariables,
      toggleVariable,
      isActive,
      activeCountByDimension,
      totalByDimension: (dim) => variablesByDimension(dim).length,
      totalActive: activeVariables.size,
      totalVariables: VARIABLES.length,
    }),
    [activeVariables, toggleVariable, isActive, activeCountByDimension],
  );

  return (
    <VariablesContext.Provider value={value}>
      {children}
    </VariablesContext.Provider>
  );
}
