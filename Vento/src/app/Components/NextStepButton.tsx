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
    <div className="mx-4 my-4 rounded-lg bg-white shadow p-4 flex items-center justify-between">
      <p className="text-[15px] font-medium text-gray-700">Siguiente paso</p>
      <button
        onClick={() => setAccion(siguiente)}
        className="cursor-pointer"
      >
        <img src="/next.png" alt="Siguiente" className="w-[32px] h-[32px]" />
      </button>
    </div>
  );
}
