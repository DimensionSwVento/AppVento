"use client";
import { useAprincipal } from "../Utils/AccionPrincipalContext";

const ORDEN = [
  "seleccion-area",
  "dimensiones",
  "caracteristicas",
  "informe",
] as const;

export default function NextStepButton() {
  const { accion, setAccion } = useAprincipal();
  const pasoActual = ORDEN.indexOf(accion as (typeof ORDEN)[number]);
  const siguiente = ORDEN[pasoActual + 1];

  if (!siguiente) return null;

  return (
    <button
      type="button"
      onClick={() => setAccion(siguiente)}
      className="w-full bg-white flex items-center justify-between px-4 py-3 cursor-pointer border border-r-[#165170] border-t-[#165170]"
    >
      <span className="text-[15px] font-medium text-gray-700">Siguiente paso</span>
      <img src="/next.png" alt="Siguiente" className="w-[32px] h-[32px]" />
    </button>
  );
}
