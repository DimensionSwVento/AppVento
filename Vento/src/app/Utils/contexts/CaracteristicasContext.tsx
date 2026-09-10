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

/**
 * Sub-tipo aplicable cuando emplazamiento === "offshore".
 * MARCA (audit Sprint 4): hoy se CAPTURA y se muestra en el informe, pero NO
 * modula el análisis/score — la modulación (flotante vs fija cambia costo,
 * profundidad viable, etc.) depende de parámetros del modelo que llegan con la
 * master/backend (ver datos-requeridos.md §4/§7). Queda cableado el dato, no el
 * efecto: conectar cuando existan esos parámetros.
 */
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
  /** Número de aerogeneradores previstos. */
  numAerogeneradores: number | null;
  categoriaAerogenerador: CategoriaAerogenerador;
}

interface CaracteristicasContextValue extends CaracteristicasState {
  setTipoEmplazamiento: (v: TipoEmplazamiento) => void;
  setTipoTecnologiaOffshore: (v: TipoTecnologiaOffshore) => void;
  setCapacidadMW: (v: number | null) => void;
  setNumAerogeneradores: (v: number | null) => void;
  setCategoriaAerogenerador: (v: CategoriaAerogenerador) => void;
  /** Resetea todas las características a valores iniciales. */
  reset: () => void;
  /** Restaura un estado completo (usado al ver un informe del histórico). */
  restore: (state: CaracteristicasState) => void;
}

const INITIAL_STATE: CaracteristicasState = {
  tipoEmplazamiento: null,
  tipoTecnologiaOffshore: null,
  capacidadMW: null,
  numAerogeneradores: null,
  categoriaAerogenerador: null,
};

const noopContext: CaracteristicasContextValue = {
  ...INITIAL_STATE,
  setTipoEmplazamiento: () => {},
  setTipoTecnologiaOffshore: () => {},
  setCapacidadMW: () => {},
  setNumAerogeneradores: () => {},
  setCategoriaAerogenerador: () => {},
  reset: () => {},
  restore: () => {},
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

  const setNumAerogeneradores = useCallback(
    (v: number | null) =>
      setState((prev) => ({ ...prev, numAerogeneradores: v })),
    [],
  );

  const setCategoriaAerogenerador = useCallback(
    (v: CategoriaAerogenerador) =>
      setState((prev) => ({ ...prev, categoriaAerogenerador: v })),
    [],
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const restore = useCallback((s: CaracteristicasState) => setState(s), []);

  const value = useMemo<CaracteristicasContextValue>(
    () => ({
      ...state,
      setTipoEmplazamiento,
      setTipoTecnologiaOffshore,
      setCapacidadMW,
      setNumAerogeneradores,
      setCategoriaAerogenerador,
      reset,
      restore,
    }),
    [
      state,
      setTipoEmplazamiento,
      setTipoTecnologiaOffshore,
      setCapacidadMW,
      setNumAerogeneradores,
      setCategoriaAerogenerador,
      reset,
      restore,
    ],
  );

  return (
    <CaracteristicasContext.Provider value={value}>
      {children}
    </CaracteristicasContext.Provider>
  );
}
