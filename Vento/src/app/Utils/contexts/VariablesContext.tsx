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
  isHeatVariable,
  modelVariableIds,
  requiredVariableIds,
  optionalVariablesByDimension,
} from "../variables/variablesCatalog";
import { hydrateCatalog } from "../admin/catalogApi";

interface VariablesContextValue {
  /** Set de IDs de variables activas (multi-selección). El heatmap del mapa agrega
   *  sus scores ponderados por polaridad (aditivas suman, penalizadoras restan). */
  activeVariables: Set<string>;
  toggleVariable: (id: string) => void;
  isActive: (id: string) => boolean;
  /** IDs que el usuario eligió VER EN EL MAPA (opt-in, independiente de la selección
   *  del modelo). Incluye variables del modelo (no se esconden: se pueden mostrar). */
  shownOnMap: Set<string>;
  toggleShownOnMap: (id: string) => void;
  isShownOnMap: (id: string) => boolean;
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
  shownOnMap: new Set(),
  toggleShownOnMap: () => {},
  isShownOnMap: () => false,
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
    () => new Set([...modelVariableIds(), ...requiredVariableIds()]),
  );
  // Se pone true cuando el catálogo VIVO del DB ya reemplazó al estático → fuerza
  // un re-render para que informe/menú/mapa lean la lista real (no la hardcodeada).
  const [catalogReady, setCatalogReady] = useState(false);
  // "Ver en el mapa": opt-in por variable, INDEPENDIENTE de la selección del modelo.
  // Arranca vacío (nada encendido por defecto). Las del modelo también pueden
  // mostrarse en el mapa (no se esconden). Lo lee el mapa (capas de variable).
  const [shownOnMap, setShownOnMap] = useState<Set<string>>(() => new Set());

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

  // Tras hidratar desde BD, `VARIABLES` se reemplazó con la lista VIVA (ids/pesos
  // reales). El seed inicial de `activeVariables` usó los ids ESTÁTICOS, así que
  // las del MODELO del DB (cuyo id pudo cambiar) podían quedar apagadas. Se
  // re-siembran haciendo MERGE con la selección actual (no pisa lo que el usuario
  // tocó): garantiza que las obligatorias/del modelo arranquen activas con el
  // catálogo real. Ver #8 (obligatorias desactivadas en prod).
  useEffect(() => {
    if (!catalogReady) return;
    // Semilla legítima al hidratar el catálogo (merge, no pisa la selección del
    // usuario) — mismo patrón que el resto de effects de carga del proyecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveVariables(
      (prev) =>
        new Set([...modelVariableIds(), ...requiredVariableIds(), ...prev]),
    );
  }, [catalogReady]);

  const toggleVariable = useCallback((id: string) => {
    const v = getVariableById(id);
    // Variables obligatorias no se pueden desactivar; tampoco re-activar (no-op).
    if (v?.required) return;
    setActiveVariables((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // #7.3: la SELECCIÓN de variables es aditiva — se puede tener varias de
        // calor activas a la vez (p.ej. velocidad + densidad del viento). Antes
        // activar una de calor apagaba las otras, lo que las quitaba también del
        // resumen/informe. La restricción de "un solo mapa de calor a la vez" NO
        // va aquí: la impone el control de capas del mapa ("Visualización en el
        // mapa", single-select), que pinta una sola capa aunque haya varias
        // seleccionadas. Ver HeatmapDimensionSwitches.
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearNonRequired = useCallback(() => {
    setActiveVariables(new Set([...modelVariableIds(), ...requiredVariableIds()]));
  }, []);

  const replaceActiveVariables = useCallback((ids: string[]) => {
    setActiveVariables(
      new Set([...modelVariableIds(), ...requiredVariableIds(), ...ids]),
    );
  }, []);

  const isActive = useCallback(
    // Garantía dura: una variable OBLIGATORIA (required) está SIEMPRE activa,
    // independientemente del set (que puede quedar desincronizado tras hidratar
    // con ids nuevos). Evita que una obligatoria aparezca desactivada (bug prod).
    (id: string) => getVariableById(id)?.required === true || activeVariables.has(id),
    [activeVariables],
  );

  // "Ver en el mapa": togglea libremente (también variables del modelo). Una sola
  // CAPA DE CALOR a la vez en el mapa (radio): al prender una de calor, apaga las
  // otras de calor (las de área/escala se acumulan). Era la lógica de `toggleDimLayer`.
  const toggleShownOnMap = useCallback((id: string) => {
    setShownOnMap((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (isHeatVariable(id)) {
        for (const other of [...next]) if (isHeatVariable(other)) next.delete(other);
      }
      next.add(id);
      return next;
    });
  }, []);
  const isShownOnMap = useCallback(
    (id: string) => shownOnMap.has(id),
    [shownOnMap],
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
      shownOnMap,
      toggleShownOnMap,
      isShownOnMap,
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
      shownOnMap,
      toggleShownOnMap,
      isShownOnMap,
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
