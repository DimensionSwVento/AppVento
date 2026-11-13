"use client";

/**
 * Estado de la dimensión regulatoria (US04-05), informativa (no puntúa),
 * compartido entre el panel (fase Dimensiones) y el informe: si la sección
 * regulatoria se agrega al informe/PDF.
 *
 * El encendido/apagado de cada NORMA NO vive aquí: las normas se modelan como
 * variables informativas de la dimensión "regulatoria" y se prenden/apagan por
 * `VariablesContext` (activeVariables, id `norma:<id>`), igual que el resto.
 */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface RegulatoryContextValue {
  /** Incluir la sección regulatoria en el informe/PDF. */
  addToReport: boolean;
  setAddToReport: (b: boolean) => void;
}

const RegulatoryContext = createContext<RegulatoryContextValue | null>(null);

export function RegulatoryProvider({ children }: { children: ReactNode }) {
  const [addToReport, setAddToReport] = useState(true);
  const value = useMemo<RegulatoryContextValue>(
    () => ({ addToReport, setAddToReport }),
    [addToReport],
  );
  return (
    <RegulatoryContext.Provider value={value}>
      {children}
    </RegulatoryContext.Provider>
  );
}

export function useRegulatory(): RegulatoryContextValue {
  const ctx = useContext(RegulatoryContext);
  if (!ctx)
    throw new Error("useRegulatory debe usarse dentro de <RegulatoryProvider>");
  return ctx;
}
