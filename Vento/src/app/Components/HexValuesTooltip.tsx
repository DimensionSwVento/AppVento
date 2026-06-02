"use client";

import { useMemo } from "react";
import {
  HEATMAP_DIMENSIONS,
  useHeatmapDimension,
} from "../Utils/HeatmapDimensionContext";
import { dimensionHexScore } from "../Utils/heatmapPalette";
import {
  INFO_VARS,
  formatVariableValue,
} from "../Utils/informativeVariables";

/**
 * Tope de variables informativas mostradas en el tooltip de hover.
 * El spec del cliente exige restringir el número para que el tooltip no
 * crezca demasiado al pasar el cursor sobre un hex.
 */
const TOOLTIP_INFO_VARS_LIMIT = 4;

/**
 * Mini-tooltip que se muestra al hacer **hover** sobre un hexágono.
 *
 * Renderiza los puntajes placeholder (General + 5 dimensiones) del hex bajo
 * el cursor, resaltando la dimensión que está pintando el heatmap (si hay).
 * Anclado a la posición del cursor con offset para no taparlo.
 *
 * Los valores son placeholder deterministas hasta US03-AC6.
 */
export default function HexValuesTooltip({
  hex,
  x,
  y,
}: {
  hex: string | null;
  x: number | null;
  y: number | null;
}) {
  const { activeDimension } = useHeatmapDimension();

  const scores = useMemo(() => {
    if (!hex) return null;
    const result: Record<string, number> = {};
    for (const dim of HEATMAP_DIMENSIONS) {
      result[dim.id] = dimensionHexScore(dim.id, hex);
    }
    return result;
  }, [hex]);

  const infoRows = useMemo(() => {
    if (!hex) return [];
    return INFO_VARS.map((v) => {
      const score = dimensionHexScore(v.id, hex);
      return { ...v, valueText: formatVariableValue(score, v.unit) };
    });
  }, [hex]);

  if (!hex || !scores || x === null || y === null) return null;

  const shortId = hex.length > 7 ? "…" + hex.slice(-7) : hex;

  return (
    <div
      role="tooltip"
      aria-label={`Valores del hexágono ${shortId}`}
      style={{
        // Offset 12px desde el cursor para no taparlo.
        left: x + 12,
        top: y + 12,
      }}
      className="pointer-events-none absolute z-20 w-52 max-h-[80vh] overflow-y-auto rounded-md border border-[#eae9e9ff] bg-white shadow-lg shadow-[#cacacbff]"
    >
      <header className="border-b border-gray-200 px-2.5 py-1.5">
        <p className="font-mono text-[10px] font-bold text-[#383838]">
          {shortId}
        </p>
      </header>

      <p className="px-2.5 pt-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
        Puntajes
      </p>
      <ul className="flex flex-col px-2.5 pb-1.5">
        {HEATMAP_DIMENSIONS.map((d) => {
          const value = (scores[d.id] * 100).toFixed(1);
          const isActive = activeDimension === d.id;
          return (
            <li
              key={d.id}
              className={`flex items-baseline justify-between gap-2 py-0.5 ${
                isActive ? "-mx-1 rounded bg-[#cce1eeff]/50 px-1" : ""
              }`}
            >
              <span
                className={`text-[10px] ${
                  isActive
                    ? "font-bold text-[#165170ff]"
                    : "text-gray-600"
                }`}
              >
                {d.label}
              </span>
              <span
                className={`font-mono text-[10px] ${
                  isActive
                    ? "font-bold text-[#165170ff]"
                    : "font-semibold text-gray-700"
                }`}
              >
                {value}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-gray-200 px-2.5 pt-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
        Variables informativas
      </p>
      <ul className="flex flex-col px-2.5 pb-1.5">
        {infoRows.slice(0, TOOLTIP_INFO_VARS_LIMIT).map((v) => {
          const Icon = v.Icon;
          return (
            <li key={v.id} className="flex items-center gap-1.5 py-0.5">
              <span
                aria-hidden="true"
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded shadow-sm"
                style={{ backgroundColor: v.color }}
              >
                <Icon className="h-2.5 w-2.5 text-white" strokeWidth={2.4} />
              </span>
              <span
                className="flex-1 min-w-0 truncate text-[10px] text-gray-700"
                title={v.label}
              >
                {v.label}
              </span>
              <span className="font-mono text-[10px] font-semibold text-[#165170ff]">
                {v.valueText}
                <span className="ml-0.5 text-[8px] font-normal text-gray-500">
                  {v.unit}
                </span>
              </span>
            </li>
          );
        })}
        {infoRows.length > TOOLTIP_INFO_VARS_LIMIT && (
          <li className="pt-0.5 text-right text-[9px] italic text-gray-400">
            +{infoRows.length - TOOLTIP_INFO_VARS_LIMIT} más
          </li>
        )}
      </ul>
    </div>
  );
}
