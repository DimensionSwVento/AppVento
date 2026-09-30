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

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-[200] flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-sm font-medium text-white shadow-md"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      Sin conexión con el servidor. Reintentando… Algunos datos pueden no cargar.
    </div>
  );
}
