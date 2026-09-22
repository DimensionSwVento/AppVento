"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DimensionId,
  OPTIONAL_VARIABLES,
  getVariableById,
  modelVariableIds,
  optionalVariablesByDimension,
} from "../variables/variablesCatalog";
import { hydrateCatalog } from "../admin/catalogApi";

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
  /** true cuando el catálogo ya se hidrató desde el DB (backend). Cambia la
   *  identidad del value → los consumidores re-leen la lista viva. */
  catalogReady: boolean;
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
  catalogReady: false,
};

const VariablesContext = createContext<VariablesContextValue>(noopContext);

export function useVariables() {
  return useContext(VariablesContext);
}

export function VariablesProvider({ children }: { children: React.ReactNode }) {
  // Las variables obligatorias arrancan activas y no se pueden apagar.
  const [activeVariables, setActiveVariables] = useState<Set<string>>(
    () => new Set(modelVariableIds()),
  );
  // Se pone true cuando el catálogo VIVO del DB ya reemplazó al estático → fuerza
  // un re-render para que informe/menú/mapa lean la lista real (no la hardcodeada).
  const [catalogReady, setCatalogReady] = useState(false);

  // Hidrata el CATÁLOGO real desde BD (modo backend): reconstruye la lista de
  // variables (modelo + informativas) con sus códigos/pesos reales; el estático
  // queda solo como template. Si el back falla, se LOGUEA (no se silencia → no
  // mezclar template como si fuera real). setState en callback async → ok.
  useEffect(() => {
    hydrateCatalog()
      .then(() => setCatalogReady(true))
      .catch((e) =>
        console.error("[VENTO] hidratación de catálogo falló:", e),
      );
  }, []);

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
    setActiveVariables(new Set(modelVariableIds()));
  }, []);

  const replaceActiveVariables = useCallback((ids: string[]) => {
    setActiveVariables(new Set([...modelVariableIds(), ...ids]));
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
      catalogReady,
    }),
    [
      activeVariables,
      toggleVariable,
      isActive,
      activeCountByDimension,
      clearNonRequired,
      replaceActiveVariables,
      catalogReady,
    ],
  );

  return (
    <VariablesContext.Provider value={value}>
      {children}
    </VariablesContext.Provider>
  );
}
