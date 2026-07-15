import type { InformeEntry } from "./types";
import type { HistorialRepository } from "./HistorialRepository";

/**
 * Implementación backend (Postgres) — PENDIENTE. Punto de enganche del seam.
 * Cuando exista la tabla `informe` + endpoints, se activa cambiando una línea
 * en HistorialProvider (`new LocalStorageHistorialRepo()` → `new ApiHistorialRepo()`).
 * El backend valida los límites por usuario/área y rechaza con 413/422.
 */
export class ApiHistorialRepo implements HistorialRepository {
  async list(): Promise<InformeEntry[]> {
    // TODO: GET /api/historico (filtrado por user_id del token)
    const res = await fetch("/api/historico");
    if (!res.ok) throw new Error("No se pudo cargar el histórico");
    return res.json();
  }

  async save(entry: InformeEntry): Promise<void> {
    // TODO: POST /api/historico — el backend compacta hexes y valida límites
    const res = await fetch("/api/historico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error("No se pudo guardar el informe");
  }

  async remove(id: string): Promise<void> {
    // TODO: DELETE /api/historico/:id
    const res = await fetch(`/api/historico/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("No se pudo eliminar el informe");
  }
}
