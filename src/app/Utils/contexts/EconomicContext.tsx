"use client";

/**
 * Estado de la dimensión económica (US04-02) compartido entre el panel (fase
 * Dimensiones) y el informe (fase Informe): escenario elegido, horizonte de
 * proyección, qué variables se ocultan de la gráfica, y si la sección económica
 * se agrega al informe/PDF.
 */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ECONOMIC_SCENARIOS,
  PROJECTION_HORIZONS,
} from "../economic/economicScenarios";
import { useVariables } from "./VariablesContext";
import {
  getVariableById,
  type Variable,
} from "../variables/variablesCatalog";

interface EconomicContextValue {
  /** Escenario de capacidad nominal del proyecto (MW). */
  capacidadNominal: number;
  setCapacidadNominal: (mw: number) => void;
  escenarioId: string;
  setEscenario: (id: string) => void;
  horizonYears: number;
  setHorizonYears: (n: number) => void;
  /** Variables económicas OCULTAS de la gráfica (por defecto se muestran todas). */
  chartHidden: Set<string>;
  toggleChartVar: (id: string) => void;
  /** Mostrar todas las variables en la gráfica (limpia las ocultas). */
  showAllChartVars: () => void;
  /** Modo "comparar escenarios" (superpone base/optimista/conservador). */
  compareMode: boolean;
  setCompareMode: (b: boolean) => void;
  /** Incluir la sección económica en el informe/PDF (CA4). */
  addToReport: boolean;
  setAddToReport: (b: boolean) => void;
  /** Restablece la configuración económica a los valores por defecto. */
  reset: () => void;
}

/** Capacidades nominales seleccionables (MW). */
export const CAPACIDADES_NOMINALES = [0, 10, 20, 50, 100];

const EconomicContext = createContext<EconomicContextValue | null>(null);

export function EconomicProvider({ children }: { children: ReactNode }) {
  const [capacidadNominal, setCapacidadNominal] = useState(20);
  const [escenarioId, setEscenario] = useState(ECONOMIC_SCENARIOS[0].id);
  const [horizonYears, setHorizonYears] = useState<number>(PROJECTION_HORIZONS[1]);
  const [chartHidden, setChartHidden] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);
  // Por defecto la económica se agrega al informe si el usuario activó variables
  // económicas (CA3: preconfiguración por defecto si fue activada antes).
  const [addToReport, setAddToReport] = useState(true);

  const toggleChartVar = (id: string) =>
    setChartHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const showAllChartVars = () => setChartHidden(new Set());
  const reset = () => {
    setCapacidadNominal(20);
    setEscenario(ECONOMIC_SCENARIOS[0].id);
    setHorizonYears(PROJECTION_HORIZONS[1]);
    setChartHidden(new Set());
    setCompareMode(false);
    setAddToReport(true);
  };

  const value = useMemo<EconomicContextValue>(
    () => ({
      capacidadNominal,
      setCapacidadNominal,
      escenarioId,
      setEscenario,
      horizonYears,
      setHorizonYears,
      chartHidden,
      toggleChartVar,
      showAllChartVars,
      compareMode,
      setCompareMode,
      addToReport,
      setAddToReport,
      reset,
    }),
    [capacidadNominal, escenarioId, horizonYears, chartHidden, compareMode, addToReport],
  );

  return (
    <EconomicContext.Provider value={value}>{children}</EconomicContext.Provider>
  );
}

export function useEconomic(): EconomicContextValue {
  const ctx = useContext(EconomicContext);
  if (!ctx)
    throw new Error("useEconomic debe usarse dentro de <EconomicProvider>");
  return ctx;
}

/** Variables económicas activas (dimensión macroeconómica) seleccionadas. */
export function useActiveEconomicVariables(): Variable[] {
  const { activeVariables } = useVariables();
  return useMemo(
    () =>
      [...activeVariables]
        .map((id) => getVariableById(id))
        .filter((v): v is Variable => !!v && v.dimension === "macroeconomica"),
    [activeVariables],
  );
}
