"use client";

/**
 * Leyenda del heatmap — barra de gradiente Viridis vertical (delgada) con los
 * VALORES (%) a la derecha. Top = 100 (amarillo), bottom = 0 (púrpura).
 *
 * #19: se quitaron las etiquetas cualitativas ("Muy alta/Media/…") → solo los
 * valores. `notch` (opcional) dibuja la MUESCA del área (hex menos y más apto),
 * igual que en el informe.
 */

// Ticks numéricos alineados a la barra (de arriba=100 a abajo=0).
const TICKS = [100, 75, 50, 25, 0];

// 11 stops Viridis → degradado CSS de arriba (1.0, amarillo) a abajo (0.0, púrpura).
const VIRIDIS_GRADIENT =
  "linear-gradient(to bottom, " +
  "rgb(253,231,36), " +
  "rgb(189,222,38), " +
  "rgb(121,209,81), " +
  "rgb(68,190,112), " +
  "rgb(34,167,132), " +
  "rgb(32,144,140), " +
  "rgb(41,120,142), " +
  "rgb(52,94,141), " +
  "rgb(64,67,135), " +
  "rgb(72,35,116), " +
  "rgb(68,1,84))";

const clampPct = (v: number) => Math.max(0, Math.min(100, v));

export default function HeatmapLegend({
  notch,
  title = "Idoneidad (%)",
}: {
  /** Muesca del área: idoneidad (%) del hex MENOS y MÁS apto de la selección. */
  notch?: { min: number; max: number } | null;
  /** Título (en dimensiones el calor es de una variable, no "Idoneidad"). */
  title?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-2.5 shadow-sm">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h3>

      <div className="mt-2 flex items-stretch gap-2">
        {/* Barra + muescas superpuestas */}
        <div className="relative h-32 w-2 shrink-0">
          <span
            aria-hidden="true"
            className="block h-full w-full rounded-full"
            style={{ backgroundImage: VIRIDIS_GRADIENT }}
          />
          {notch &&
            [
              { v: notch.max, key: "max" },
              { v: notch.min, key: "min" },
            ].map(({ v, key }) => (
              <span
                key={key}
                aria-hidden="true"
                className="absolute -left-1 -right-1 h-0.5 bg-gray-900 shadow-sm"
                style={{ top: `calc(${100 - clampPct(v)}% - 1px)` }}
              />
            ))}
        </div>
        <ul className="flex h-32 flex-col justify-between">
          {TICKS.map((t) => (
            <li
              key={t}
              className="font-mono text-[10px] font-semibold leading-none text-[#165170ff]"
            >
              {t}
            </li>
          ))}
        </ul>
      </div>

      {notch && (
        <p className="mt-1.5 text-[9px] leading-tight text-gray-600">
          Área: <b>{notch.min.toFixed(0)}</b>–<b>{notch.max.toFixed(0)}</b>%
        </p>
      )}

      <div className="mt-2 flex items-center gap-1.5 border-t border-gray-200 pt-1.5">
        <span
          aria-hidden="true"
          className="h-3 w-4 shrink-0 rounded border border-dashed border-gray-400"
        />
        <span className="text-[9px] text-gray-600">Corregimientos</span>
      </div>
    </div>
  );
}
