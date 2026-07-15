"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { InformeEntry } from "./types";
import type { HistorialRepository } from "./HistorialRepository";
import { LocalStorageHistorialRepo } from "./LocalStorageHistorialRepo";
// import { ApiHistorialRepo } from "./ApiHistorialRepo"; // ← activar cuando exista el backend

// Fuente de datos activa (seam). Hoy: localStorage. Mañana: `new ApiHistorialRepo()`.
const repo: HistorialRepository = new LocalStorageHistorialRepo();

type HistorialApi = {
  entries: InformeEntry[];
  save: (entry: InformeEntry) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const HistorialContext = createContext<HistorialApi | null>(null);

export function useHistorial(): HistorialApi {
  const ctx = useContext(HistorialContext);
  if (!ctx) throw new Error("useHistorial debe usarse dentro de <HistorialProvider>");
  return ctx;
}

export function HistorialProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<InformeEntry[]>([]);

  const refresh = useCallback(async () => {
    setEntries(await repo.list());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (entry: InformeEntry) => {
      await repo.save(entry);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await repo.remove(id);
      await refresh();
    },
    [refresh],
  );

  const api = useMemo<HistorialApi>(
    () => ({ entries, save, remove, refresh }),
    [entries, save, remove, refresh],
  );

  return <HistorialContext.Provider value={api}>{children}</HistorialContext.Provider>;
}
