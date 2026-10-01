"use client";

import { useEffect, useState } from "react";
import { USE_BACKEND } from "../../Utils/projectData";

/**
 * Cartel global de "servidor caído". Sondea el endpoint de salud (`/api/tiles/warmup`,
 * abierto y barato) cada 15 s en modo backend; tras 2 fallos seguidos muestra una
 * franja de error para que la app NO parezca rota (antes: pantallas en 0 sin aviso).
 * Se oculta sola en cuanto el backend responde. En modo template no hace nada.
 */
export default function BackendStatusBanner() {
  const [down, setDown] = useState(false);

  useEffect(() => {
    if (!USE_BACKEND) return;
    let alive = true;
    let fails = 0;
    let inFlight = false; // GUARDIA: no apilar sondeos si el back va lento
    const check = async () => {
      // Si el sondeo anterior sigue vivo, NO dispares otro (antes se apilaban
      // ~25 requests colgados que saturaban el pool y colgaban las tiles).
      if (inFlight) return;
      inFlight = true;
      // Corta el sondeo a los 8 s: un back saturado no debe dejar el request vivo.
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 8000);
      try {
        // `/api/health` es BARATO (is_ready = SELECT ... LIMIT 1). Antes se pegaba
        // a `/warmup`, que hace count() de TODA la tabla → carga innecesaria cada 15 s.
        const res = await fetch("/api/health", { cache: "no-store", signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        fails = 0;
        if (alive) setDown(false);
      } catch {
        fails += 1;
        // 2 fallos seguidos → caído (evita parpadeo por un blip puntual).
        if (alive && fails >= 2) setDown(true);
      } finally {
        clearTimeout(to);
        inFlight = false;
      }
    };
    check();
    const t = setInterval(check, 30000); // 30 s: menos carga; con la guardia no se apila
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!down) return null;

  // Aviso NO alarmante (#23): pastilla ámbar pálida semitransparente, compacta y
  // centrada arriba, con spinner de "reconectando" (no una franja roja a lo ancho).
  // `role=status`/`polite` para no gritar. No bloquea clics (pointer-events-none en
  // el contenedor). La cancelación de peticiones en vuelo la hace el mapa (#24).
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-center px-4 pt-2"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100/85 px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm backdrop-blur-sm">
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-700"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        Reconectando con el servidor…
      </div>
    </div>
  );
}
