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
  text = "... cargando mapa",
  children,
  className = "absolute inset-0 z-30",
}: {
  text?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
      {children ?? <p className="text-lg text-gray-500">{text}</p>}
    </div>
  );
}

/**
 * Pill de carga de tiles (feedback ligero tras un flyTo, sin tapar la vista).
 * Extraída del bloque `mapReady && isTilesLoading` de Map.tsx.
 */
export function LoadingPill({ text = "... cargando mapa" }: { text?: string }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 cursor-wait">
      <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-md">
        {text}
      </div>
    </div>
  );
}
