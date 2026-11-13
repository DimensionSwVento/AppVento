import type { InformeEntry } from "./types";
import type { HistorialRepository } from "./HistorialRepository";
import { MAX_HISTORIAL_ENTRIES } from "../projectData";

const KEY = "vento_historial";

/** Tope de informes por usuario (rotación del más viejo) — desde el doc maestro. */
export const MAX_ENTRIES = MAX_HISTORIAL_ENTRIES;

function read(): InformeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as InformeEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: InformeEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* cuota de localStorage excedida — aceptable, no persiste */
  }
}

export class LocalStorageHistorialRepo implements HistorialRepository {
  async list(): Promise<InformeEntry[]> {
    return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async save(entry: InformeEntry): Promise<void> {
    const entries = read();
    entries.unshift(entry);
    // Rotación: conservar sólo los MAX_ENTRIES más recientes.
    write(
      entries
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, MAX_ENTRIES),
    );
  }

  async remove(id: string): Promise<void> {
    write(read().filter((e) => e.id !== id));
  }
}
