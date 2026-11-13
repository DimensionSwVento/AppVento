"use client";

import { useBackendHealth } from "../../Utils/contexts/BackendHealthContext";

/**
 * Cartel global de "servidor caído". Lee el estado COMPARTIDO de
 * `BackendHealthContext` (el sondeo vive ahí). Tras 2 fallos muestra una pastilla
 * ámbar discreta para que la app NO parezca rota. Se oculta sola al reconectar.
 * En modo template no aplica (`down` siempre false).
 */
export default function BackendStatusBanner() {
  const { down } = useBackendHealth();

  if (!down) return null;

  // Aviso NO alarmante (#23): pastilla ámbar pálida semitransparente, compacta y
  // centrada arriba, con spinner de "reconectando" (no una franja roja a lo ancho).
  // `role=status`/`polite` para no gritar. No bloquea clics (pointer-events-none).
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
