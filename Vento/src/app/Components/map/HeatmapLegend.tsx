"use client";

/**
 * Leyenda del heatmap — barra de gradiente Viridis vertical (delgada)
 * con 5 etiquetas alineadas a los rangos de idoneidad.
 *
 * Top = 100 (amarillo Viridis), bottom = 0 (púrpura). Las etiquetas viven
 * a la derecha del gradiente, distribuidas con `justify-between` para
 * coincidir con las 5 zonas de la barra.
 */

const BUCKETS: { range: string; label: string }[] = [
  { range: "90 – 100", label: "Muy alta" },
  { range: "75 – 90", label: "Alta" },
  { range: "50 – 75", label: "Media" },
  { range: "25 – 50", label: "Baja" },
  { range: "0 – 25", label: "Muy baja" },
];

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

export default function HeatmapLegend() {
  return (
    <div className="rounded-2xl bg-white p-2.5 shadow-sm">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        Idoneidad (%)
      </h3>

      <div className="mt-2 flex items-stretch gap-2">
        <span
          aria-hidden="true"
          className="block h-32 w-2 shrink-0 rounded-full"
          style={{ backgroundImage: VIRIDIS_GRADIENT }}
        />
        <ul className="flex h-32 flex-col justify-between">
          {BUCKETS.map((b) => (
            <li
              key={b.range}
              className="flex items-baseline gap-1.5 whitespace-nowrap leading-none"
            >
              <span className="font-mono text-[10px] font-semibold text-[#165170ff]">
                {b.range}
              </span>
              <span className="text-[9px] text-gray-500">{b.label}</span>
            </li>
          ))}
        </ul>
      </div>

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
