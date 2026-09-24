"use client";

/**
 * Estado de la dimensión regulatoria (US04-05), informativa (no puntúa),
 * compartido entre el panel (fase Dimensiones) y el informe:
 *  - si la sección regulatoria se agrega al informe/PDF (`addToReport`);
 *  - qué normas están ACTIVAS. Las normas son informativas igual que las demás
 *    variables informativas: se prenden/apagan en Dimensiones y solo las activas
 *    aparecen en el modal de marco normativo y en el informe. Se modela con un
 *    conjunto de IDs DESACTIVADAS (vacío = todas activas), de modo que las normas
 *    nuevas que ingresen por metadatos (InfoVariables) queden activas por defecto.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface RegulatoryContextValue {
  /** Incluir la sección regulatoria en el informe/PDF. */
  addToReport: boolean;
  setAddToReport: (b: boolean) => void;
  /** ¿La norma está activa? (por defecto sí). */
  isNormaActive: (id: string) => boolean;
  /** Prende/apaga una norma. */
  toggleNorma: (id: string) => void;
  /** Nº de normas desactivadas (para contadores del panel). */
  deactivatedCount: number;
}

const RegulatoryContext = createContext<RegulatoryContextValue | null>(null);

export function RegulatoryProvider({ children }: { children: ReactNode }) {
  const [addToReport, setAddToReport] = useState(true);
  const [deactivated, setDeactivated] = useState<Set<string>>(new Set());

  const isNormaActive = useCallback(
    (id: string) => !deactivated.has(id),
    [deactivated],
  );
  const toggleNorma = useCallback((id: string) => {
    setDeactivated((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const value = useMemo<RegulatoryContextValue>(
    () => ({
      addToReport,
      setAddToReport,
      isNormaActive,
      toggleNorma,
      deactivatedCount: deactivated.size,
    }),
    [addToReport, isNormaActive, toggleNorma, deactivated.size],
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
