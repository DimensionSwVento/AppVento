"use client";

import {
  HEATMAP_DIMENSIONS,
  useHeatmapDimension,
  type HeatmapDimensionId,
} from "../Utils/HeatmapDimensionContext";

/**
 * Selector compacto (dropdown) de la dimensión visualizada en el heatmap.
 *
 * Comportamiento radio/mutex (una dimensión a la vez). El heatmap está
 * SIEMPRE encendido en Informe — no hay opción "sin visualización", el
 * usuario sólo elige cuál de las 6 dimensiones se pinta.
 */
export default function HeatmapDimensionSwitches() {
  const { activeDimension, setActiveDimension } = useHeatmapDimension();

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
          {HEATMAP_DIMENSIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
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
