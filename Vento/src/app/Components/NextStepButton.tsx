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
    <div className="mx-4 my-4 rounded-lg bg-white shadow p-4 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-gray-700">Siguiente paso</p>
        {disabled && blockedReason && (
          <p className="mt-0.5 text-[11px] text-amber-700">{blockedReason}</p>
        )}
      </div>
      <button
        type="button"
        disabled={disabled}
        aria-disabled={disabled}
        onClick={() => !disabled && setAccion(siguiente)}
        className={`${
          disabled
            ? "cursor-not-allowed opacity-40"
            : "cursor-pointer"
        }`}
      >
        <img src="/next.png" alt="Siguiente" className="w-[32px] h-[32px]" />
      </button>
    </div>
  );
}
