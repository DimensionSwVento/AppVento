"use client";

import { useMemo } from "react";
import {
  HEATMAP_DIMENSIONS,
  useHeatmapDimension,
} from "../../Utils/contexts/HeatmapDimensionContext";
import { dimensionHexScore } from "../../Utils/report/heatmapPalette";
import {
  INFO_VARS,
  formatVariableValue,
} from "../../Utils/variables/informativeVariables";
import {
  backendScore,
  hexVariableValue,
  type AreaHexMap,
} from "../../Utils/report/useAreaHexData";
import { USE_PLACEHOLDER_FALLBACK } from "../../Utils/projectData";

/** Formatea un valor CRUDO del backend para el tooltip (sin fórmulas fake). */
function formatRawValue(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return Math.round(v).toLocaleString("es-CO");
  if (abs >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

/**
 * Tope de variables informativas mostradas en el tooltip de hover.
 * El spec del cliente exige restringir el número para que el tooltip no
 * crezca demasiado al pasar el cursor sobre un hex.
 */
const TOOLTIP_INFO_VARS_LIMIT = 4;

/**
 * Mini-tooltip que se muestra al hacer **hover** sobre un hexágono.
 *
 * Renderiza los puntajes placeholder (General + 4 dimensiones puntuables) del
 * hex bajo el cursor, resaltando la dimensión que está pintando el heatmap
 * (si hay). "Regulatoria" se muestra aparte como valor informativo (no puntúa,
 * US-FB3-05 / feedback item 11). Anclado a la posición del cursor con offset.
 *
 * Los valores son placeholder deterministas hasta US03-AC6.
 */
export default function HexValuesTooltip({
  hex,
  x,
  y,
  areaData,
}: {
  hex: string | null;
  x: number | null;
  y: number | null;
  /** Datos reales por hex del backend (informe). Ausente/sin dato → template. */
  areaData?: AreaHexMap | null;
}) {
  const { activeDimension } = useHeatmapDimension();
  const info = hex ? areaData?.get(hex) : undefined;

  // Puntajes por dimensión: en modo API, reales del backend (`null` si el backend
  // aún no entrega esa dimensión → se muestra "—"); en template, placeholder.
  const scores = useMemo(() => {
    if (!hex) return null;
    const result: Record<string, number | null> = {};
    for (const dim of HEATMAP_DIMENSIONS) {
      if (USE_PLACEHOLDER_FALLBACK) {
        result[dim.id] = dimensionHexScore(dim.id, hex);
      } else {
        const real = backendScore(info, dim.id);
        result[dim.id] = typeof real === "number" ? real : null;
      }
    }
    return result;
  }, [hex, info]);

  const infoRows = useMemo(() => {
    if (!hex) return [];
    return (
      INFO_VARS.map((v) => {
        if (USE_PLACEHOLDER_FALLBACK) {
          const score = dimensionHexScore(v.id, hex);
          return { ...v, valueText: formatVariableValue(score, v.unit) };
        }
        // Modo API: valor crudo real del backend, o null si no lo entrega.
        const raw = hexVariableValue(info, v.masterId);
        return { ...v, valueText: raw == null ? "—" : formatRawValue(raw) };
      })
        // Solo variables CON valor (no-nulo): las 4 que se muestran deben tener
        // dato real, aunque no sean las primeras del catálogo (no esconder datos
        // hardcode/nulos como si fueran reales). En template todas tienen valor.
        .filter((v) => v.valueText !== "—")
    );
  }, [hex, info]);

  if (!hex || !scores || x === null || y === null) return null;

  return (
    <div
      role="tooltip"
      aria-label="Valores del hexágono"
      style={{
        // Offset 12px desde el cursor para no taparlo.
        left: x + 12,
        top: y + 12,
      }}
      className="pointer-events-none absolute z-20 w-52 max-h-[80vh] overflow-y-auto rounded-md border border-[#eae9e9ff] bg-white shadow-lg shadow-[#cacacbff]"
    >
      <header className="border-b border-gray-200 px-2.5 py-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">
          Hexágono
        </p>
        <p className="text-[10px] text-gray-600">
          Valores en este punto del área
        </p>
      </header>

      <p className="px-2.5 pt-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
        Puntajes de idoneidad
      </p>
      <ul className="flex flex-col px-2.5 pb-1.5">
        {HEATMAP_DIMENSIONS.filter((d) => d.scorable).map((d) => {
          const s = scores[d.id];
          const value = s == null ? "—" : (s * 100).toFixed(1);
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

      {/* #17: Regulatoria y Económica (informativas) YA NO se muestran en el
          tooltip — su valor vive en la sección "Variables informativas" y en el
          informe, no entre los puntajes de idoneidad del hex. */}

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
