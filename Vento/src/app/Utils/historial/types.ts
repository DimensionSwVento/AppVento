import type { CaracteristicasState } from "../contexts/CaracteristicasContext";
import type { SelectionScores } from "../report/useSelectionScores";
import type { ReportConfig } from "../report/reportConfig";

/**
 * Una entrada del histórico = los PARÁMETROS para regenerar un informe.
 * Nunca se guarda el PDF ni la expansión res-8 — el informe se reconstruye.
 */
export type InformeEntry = {
  id: string;
  createdAt: string; // ISO
  nombre: string;
  /**
   * Hexes seleccionados, COMPACTADOS al guardar con `compactHexes` (`hexCodec.ts`):
   * mismo formato `string[]` pero más liviano (local + backend). Geométricamente
   * idéntico; al restaurar se usan tal cual (la app recalcula desde la geometría).
   */
  hexes: string[];
  variables: string[];
  caracteristicas: CaracteristicasState;
  scores: SelectionScores;
  region: string | null;
  areaKm2: number;
  /**
   * Configuración del informe elegida por el usuario (US06-03). Opcional: las
   * entradas antiguas no la tienen → al restaurar se cae al default.
   */
  reportConfig?: ReportConfig;
  /**
   * Versión de la MASTER con la que se generó el informe (trazabilidad: qué
   * datos vio). La estampa el backend al guardar (`masterVersion`). Las entradas
   * viejas o en modo template pueden no tenerla.
   */
  masterVersion?: string | null;
};
