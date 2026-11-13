import type { InformeEntry } from "./types";
import type { HistorialRepository } from "./HistorialRepository";

/**
 * Implementación backend (Postgres) del histórico. Llama a las rutas Next
 * `/api/historico` (BFF), que reenvían la identidad del usuario al FastAPI
 * privado y persisten por `user_id`. El backend filtra por usuario, valida
 * límites y rota los más antiguos.
 */
export class ApiHistorialRepo implements HistorialRepository {
  async list(): Promise<InformeEntry[]> {
    // Sin silenciar: si el backend falla, LANZA para que la UI avise y ofrezca
    // reintentar (antes devolvía [] y "parecía cache/vacío" ocultando el fallo).
    const res = await fetch("/api/historico", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`No se pudo cargar el histórico (${res.status})`);
    }
    return (await res.json()) as InformeEntry[];
  }

  async save(entry: InformeEntry): Promise<void> {
    const res = await fetch("/api/historico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error("No se pudo guardar el informe");
  }

  async remove(id: string): Promise<void> {
    const res = await fetch(`/api/historico/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      throw new Error("No se pudo eliminar el informe");
    }
  }
}
