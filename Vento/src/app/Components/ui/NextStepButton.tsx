"use client";

import { usePhaseNav } from "../../Utils/usePhaseNav";

/**
 * US09-03 — Botón "Siguiente paso" UNIFICADO del panel de fase.
 * Comparte lógica (orden/etiquetas/avance) con el CTA flotante del mapa vía
 * `usePhaseNav`, y el mismo skin (borde brand + acento superior + chip de
 * flecha) para que se lea como un único patrón en todas las fases.
 * Comunica QUÉ sigue (nombre de la fase) y QUÉ falta (`blockedReason`).
 */
export default function NextStepButton({
  disabled = false,
  blockedReason,
}: {
  /** Si `true`, el botón no avanza y se muestra atenuado. */
  disabled?: boolean;
  /** Texto mostrado cuando está deshabilitado (qué falta para continuar). */
  blockedReason?: string;
}) {
  const { next, nextLabel, goNext } = usePhaseNav();

  if (!next) return null;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={`Siguiente paso: ${nextLabel}`}
      onClick={() => !disabled && goNext()}
      className={`group relative w-full overflow-hidden rounded-lg border-2 border-[#165170ff] bg-white px-4 py-3 text-left text-[#165170ff] shadow-md transition-all ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer motion-safe:hover:-translate-y-[1px] hover:shadow-lg"
      }`}
    >
      <span
        className="absolute inset-x-0 top-0 h-1 bg-[#cce1eeff]"
        aria-hidden="true"
      />
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Siguiente paso
          </span>
          <span className="text-[14px] font-bold leading-tight">
            {nextLabel}
          </span>
          {disabled && blockedReason && (
            <span className="mt-0.5 text-[11px] font-medium text-amber-700">
              {blockedReason}
            </span>
          )}
        </span>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#165170ff] text-[14px] text-white transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          {">"}
        </span>
      </span>
    </button>
  );
}
