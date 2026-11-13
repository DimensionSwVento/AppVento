"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReportConfig } from "../report/reportConfig";

export type Aprincipal =
  | "seleccion-area"
  | "dimensiones"
  | "caracteristicas"
  | "informe"
  | "historico"
  | null;

// Orden del flujo guiado (para rastrear la fase más avanzada alcanzada).
const FLOW_ORDER: Aprincipal[] = [
  "seleccion-area",
  "caracteristicas",
  "dimensiones",
  "informe",
];

interface AprincipalContext {
  accion: Aprincipal;
  setAccion: (accion: Aprincipal) => void;
  selectedHexes: Set<string>;
  setSelectedHexes: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** Índice (0..3) de la fase más avanzada alcanzada. Habilita atajos: si ya
   *  se llegó a informe, se puede saltar libremente entre fases. */
  maxFaseIdx: number;
  /** Contador que, al incrementarse, pide al mapa reencuadrar la selección
   *  (mismo efecto que el botón de enfoque). Útil al abrir un informe guardado. */
  focusNonce: number;
  /** Solicita al mapa encuadrar la selección actual. */
  requestMapFocus: () => void;
  /** Config de informe a rehidratar al restaurar un histórico (null = ninguna
   *  pendiente). El informe la aplica y reacciona vía `reportConfigNonce`. */
  restoredReportConfig: ReportConfig | null;
  /** Nonce que se incrementa en cada rehidratación (re-dispara aunque la
   *  config sea equivalente a la anterior). */
  reportConfigNonce: number;
  /** Pide rehidratar la config del informe (al abrir un histórico guardado). */
  restoreReportConfig: (config: ReportConfig) => void;
}

const AprincipalContext = createContext<AprincipalContext>({
  accion: "seleccion-area",
  setAccion: () => {},
  selectedHexes: new Set(),
  setSelectedHexes: () => {},
  maxFaseIdx: 0,
  focusNonce: 0,
  requestMapFocus: () => {},
  restoredReportConfig: null,
  reportConfigNonce: 0,
  restoreReportConfig: () => {},
});

export function useAprincipal() {
  return useContext(AprincipalContext);
}

export function AprincipalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accion, setAccionState] = useState<Aprincipal>("seleccion-area");
  const [selectedHexes, setSelectedHexes] = useState<Set<string>>(new Set());
  const [maxFaseIdx, setMaxFaseIdx] = useState(0);
  const [focusNonce, setFocusNonce] = useState(0);
  const [restoredReportConfig, setRestoredReportConfig] =
    useState<ReportConfig | null>(null);
  const [reportConfigNonce, setReportConfigNonce] = useState(0);

  const setAccion = useCallback((a: Aprincipal) => {
    setAccionState(a);
    const idx = FLOW_ORDER.indexOf(a);
    if (idx > 0) setMaxFaseIdx((m) => (idx > m ? idx : m));
  }, []);

  const requestMapFocus = useCallback(() => setFocusNonce((n) => n + 1), []);

  const restoreReportConfig = useCallback((config: ReportConfig) => {
    setRestoredReportConfig(config);
    setReportConfigNonce((n) => n + 1);
  }, []);

  return (
    <AprincipalContext.Provider
      value={{
        accion,
        setAccion,
        selectedHexes,
        setSelectedHexes,
        maxFaseIdx,
        focusNonce,
        requestMapFocus,
        restoredReportConfig,
        reportConfigNonce,
        restoreReportConfig,
      }}
    >
      {children}
    </AprincipalContext.Provider>
  );
}
