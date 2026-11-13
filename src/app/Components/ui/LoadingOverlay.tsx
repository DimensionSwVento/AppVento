import type { ReactNode } from "react";

/**
 * Ventana de carga reutilizable. Extraída de Map.tsx.
 *
 * - Uso por defecto: overlay que cubre su contenedor con "... cargando mapa".
 * - El onboarding (US02) reusa este MISMO shell pasando `children` (imagen + texto
 *   + botón) y subiendo el z-index — "el onboarding será este, solo cambia la imagen
 *   y el texto".
 */
export default function LoadingOverlay({
  text = "Cargando mapa…",
  children,
  className = "absolute inset-0 z-30",
}: {
  text?: string;
  children?: ReactNode;
  className?: string;
}) {
  // Con children (onboarding) se mantiene el shell simple.
  if (children) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        {children}
      </div>
    );
  }

  // Loader por defecto: mismo lenguaje visual que el overlay "Buscando ubicación…"
  // (fondo suave con tinte de marca + pill blanco con spinner brand).
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-b from-[#eaf2f6] to-[#f6f8f8] ${className}`}
    >
      <div className="flex items-center gap-2.5 rounded-full bg-white/95 px-4 py-2 shadow-lg ring-1 ring-black/5">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-spin text-[#165170ff]">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
          <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-medium text-[#165170ff]">{text}</span>
      </div>
    </div>
  );
}
