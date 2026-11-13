"use client";

import {
  rampForColor,
  quantileRangeLabels,
  DEFAULT_QUANTILE_BANDS,
} from "../../Utils/map/colorScale";
import { mapComponent } from "../../Utils/map/mapCatalogVariables";
import { getVariableById } from "../../Utils/variables/variablesCatalog";

/**
 * Leyenda de la ESCALA DE COLOR (choropleth por cuantiles) para las variables
 * informativas activas. Muestra, por variable, su rampa claro→oscuro y los RANGOS
 * por cuantil ("Desde a hasta b") — lo que pidió el cliente: "su respectiva escala
 * de colores y rangos por cuantiles". Las bandas y los cortes vienen del backend
 * (`/tiles/variable-quantiles`); en template se muestran sin rango numérico.
 */
interface Props {
  /** ids de variables activas con kind "escala". */
  escalaVarIds: string[];
  /** Cortes + min/max por variable (del backend). Vacío en template. */
  meta: Record<string, { cuts: number[]; min: number; max: number }>;
}

export default function MapScaleLegend({ escalaVarIds, meta }: Props) {
  if (escalaVarIds.length === 0) return null;
  return (
    <div className="pointer-events-auto max-w-[220px] rounded-2xl bg-white/95 p-2.5 shadow-sm backdrop-blur">
      <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        Escala de color
      </h3>
      <div className="flex flex-col gap-2.5">
        {escalaVarIds.map((id) => {
          const v = getVariableById(id);
          const color = mapComponent(id).color;
          const ramp = rampForColor(color, DEFAULT_QUANTILE_BANDS);
          // Etiqueta = INTERVALO DE VALOR por banda ("Desde a hasta b"), con unidad.
          // Backend: cortes/min/max reales; template: 0–1 con cortes uniformes.
          const unit = v?.unidad ? ` ${v.unidad}` : "";
          const fmt = (n: number) =>
            `${Number.isInteger(n) ? n : n.toFixed(1)}${unit}`;
          const m = meta[id] ?? { cuts: [0.2, 0.4, 0.6, 0.8], min: 0, max: 1 };
          const labels = quantileRangeLabels(m.cuts, m.min, m.max, fmt);
          return (
            <div key={id}>
              <p className="mb-1 text-[11px] font-medium text-gray-800">
                {v?.label ?? id}
              </p>
              <ul className="flex flex-col gap-0.5">
                {ramp.map((c, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-sm border border-black/5"
                      style={{ backgroundColor: `rgb(${c[0]},${c[1]},${c[2]})` }}
                    />
                    <span className="truncate text-[10px] text-gray-600">
                      {labels[i]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
