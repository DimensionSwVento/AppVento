import type { InformeEntry } from "./types";

/**
 * Puerto del histórico. Hoy lo implementa LocalStorageHistorialRepo; cuando
 * exista la tabla `informe` en el backend, ApiHistorialRepo lo reemplaza sin
 * tocar la UI (se cambia una línea en HistorialProvider).
 */
export interface HistorialRepository {
  list(): Promise<InformeEntry[]>;
  save(entry: InformeEntry): Promise<void>;
  remove(id: string): Promise<void>;
}
