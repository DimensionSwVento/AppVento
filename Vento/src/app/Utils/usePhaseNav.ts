"use client";

import { useAprincipal } from "./contexts/AccionPrincipalContext";

/**
 * US09-03 — Fuente ÚNICA de navegación entre fases del flujo guiado.
 * Antes cada componente ("Siguiente paso" del panel, CTA flotante del mapa,
 * hints, stepper del SideBar) repetía su propio arreglo de orden y sus propias
 * etiquetas → el botón salía en distinto lugar/formato/texto por fase.
 * Centralizar aquí el orden + las etiquetas + el "ir a la siguiente" hace que
 * todos hablen el mismo idioma y se comporten igual.
 */
export const PHASE_ORDER = [
  "seleccion-area",
  "dimensiones",
  "caracteristicas",
  "informe",
] as const;

export type FlowPhase = (typeof PHASE_ORDER)[number];

/** Etiqueta legible de cada fase (para "Siguiente paso: …"). */
export const PHASE_LABEL: Record<FlowPhase, string> = {
  "seleccion-area": "Selección de área",
  dimensiones: "Dimensiones",
  caracteristicas: "Características",
  informe: "Informe",
};

/** "Paso N" de una fase (1-indexado según el orden del flujo). */
export function phaseStepLabel(phase: FlowPhase): string {
  return `Paso ${PHASE_ORDER.indexOf(phase) + 1}`;
}

export interface PhaseNav {
  /** Fase actual (o null si no estamos en el flujo guiado). */
  current: FlowPhase | null;
  /** Índice de la fase actual en el orden (-1 fuera del flujo). */
  idx: number;
  /** Siguiente fase (o null si la actual es la última). */
  next: FlowPhase | null;
  /** Etiqueta de la siguiente fase (o null). */
  nextLabel: string | null;
  /** True si la fase actual es la última del flujo (informe). */
  isLast: boolean;
  /** Avanza a la siguiente fase (no-op si no hay siguiente). */
  goNext: () => void;
}

export function usePhaseNav(): PhaseNav {
  const { accion, setAccion } = useAprincipal();
  const idx = PHASE_ORDER.indexOf(accion as FlowPhase);
  const current = idx >= 0 ? PHASE_ORDER[idx] : null;
  const next = idx >= 0 ? (PHASE_ORDER[idx + 1] ?? null) : null;
  return {
    current,
    idx,
    next,
    nextLabel: next ? PHASE_LABEL[next] : null,
    isLast: idx === PHASE_ORDER.length - 1,
    goNext: () => {
      if (next) setAccion(next);
    },
  };
}
