"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/** Tipo de emplazamiento del proyecto eólico. Auto-detectado desde `selectedHexes`. */
export type TipoEmplazamiento = "onshore" | "offshore" | null;

/** Sub-tipo aplicable cuando emplazamiento === "offshore". */
export type TipoTecnologiaOffshore = "flotante" | "fija" | null;

/**
 * Categoría estándar de aerogenerador. El cliente identificó 3 (S/M/L) y
 * mencionó que podrían subir a 5 — ver scope-dos.md US05.
 */
export type CategoriaAerogenerador = "S" | "M" | "L" | null;

export interface CaracteristicasState {
  /** `null` mientras no haya hexes seleccionados de un tipo claro. */
  tipoEmplazamiento: TipoEmplazamiento;
  tipoTecnologiaOffshore: TipoTecnologiaOffshore;
  /** Capacidad nominal del proyecto en MW. `null` si no se ha capturado. */
  capacidadMW: number | null;
  categoriaAerogenerador: CategoriaAerogenerador;
}

interface CaracteristicasContextValue extends CaracteristicasState {
  setTipoEmplazamiento: (v: TipoEmplazamiento) => void;
  setTipoTecnologiaOffshore: (v: TipoTecnologiaOffshore) => void;
  setCapacidadMW: (v: number | null) => void;
  setCategoriaAerogenerador: (v: CategoriaAerogenerador) => void;
  /** Resetea todas las características a valores iniciales. */
  reset: () => void;
}

const INITIAL_STATE: CaracteristicasState = {
  tipoEmplazamiento: null,
  tipoTecnologiaOffshore: null,
  capacidadMW: null,
  categoriaAerogenerador: null,
};

const noopContext: CaracteristicasContextValue = {
  ...INITIAL_STATE,
  setTipoEmplazamiento: () => {},
  setTipoTecnologiaOffshore: () => {},
  setCapacidadMW: () => {},
  setCategoriaAerogenerador: () => {},
  reset: () => {},
};

const CaracteristicasContext =
  createContext<CaracteristicasContextValue>(noopContext);

export function useCaracteristicas() {
  return useContext(CaracteristicasContext);
}

export function CaracteristicasProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<CaracteristicasState>(INITIAL_STATE);

  const setTipoEmplazamiento = useCallback((v: TipoEmplazamiento) => {
    setState((prev) => {
      // Si vuelve a onshore (o null) limpiamos el sub-tipo offshore.
      if (v !== "offshore") {
        return { ...prev, tipoEmplazamiento: v, tipoTecnologiaOffshore: null };
      }
      return { ...prev, tipoEmplazamiento: v };
    });
  }, []);

  const setTipoTecnologiaOffshore = useCallback(
    (v: TipoTecnologiaOffshore) =>
      setState((prev) => ({ ...prev, tipoTecnologiaOffshore: v })),
    [],
  );

  const setCapacidadMW = useCallback(
    (v: number | null) =>
      setState((prev) => ({ ...prev, capacidadMW: v })),
    [],
  );

  const setCategoriaAerogenerador = useCallback(
    (v: CategoriaAerogenerador) =>
      setState((prev) => ({ ...prev, categoriaAerogenerador: v })),
    [],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const value = useMemo<CaracteristicasContextValue>(
    () => ({
      ...state,
      setTipoEmplazamiento,
      setTipoTecnologiaOffshore,
      setCapacidadMW,
      setCategoriaAerogenerador,
      reset,
    }),
    [
      state,
      setTipoEmplazamiento,
      setTipoTecnologiaOffshore,
      setCapacidadMW,
      setCategoriaAerogenerador,
      reset,
    ],
  );

  return (
    <CaracteristicasContext.Provider value={value}>
      {children}
    </CaracteristicasContext.Provider>
  );
}
