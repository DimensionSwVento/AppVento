"use client";
import { useAprincipal } from "../Utils/AccionPrincipalContext";

const ORDEN = [
  "seleccion-area",
  "dimensiones",
  "caracteristicas",
  "informe",
] as const;

export default function NextStepButton({
  disabled = false,
  blockedReason,
}: {
  /** Si `true`, el botón no avanza y se muestra atenuado. */
  disabled?: boolean;
  /** Texto opcional mostrado al lado del botón cuando está deshabilitado. */
  blockedReason?: string;
}) {
  const { accion, setAccion } = useAprincipal();
  const pasoActual = ORDEN.indexOf(accion as (typeof ORDEN)[number]);
  const siguiente = ORDEN[pasoActual + 1];

  if (!siguiente) return null;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      onClick={() => !disabled && setAccion(siguiente)}
      className={`w-full bg-white flex items-center justify-between px-4 py-3 border border-r-[#165170] border-t-[#165170] ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
    >
      <span className="flex flex-col items-start min-w-0 text-left">
        <span className="text-[15px] font-medium text-gray-700">
          Siguiente paso
        </span>
        {disabled && blockedReason && (
          <span className="mt-0.5 text-[11px] text-amber-700">
            {blockedReason}
          </span>
        )}
      </span>
      <img src="/next.png" alt="Siguiente" className="w-[32px] h-[32px]" />
    </button>
  );
}
