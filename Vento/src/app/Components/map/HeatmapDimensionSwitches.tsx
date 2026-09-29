"use client";

import { useEffect } from "react";
import {
  HEATMAP_DIMENSIONS,
  HEATMAP_WIND_OPTIONS,
  isVariableHeatmap,
  useHeatmapDimension,
  type HeatmapDimensionId,
} from "../../Utils/contexts/HeatmapDimensionContext";
import { useVariables } from "../../Utils/contexts/VariablesContext";
import {
  mapHeatmapVariableOptions,
  getVariableById,
  mapKindForVariable,
} from "../../Utils/variables/variablesCatalog";

/**
 * Selector compacto (dropdown) de la dimensión visualizada en el heatmap.
 *
 * Comportamiento radio/mutex (una dimensión a la vez). El heatmap está
 * SIEMPRE encendido en Informe — no hay opción "sin visualización".
 *
 * Las dimensiones PUNTUABLES (General + 4) van en el grupo principal.
 * "Regulatoria" ya no es una métrica puntuable (US-FB3-05 / feedback item 11):
 * se ofrece aparte como capa informativa opcional.
 */
export default function HeatmapDimensionSwitches() {
  const { activeDimension, setActiveDimension } = useHeatmapDimension();
  const { isActive } = useVariables();

  // Solo se ofrecen las capas de viento SELECCIONADAS en Dimensiones (velocidad/
  // densidad son informativas opcionales; el usuario las activa en el menú).
  const windOptions = HEATMAP_WIND_OPTIONS.filter((d) => isActive(d.id));

  // SOLO las variables cuyo MÉTODO de mapa es "calor" van al desplegable de
  // heatmap (corrección cliente: enMapa ya NO manda todo aquí). Las de "area" e
  // "interconectado" se pintan como capas de icono/color/red, no como heatmap.
  // Además deben estar ACTIVAS y no ser viento (que tiene su propio grupo).
  const variableOptions = mapHeatmapVariableOptions().filter((o) => {
    if (!isActive(o.id)) return false;
    if (o.id === "velocidad-viento" || o.id === "densidad-viento") return false;
    const kind = getVariableById(o.id)?.mapKind ?? mapKindForVariable(o.id);
    return kind === "calor";
  });

  // Si el heatmap por variable activo ya no está disponible (deseleccionado en
  // Dimensiones o su enMapa apagado), vuelve a General.
  const availableVarIds = [
    ...windOptions.map((d) => d.id as string),
    ...variableOptions.map((o) => o.id),
  ];
  useEffect(() => {
    if (
      isVariableHeatmap(activeDimension) &&
      !availableVarIds.includes(activeDimension as string)
    ) {
      setActiveDimension("general");
    }
  }, [activeDimension, availableVarIds, setActiveDimension]);

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <label
        htmlFor="heatmap-dim-select"
        className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500"
      >
        Visualización en el mapa
      </label>
      <div className="relative mt-1">
        <select
          id="heatmap-dim-select"
          value={activeDimension ?? "general"}
          onChange={(e) => {
            setActiveDimension(e.target.value as HeatmapDimensionId);
          }}
          className="w-full appearance-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-[#165170ff] focus:border-[#165170ff] focus:outline-none focus:ring-2 focus:ring-[#165170ff]/30"
        >
          <optgroup label="Dimensiones puntuables">
            {HEATMAP_DIMENSIONS.filter((d) => d.scorable).map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Informativa">
            {HEATMAP_DIMENSIONS.filter((d) => !d.scorable).map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </optgroup>
          {/* Viento (velocidad/densidad): solo las SELECCIONADAS en Dimensiones.
              Al elegirlas, el heatmap se pinta sobre el área seleccionada con el
              valor real del backend (placeholder de corredores en template). */}
          {windOptions.length > 0 && (
            <optgroup label="Recurso eólico">
              {windOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </optgroup>
          )}
          {/* Variables con "en mapa" activas (admin): su mapa de calor por valor
              normalizado, recortado al área. Las zonas/puntos (icono) NO van aquí. */}
          {variableOptions.length > 0 && (
            <optgroup label="Variables en el mapa">
              {variableOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
