"use client";

import { createContext, useCallback, useContext, useState } from "react";

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
  "dimensiones",
  "caracteristicas",
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
}

const AprincipalContext = createContext<AprincipalContext>({
  accion: "seleccion-area",
  setAccion: () => {},
  selectedHexes: new Set(),
  setSelectedHexes: () => {},
  maxFaseIdx: 0,
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

  const setAccion = useCallback((a: Aprincipal) => {
    setAccionState(a);
    const idx = FLOW_ORDER.indexOf(a);
    if (idx > 0) setMaxFaseIdx((m) => (idx > m ? idx : m));
  }, []);

  return (
    <AprincipalContext.Provider
      value={{ accion, setAccion, selectedHexes, setSelectedHexes, maxFaseIdx }}
    >
      {children}
    </AprincipalContext.Provider>
  );
}
