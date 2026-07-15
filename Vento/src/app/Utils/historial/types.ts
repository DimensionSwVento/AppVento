import type { CaracteristicasState } from "../contexts/CaracteristicasContext";
import type { SelectionScores } from "../report/useSelectionScores";

/**
 * Una entrada del histórico = los PARÁMETROS para regenerar un informe.
 * Nunca se guarda el PDF ni la expansión res-8 — el informe se reconstruye.
 */
export type InformeEntry = {
  id: string;
  createdAt: string; // ISO
  nombre: string;
  /** Hexes seleccionados (raw). Al migrar a backend se compactan con `compactCells`. */
  hexes: string[];
  variables: string[];
  caracteristicas: CaracteristicasState;
  scores: SelectionScores;
  region: string | null;
  areaKm2: number;
};
