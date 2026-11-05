"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { USE_BACKEND } from "../projectData";

/**
 * Estado COMPARTIDO de salud del backend (modo datos). Sondea `/api/health`
 * (barato) cada 30 s; tras 2 fallos seguidos marca `down`. Lo consumen:
 *  - BackendStatusBanner → pastilla ámbar "reconectando".
 *  - El informe → si `down`, NO se genera con ceros; se muestra un aviso de
 *    conexión con botón "Reintentar" (llama a `recheck`).
 * En modo template no hace nada (`down` siempre false).
 */
interface BackendHealth {
  down: boolean;
  recheck: () => void;
}

const BackendHealthContext = createContext<BackendHealth>({
  down: false,
  recheck: () => {},
});

export function useBackendHealth() {
  return useContext(BackendHealthContext);
}

export function BackendHealthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [down, setDown] = useState(false);
  const inFlight = useRef(false);
  const fails = useRef(0);

  const check = useCallback(async () => {
    if (!USE_BACKEND || inFlight.current) return;
    inFlight.current = true;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch("/api/health", {
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(String(res.status));
      fails.current = 0;
      setDown(false);
    } catch {
      fails.current += 1;
      if (fails.current >= 2) setDown(true);
    } finally {
      clearTimeout(to);
      inFlight.current = false;
    }
  }, []);

  // Reintento MANUAL (botón del aviso): sondea ya; si responde, baja el aviso.
  const recheck = useCallback(() => {
    fails.current = 0;
    void check();
  }, [check]);

  useEffect(() => {
    if (!USE_BACKEND) return;
    // Sondeo de un sistema EXTERNO (salud del backend): caso legítimo de efecto
    // (suscribirse + setState cuando cambia el estado externo). El sondeo inicial
    // + el intervalo actualizan el aviso; no es un cálculo derivable en render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
    const t = setInterval(() => void check(), 30000);
    return () => clearInterval(t);
  }, [check]);

  return (
    <BackendHealthContext.Provider value={{ down, recheck }}>
      {children}
    </BackendHealthContext.Provider>
  );
}
