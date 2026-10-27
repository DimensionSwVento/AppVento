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
import { ApiHistorialRepo } from "./ApiHistorialRepo";
import { LocalStorageHistorialRepo } from "./LocalStorageHistorialRepo";
import { USE_BACKEND } from "../projectData";

// Fuente de datos según la fase de despliegue: con backend → Postgres (BFF);
// en modo template sin API → cache local (localStorage). Ambos se conservan.
const repo: HistorialRepository = USE_BACKEND
  ? new ApiHistorialRepo()
  : new LocalStorageHistorialRepo();

type HistorialApi = {
  entries: InformeEntry[];
  loading: boolean;
  /** Mensaje de error al traer el histórico (null si OK). Para avisar + reintentar. */
  error: string | null;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await repo.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el histórico");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial: fetch → setState SOLO dentro de callbacks async. El React
    // Compiler prohíbe llamar en el effect una función que hace setState síncrono
    // (por eso NO se llama refresh() aquí). `loading` ya arranca en true.
    let alive = true;
    repo
      .list()
      .then((list) => {
        if (!alive) return;
        setEntries(list);
        setError(null);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "No se pudo cargar el histórico");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

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
    () => ({ entries, loading, error, save, remove, refresh }),
    [entries, loading, error, save, remove, refresh],
  );

  return <HistorialContext.Provider value={api}>{children}</HistorialContext.Provider>;
}
