"use client";

import { useMemo } from "react";
import { useAprincipal } from "../Utils/AccionPrincipalContext";
import { calcAreaKm2 } from "../Utils/areaCalc";

const fmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/**
 * Tooltip flotante a la derecha del mapa que muestra el área (km²)
 * total de los hexágonos seleccionados. Siempre visible.
 */
export default function AreaDisplay() {
  const { selectedHexes } = useAprincipal();
  const km2 = useMemo(() => calcAreaKm2(selectedHexes), [selectedHexes]);

  return (
    <div className="absolute top-3 right-3 z-10 w-[200px] rounded-lg bg-white/95 shadow-md px-3 py-2 backdrop-blur-sm max-md:top-12">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">Área seleccionada</p>
      <p className="text-base font-semibold text-gray-800">
        {fmt.format(km2)} <span className="text-xs font-normal text-gray-500">km²</span>
      </p>
    </div>
  );
}
