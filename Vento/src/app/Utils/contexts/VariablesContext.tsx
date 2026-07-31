"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  DimensionId,
  OPTIONAL_VARIABLES,
  getVariableById,
  requiredVariableIds,
  optionalVariablesByDimension,
} from "../variables/variablesCatalog";

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
  /** Vacía la selección de variables NO obligatorias. Las obligatorias permanecen activas. */
  clearNonRequired: () => void;
  /** Reemplaza la selección activa (usado al restaurar un informe del histórico).
   *  Las obligatorias siempre quedan incluidas. */
  replaceActiveVariables: (ids: string[]) => void;
}

const noopContext: VariablesContextValue = {
  activeVariables: new Set(),
  toggleVariable: () => {},
  isActive: () => false,
  activeCountByDimension: () => 0,
  totalByDimension: (dim) => optionalVariablesByDimension(dim).length,
  totalActive: 0,
  totalVariables: OPTIONAL_VARIABLES.length,
  clearNonRequired: () => {},
  replaceActiveVariables: () => {},
};

const VariablesContext = createContext<VariablesContextValue>(noopContext);

export function useVariables() {
  return useContext(VariablesContext);
}

export function VariablesProvider({ children }: { children: React.ReactNode }) {
  // Las variables obligatorias arrancan activas y no se pueden apagar.
  const [activeVariables, setActiveVariables] = useState<Set<string>>(
    () => new Set(requiredVariableIds()),
  );

  const toggleVariable = useCallback((id: string) => {
    const v = getVariableById(id);
    // Variables obligatorias no se pueden desactivar; tampoco re-activar (no-op).
    if (v?.required) return;
    setActiveVariables((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearNonRequired = useCallback(() => {
    setActiveVariables(new Set(requiredVariableIds()));
  }, []);

  const replaceActiveVariables = useCallback((ids: string[]) => {
    setActiveVariables(new Set([...requiredVariableIds(), ...ids]));
  }, []);

  const isActive = useCallback(
    (id: string) => activeVariables.has(id),
    [activeVariables],
  );

  const activeCountByDimension = useCallback(
    (dim: DimensionId) =>
      optionalVariablesByDimension(dim).reduce(
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
      totalByDimension: (dim) => optionalVariablesByDimension(dim).length,
      totalActive: activeVariables.size,
      totalVariables: OPTIONAL_VARIABLES.length,
      clearNonRequired,
      replaceActiveVariables,
    }),
    [
      activeVariables,
      toggleVariable,
      isActive,
      activeCountByDimension,
      clearNonRequired,
      replaceActiveVariables,
    ],
  );

  return (
    <VariablesContext.Provider value={value}>
      {children}
    </VariablesContext.Provider>
  );
}
