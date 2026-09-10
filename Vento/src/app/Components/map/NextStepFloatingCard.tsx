"use client";

import { useAprincipal } from "../../Utils/contexts/AccionPrincipalContext";
import { usePhaseNav } from "../../Utils/usePhaseNav";

export default function NextStepFloatingCard() {
  const { accion, selectedHexes } = useAprincipal();
  // Misma lógica/redacción que el botón "Siguiente paso" del panel (US09-03):
  // la fase destino y su etiqueta salen del mismo hook, no hardcodeadas.
  const { nextLabel, goNext } = usePhaseNav();

  if (accion !== "seleccion-area" || selectedHexes.size === 0) return null;

  const count = selectedHexes.size;
  const label = `${count} ${
    count === 1 ? "hexágono seleccionado" : "hexágonos seleccionados"
  }`;

  return (
    <div
      className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={goNext}
        className="group relative h-[6rem] w-[30rem] overflow-hidden rounded-lg border-2 border-[#165170ff] bg-white px-3 py-3 text-left text-[#165170ff] shadow-xl shadow-black/20 transition-all duration-200 motion-safe:hover:-translate-y-[1px] hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#165170ff] motion-safe:animate-[vento-cta-in_220ms_ease-out]"
        aria-label={`Siguiente paso: ${nextLabel} con ${label}`}
        data-testid="next-step-cta"
      >
        <span
          className="absolute inset-x-0 top-0 h-1 bg-[#cce1eeff]"
          aria-hidden="true"
        />
        <span className="block text-[10px] font-semibold uppercase tracking-wide leading-tight text-gray-500">
          Siguiente paso
        </span>
        <span className="mt-1 flex items-center justify-between gap-2 text-[13px] font-bold leading-tight">
          <span>{nextLabel}</span>
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#165170ff] text-[13px] text-white transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          >
            {">"}
          </span>
        </span>
        <span className="mt-1 block text-[10px] leading-tight opacity-80">
          {label}
        </span>
      </button>
    </div>
  );
}
